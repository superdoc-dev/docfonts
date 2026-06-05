/**
 * Measurement runner: compare proprietary ORACLE fonts (the operator's own licensed files, at a
 * private/local path) against the open CANDIDATE faces in the corpus, and emit analytic advance
 * MeasurementResults keyed by candidateFaceId + fileSha256. This is the SuperDoc-internal analysis
 * step; it is tooling, run with private oracles - it is never run in CI and commits no proprietary
 * binaries or raw oracle tables, only deltas + method + date + an oracle-env label + the candidate hash.
 *
 * Run:  bun scripts/measure-advances.ts <oracle-dir> <corpus-source-dir> --oracle-env "<label>" [out-dir] [date]
 *   <oracle-dir>        directory of YOUR licensed proprietary fonts (e.g. Calibri.ttf). Never committed.
 *   <corpus-source-dir> directory holding the open candidate TTFs named in the corpus manifest.
 *   --oracle-env        REQUIRED to emit: the exact oracle environment, recorded verbatim into every
 *                       measurement (e.g. "Windows 11 26H1, M365 Word 16.0.x, 2026-06"). No default -
 *                       real measurements must carry the real environment from the first run.
 *   [out-dir]           defaults to packages/registry/data/measurements
 *
 * Scope (first slice): measures the CURATED known pairs (loadRecords originalFont -> candidate family)
 * only - not a full bakeoff. Every measured candidate must resolve to a corpus face, or it throws.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  countFaces,
  type ParsedFace,
  parseFontFace,
  sha256Hex,
} from "@docfonts/font-metadata";
import {
  type AnalyticAdvanceMeasurement,
  corpusFaces,
  loadCorpus,
  loadRecords,
} from "@docfonts/registry";
import { advanceDelta, LATIN_PROSE_V1 } from "./measure/advance-delta";
import { toAnalyticMeasurement } from "./measure/measurement";
import { isOracleFontFile } from "./measure/oracle-files";
import {
  formatSkipReport,
  planMeasurements,
  type SkippedItem,
} from "./measure/plan";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function parse(bytes: Uint8Array, label: string): ParsedFace {
  const r = parseFontFace(bytes);
  if (!r.ok) throw new Error(`parse failed (${label}): ${r.error}`);
  return r.face;
}

async function main() {
  // Pull the --oracle-env flag (value may appear anywhere); the rest are positional.
  let oracleEnv: string | undefined;
  const positional: string[] = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--oracle-env") oracleEnv = args[++i];
    else positional.push(args[i]);
  }
  const [oracleDir, corpusDir, outDir, dateArg] = positional;
  if (!oracleDir || !corpusDir) {
    throw new Error(
      'usage: bun scripts/measure-advances.ts <oracle-dir> <corpus-source-dir> --oracle-env "<label>" [out-dir] [date]',
    );
  }
  const date = dateArg ?? new Date().toISOString().slice(0, 10);
  const out =
    outDir ??
    join(import.meta.dir, "..", "packages", "registry", "data", "measurements");

  // corpus faces, indexed by family+styleKey, with their fileSha256 (the join key we must resolve to).
  const corpus = corpusFaces(loadCorpus());
  const records = loadRecords();

  // parse every oracle font in the private dir, keyed by (family, styleKey). .ttc collections are
  // enumerated face by face (Helvetica.ttc carries regular/bold/oblique/bold-oblique), so every
  // packaged face is a usable oracle - not just face 0.
  const oracles = new Map<string, ParsedFace>();
  for (const file of readdirSync(oracleDir).filter(isOracleFontFile)) {
    const bytes = new Uint8Array(readFileSync(join(oracleDir, file)));
    for (let i = 0; i < countFaces(bytes); i++) {
      const r = parseFontFace(bytes, { faceIndex: i });
      if (!r.ok)
        throw new Error(`parse failed (${file} face ${i}): ${r.error}`);
      oracles.set(
        `${r.face.metadata.names.family.toLowerCase()}|${r.face.metadata.face.styleKey}`,
        r.face,
      );
    }
  }

  // Decide what to measure and what to skip BEFORE reading candidate bytes, so the run self-audits.
  const hasOracle = (originalFont: string, styleKey: string) =>
    oracles.has(`${originalFont.toLowerCase()}|${styleKey}`);
  const { planned, skipped } = planMeasurements(
    records,
    corpus.map(({ face: c }) => ({
      family: c.family,
      candidateFaceId: c.candidateFaceId,
      fileName: c.fileName,
      fileSha256: c.fileSha256,
      styleKey: c.styleKey,
    })),
    hasOracle,
  );

  const measurements: AnalyticAdvanceMeasurement[] = [];
  const byFile = new Map<string, AnalyticAdvanceMeasurement[]>();
  const runtimeSkips: SkippedItem[] = [];

  for (const p of planned) {
    const oracle = oracles.get(`${p.originalFont.toLowerCase()}|${p.styleKey}`);
    if (!oracle) continue; // unreachable (planner already required it), guards the type.

    // resolve + verify the candidate bytes against the corpus hash (the join key must hold).
    const candBytes = new Uint8Array(readFileSync(join(corpusDir, p.fileName)));
    const candSha = await sha256Hex(candBytes);
    if (candSha !== p.fileSha256) {
      throw new Error(
        `candidate ${p.fileName} sha ${candSha} != corpus ${p.fileSha256}`,
      );
    }
    const delta = advanceDelta(
      oracle,
      parse(candBytes, p.fileName),
      LATIN_PROSE_V1.strings,
    );
    if (!delta) {
      // an advance could not be computed (e.g. no hmtx) - a real skip, reported not swallowed.
      runtimeSkips.push({
        originalFont: p.originalFont,
        candidateFamily: p.candidateFamily,
        styleKey: p.styleKey,
        reason: "unmeasurable",
      });
      continue;
    }

    // A real measurement must carry the real environment label, so require it the moment we emit one.
    if (!oracleEnv) {
      throw new Error(
        'refusing to emit a measurement without --oracle-env "<label>" (the oracle environment)',
      );
    }

    const m = toAnalyticMeasurement({
      originalFont: p.originalFont,
      oracleEnv,
      styleKey: p.styleKey,
      candidate: {
        candidateFamily: p.candidateFamily,
        candidateFaceId: p.candidateFaceId,
        fileSha256: p.fileSha256,
      },
      advance: delta,
      date,
      testStringsRef: LATIN_PROSE_V1.id,
    });
    // validation (the integrity point of this layer): the measured candidate must resolve to ONE
    // corpus face by BOTH keys together - candidateFaceId AND fileSha256 must name the same face.
    if (
      !corpus.some(
        (c) =>
          c.face.candidateFaceId === m.candidate.candidateFaceId &&
          c.face.fileSha256 === m.candidate.fileSha256,
      )
    ) {
      throw new Error(
        `measured candidate ${m.candidate.candidateFaceId} / ${m.candidate.fileSha256} does not resolve to a single corpus face`,
      );
    }
    measurements.push(m);
    const key = slug(p.originalFont);
    (byFile.get(key) ?? byFile.set(key, []).get(key))?.push(m);
  }

  for (const [key, ms] of byFile) {
    writeFileSync(
      join(out, `${key}.measured.json`),
      `${JSON.stringify(ms, null, 2)}\n`,
    );
  }
  console.log(
    `measured ${measurements.length} candidate face(s) across ${byFile.size} proprietary target(s)`,
  );
  // Self-audit: always report what was skipped and why, so an evidence run is never silently partial.
  console.log(formatSkipReport([...skipped, ...runtimeSkips]));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

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

  // parse every oracle font in the private dir, keyed by (family, styleKey).
  const oracles = new Map<string, ParsedFace>();
  for (const file of readdirSync(oracleDir).filter((f) =>
    /\.(ttf|otf)$/i.test(f),
  )) {
    const f = parse(new Uint8Array(readFileSync(join(oracleDir, file))), file);
    oracles.set(
      `${f.metadata.names.family.toLowerCase()}|${f.metadata.face.styleKey}`,
      f,
    );
  }

  const measurements: AnalyticAdvanceMeasurement[] = [];
  const byFile = new Map<string, AnalyticAdvanceMeasurement[]>();

  for (const rec of records) {
    const candFamily = rec.candidate?.candidateFamily;
    if (!candFamily) continue; // no_substitute / preserve / customer-supplied: nothing to measure
    for (const { face: cf } of corpus.filter(
      (c) => c.face.family === candFamily,
    )) {
      const oracle = oracles.get(
        `${rec.originalFont.toLowerCase()}|${cf.styleKey}`,
      );
      if (!oracle) continue; // operator has no oracle face for this style; skip (reported below)

      // resolve + verify the candidate bytes against the corpus hash (the join key must hold).
      const candBytes = new Uint8Array(
        readFileSync(join(corpusDir, cf.fileName)),
      );
      const candSha = await sha256Hex(candBytes);
      if (candSha !== cf.fileSha256) {
        throw new Error(
          `candidate ${cf.fileName} sha ${candSha} != corpus ${cf.fileSha256}`,
        );
      }
      const delta = advanceDelta(
        oracle,
        parse(candBytes, cf.fileName),
        LATIN_PROSE_V1.strings,
      );
      if (!delta) continue;

      // A real measurement must carry the real environment label, so require it the moment we would
      // emit one (a 0-match dry run does not need it).
      if (!oracleEnv) {
        throw new Error(
          'refusing to emit a measurement without --oracle-env "<label>" (the oracle environment)',
        );
      }

      const m = toAnalyticMeasurement({
        originalFont: rec.originalFont,
        oracleEnv,
        styleKey: cf.styleKey,
        candidate: {
          candidateFamily: candFamily,
          candidateFaceId: cf.candidateFaceId,
          fileSha256: cf.fileSha256,
        },
        advance: delta,
        date,
        testStringsRef: LATIN_PROSE_V1.id,
      });
      // validation (the integrity point of this layer): the measured candidate must resolve to ONE
      // corpus face by BOTH keys together - candidateFaceId AND fileSha256 must name the same face,
      // so the two keys can never drift apart in an emitted measurement.
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
      const key = slug(rec.originalFont);
      (byFile.get(key) ?? byFile.set(key, []).get(key))?.push(m);
    }
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
  if (!measurements.length) {
    console.log(
      "no measurements: check that the oracle dir holds licensed fonts whose family names",
    );
    console.log(
      "match the registry originalFont values (e.g. Calibri, Cambria, Georgia).",
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

#!/usr/bin/env bun
/**
 * bakeoff.ts - compare ONE proprietary oracle against the open discovery snapshot and emit a ranked,
 * public-safe BakeoffResult. This is the DISCOVERY/comparison job layer: it answers "given the open
 * fonts we know about, which are the closest by advance metrics, and what are the honest negatives?"
 *
 * It NEVER touches records.json. A bakeoff is a lead, not a verdict; promoting a candidate into the
 * reviewed corpus and then to a published verdict is a separate, reviewed step.
 *
 * Local tool: needs YOUR licensed oracle font + the local Google Fonts cache (the discovery snapshot
 * stores only pointers - sha + URL). Nothing private is committed: the result records the oracle as a
 * LABEL (never a path or bytes), and candidates as sha + license + deltas.
 *
 * Run:
 *   bun run scripts/bakeoff.ts --target "Comic Sans MS" --category script \
 *     --oracle "/System/Library/Fonts/Supplemental/Comic Sans MS.ttf" \
 *     --oracle-env "Comic Sans MS (macOS Supplemental)" [--top 25]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFontFace, sha256Hex } from "@docfonts/font-metadata";
import type {
  BakeoffCandidate,
  BakeoffRejection,
  BakeoffResult,
  DiscoverySnapshot,
} from "@docfonts/registry";
import { advanceDelta, LATIN_PROSE_V1 } from "./measure/advance-delta";

const METHOD = "analytic-hmtx-v1";
const COVERAGE_MIN = 0.99;
const SNAPSHOT_FILE = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "discovery",
  "google-fonts-all-files-2026-06-04.json",
);
const CACHE = join(
  import.meta.dir,
  "..",
  "..",
  "font-fidelity-research",
  "harness",
  "corpus",
  "open-fonts",
  "google-fonts-latin-all-files",
  "files",
);
const OUT_DIR = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "bakeoffs",
);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const round = (x: number) => Math.round(x * 1e6) / 1e6;

function tierOf(mean: number, max: number): BakeoffCandidate["tier"] {
  if (mean <= 0.005 && max <= 0.01) return "direct";
  if (mean <= 0.01 && max <= 0.025) return "likely";
  return "visual";
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const target = arg("target");
  const targetCategory = arg("category") as BakeoffResult["targetCategory"];
  const oraclePath = arg("oracle");
  const oracleEnv = arg("oracle-env");
  const top = Number(arg("top") ?? "25");
  if (!target || !targetCategory || !oraclePath || !oracleEnv) {
    throw new Error(
      'usage: bun run scripts/bakeoff.ts --target "<font>" --category <cat> --oracle <path> --oracle-env "<label>" [--top N]',
    );
  }

  const oracleR = parseFontFace(new Uint8Array(readFileSync(oraclePath)));
  if (!oracleR.ok) throw new Error(`oracle parse failed: ${oracleR.error}`);
  const oracle = oracleR.face;

  const snapshot = JSON.parse(
    readFileSync(SNAPSHOT_FILE, "utf8"),
  ) as DiscoverySnapshot;

  const reject: Record<string, number> = {};
  const bump = (r: string) => {
    reject[r] = (reject[r] ?? 0) + 1;
  };
  const candidates: BakeoffCandidate[] = [];
  let considered = 0;

  // Regular-face bakeoff: compare the oracle's regular face against each open Regular candidate in the
  // target's category. Cross-category and low-coverage candidates are rejected and COUNTED, not hidden.
  for (const face of snapshot.faces) {
    if (face.styleKey !== "regular") continue;
    if (face.category !== targetCategory) {
      bump("category_mismatch");
      continue;
    }
    if (face.latinCoverage < COVERAGE_MIN) {
      bump("coverage_below_threshold");
      continue;
    }
    const bytes = new Uint8Array(
      readFileSync(join(CACHE, face.repoPath.replaceAll("/", "__"))),
    );
    if ((await sha256Hex(bytes)) !== face.fileSha256) {
      bump("cache_sha_mismatch");
      continue;
    }
    const candR = parseFontFace(bytes, { fileSha256: face.fileSha256 });
    if (!candR.ok) {
      bump("unmeasurable");
      continue;
    }
    const delta = advanceDelta(oracle, candR.face, LATIN_PROSE_V1.strings);
    if (!delta) {
      bump("unmeasurable");
      continue;
    }
    considered += 1;
    // tier from the SAME rounded values we store, so the committed tier always follows the committed
    // advance (no boundary disagreement between the raw delta and the persisted number).
    const advance = {
      meanDelta: round(delta.meanDelta),
      maxDelta: round(delta.maxDelta),
    };
    candidates.push({
      family: face.family,
      fileSha256: face.fileSha256,
      license: face.license,
      styleKey: face.styleKey,
      category: face.category,
      latinCoverage: face.latinCoverage,
      advance,
      tier: tierOf(advance.meanDelta, advance.maxDelta),
    });
  }

  candidates.sort((a, b) => a.advance.meanDelta - b.advance.meanDelta);
  const rejected: BakeoffRejection[] = Object.entries(reject)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const result: BakeoffResult = {
    target,
    targetCategory,
    oracleEnv,
    corpusSnapshotId: snapshot.snapshotId,
    methodVersion: METHOD,
    testStringsRef: LATIN_PROSE_V1.id,
    measuredDate: new Date().toISOString().slice(0, 10),
    consideredFaces: considered,
    candidates: candidates.slice(0, top),
    rejected,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${slug(target)}__${snapshot.snapshotId}.json`);
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  const best = candidates[0];
  console.log(
    `[bakeoff] ${target}: considered ${considered}, top ${result.candidates.length}; best = ${best ? `${best.family} (${(best.advance.meanDelta * 100).toFixed(2)}% mean, ${best.tier})` : "none"}; rejected ${rejected.reduce((n, r) => n + r.count, 0)}.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

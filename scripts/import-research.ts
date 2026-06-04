#!/usr/bin/env bun
/**
 * import-research.ts - GENERATE the canonical registry from font-fidelity-research artifacts.
 *
 * This is where data/registry/records.json stops being empty and the public registry becomes real.
 * A deterministic generator into the @docfonts/registry schema - NOT a CSV copier, NOT a hand seed.
 * Re-running reproduces byte-identical output from the same sources.
 *
 * SEPARATION OF CONCERNS (the architectural point):
 *   - MECHANICAL (this script): gates, candidate, license, advance deltas, measurement refs - all
 *     pulled from STRUCTURED columns, never inferred from note prose.
 *   - EDITORIAL (data/registry/verdicts.json): the public verdict for rows whose taxonomy is a human
 *     judgment (visual_only / cell_width_only / no_substitute). metric_safe is the ONLY verdict
 *     derived structurally (STATUS verified_shipped / layout_proven_all_faces).
 *   - A row is emitted only if (a) it is metric_safe, or (b) it has a curated verdict AND a structured
 *     advance measurement. Everything else is SKIPPED and LOGGED - never guessed, never unbacked.
 *
 * SOURCES (read-only sibling research repo):
 *   - STATUS.csv                     gate authority (static/metric/layout/ship) + status.
 *   - apryse ...summary-simple.csv   primary advance/license/candidate authority (curated 1-best).
 *   - curated-proprietary scorecard  advance/license fallback for fonts absent from the apryse summary.
 *
 * OUTPUT (committed):
 *   - data/registry/records.json     EvidenceRecord[]
 *   - data/measurements/<font>.json  MeasurementResult[] (analytic_advance / face_aggregate / top_candidates)
 *
 * Run:  bun run scripts/import-research.ts            write + validate (non-zero exit on any error)
 *       bun run scripts/import-research.ts --check    generate in memory, diff vs committed, no write
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
  GateStatus,
  PolicyAction,
  Verdict,
} from "../packages/core/src/index";
import verdictsDoc from "../packages/registry/data/registry/verdicts.json";
import {
  type AnalyticAdvanceMeasurement,
  type EvidenceRecord,
  type FaceAggregateMeasurement,
  type Gates,
  type MeasurementResult,
  type TopCandidatesMeasurement,
  validateRecords,
} from "../packages/registry/src/index";

const RESEARCH = join(import.meta.dir, "..", "..", "font-fidelity-research");
const STATUS_CSV = join(RESEARCH, "harness", "proofs", "STATUS.csv");
const APRYSE_CSV = join(
  RESEARCH,
  "harness",
  "results",
  "2026-06-04-apryse-font-fallback-summary-simple.csv",
);
const SCORECARD_CSV = join(
  RESEARCH,
  "harness",
  "results",
  "2026-06-03-similarity-curated-proprietary",
  "scorecard.csv",
);
const REGISTRY_DATA = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
);
const MEASURED_DATE = "2026-06-03";
const ORACLE_ENV = "Windows 11 M365 Word (font-fidelity-research, 2026-06)";
const METHOD = "analytic-hmtx-v1";

const CURATED: Record<string, { verdict: Verdict; rationale: string }> =
  verdictsDoc.verdicts as never;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
      }
      field = "";
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])),
  );
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const stripParens = (s: string) =>
  s
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const gate = (v: string): GateStatus =>
  v === "pass" ? "pass" : v === "fail" ? "fail" : "not_run";
const policyFor = (v: Verdict): PolicyAction =>
  v === "metric_safe"
    ? "substitute"
    : v === "no_substitute"
      ? "customer_supplied"
      : v === "preserve_only"
        ? "preserve_only"
        : "category_fallback";

interface AdvanceSrc {
  candidate: string;
  meanDelta: number;
  maxDelta: number;
  license: string | null;
  source: string;
}

/** Structured advance for a font: apryse summary if present, else best (lowest-mean) curated-scorecard row. */
function advanceFor(
  font: string,
  apryse: Map<string, Record<string, string>>,
  scoreByFont: Map<string, Record<string, string>[]>,
): AdvanceSrc | null {
  const a = apryse.get(font.toLowerCase());
  if (
    a &&
    a.mean_advance_delta_pct !== "n/a" &&
    a.fallback_class !== "not" &&
    a.fallback_class !== "manual"
  ) {
    return {
      candidate: stripParens(a.fallback_found_so_far),
      meanDelta: Number(a.mean_advance_delta_pct) / 100,
      maxDelta: Number(a.max_advance_delta_pct) / 100,
      license: a.fallback_license !== "n/a" ? a.fallback_license : null,
      source: "apryse fallback summary 2026-06-04",
    };
  }
  const rows = scoreByFont.get(font.toLowerCase());
  if (rows && rows.length) {
    const best = rows.reduce((m, r) =>
      Number(r.weighted_mean_adv_pct) < Number(m.weighted_mean_adv_pct) ? r : m,
    );
    return {
      candidate: best.candidate,
      meanDelta: Number(best.weighted_mean_adv_pct) / 100,
      maxDelta: Number(best.max_adv_pct) / 100,
      license: best.license || null,
      source: "curated-proprietary scorecard 2026-06-03",
    };
  }
  return null;
}

function main() {
  const check = process.argv.includes("--check");
  for (const p of [STATUS_CSV, APRYSE_CSV, SCORECARD_CSV]) {
    if (!existsSync(p)) {
      console.error(
        `[import] source not found: ${p}\n  This generator needs the sibling font-fidelity-research repo.`,
      );
      process.exit(1);
    }
  }
  const status = parseCsv(readFileSync(STATUS_CSV, "utf8"));
  const apryse = new Map(
    parseCsv(readFileSync(APRYSE_CSV, "utf8")).map((r) => [
      r.apryse_font_name.toLowerCase(),
      r,
    ]),
  );
  const scoreByFont = new Map<string, Record<string, string>[]>();
  for (const r of parseCsv(readFileSync(SCORECARD_CSV, "utf8"))) {
    const k = r.logical_font.toLowerCase();
    scoreByFont.set(k, [...(scoreByFont.get(k) ?? []), r]);
  }

  const records: EvidenceRecord[] = [];
  const measurements: MeasurementResult[] = [];
  const skipped: string[] = [];

  for (const s of status) {
    const original = s.logical_font;
    const id = slug(original);
    const structural =
      s.status === "verified_shipped" || s.status === "layout_proven_all_faces";
    const curated = CURATED[id];
    const verdict: Verdict | null = structural
      ? "metric_safe"
      : (curated?.verdict ?? null);
    if (!verdict) {
      skipped.push(
        `${original}: ${s.status} (no curated verdict + not structurally metric_safe)`,
      );
      continue;
    }

    const gates: Gates = {
      static: gate(s.static_gate),
      metric: gate(s.metric_gate),
      layout: gate(s.layout_gate),
      ship: gate(s.ship_gate),
    };
    const adv = advanceFor(original, apryse, scoreByFont);
    if (!adv) {
      skipped.push(
        `${original}: verdict ${verdict} but NO structured advance measurement found (not published)`,
      );
      continue;
    }

    const isNoSub = verdict === "no_substitute";
    const candidateFamily = isNoSub
      ? null
      : structural
        ? stripParens(s.substitute_or_policy)
        : adv.candidate;
    const candidateSlug = candidateFamily ? slug(candidateFamily) : null;
    const refs: string[] = [];

    if (isNoSub) {
      const mid = `${id}#top_candidates#${MEASURED_DATE}`;
      refs.push(mid);
      measurements.push({
        kind: "top_candidates",
        measurementId: mid,
        originalFont: original,
        originalOracleEnv: "hmtx analytic (no oracle render)",
        methodVersion: METHOD,
        measuredDate: MEASURED_DATE,
        candidates: [
          {
            candidate: { candidateFamily: adv.candidate },
            advance: { meanDelta: adv.meanDelta, maxDelta: adv.maxDelta },
          },
        ],
        notes: curated.rationale,
      } satisfies TopCandidatesMeasurement);
    } else if (candidateFamily && candidateSlug) {
      const mid = `${id}__${candidateSlug}#analytic_advance#${MEASURED_DATE}`;
      refs.push(mid);
      measurements.push({
        kind: "analytic_advance",
        measurementId: mid,
        originalFont: original,
        originalOracleEnv: "hmtx analytic (no oracle render)",
        candidate: { candidateFamily },
        methodVersion: METHOD,
        measuredDate: MEASURED_DATE,
        advance: { meanDelta: adv.meanDelta, maxDelta: adv.maxDelta },
      } satisfies AnalyticAdvanceMeasurement);
    }
    if (gates.layout === "pass" && candidateFamily && candidateSlug) {
      const mid = `${id}__${candidateSlug}#face_aggregate#${MEASURED_DATE}`;
      refs.push(mid);
      measurements.push({
        kind: "face_aggregate",
        measurementId: mid,
        originalFont: original,
        originalOracleEnv: ORACLE_ENV,
        candidate: { candidateFamily },
        methodVersion: METHOD,
        measuredDate: MEASURED_DATE,
        faces: { regular: true, bold: true, italic: true, boldItalic: true },
        notes: "All four faces layout-proven vs Word (family-status.json).",
      } satisfies FaceAggregateMeasurement);
    }
    if (refs.length === 0) {
      skipped.push(
        `${original}: verdict ${verdict} produced no measurement (not published)`,
      );
      continue;
    }

    const fourFace = verdict === "metric_safe";
    records.push({
      evidenceId: id,
      originalFont: original,
      candidate: candidateFamily ? { candidateFamily } : null,
      verdict,
      faces: {
        regular: fourFace,
        bold: fourFace,
        italic: fourFace,
        boldItalic: fourFace,
      },
      // no_substitute has no chosen candidate, so no record-level advance/license: the closest-candidate
      // numbers live only in the top_candidates measurement (and must not read as "this substitute = X%").
      advance: isNoSub
        ? undefined
        : { meanDelta: adv.meanDelta, maxDelta: adv.maxDelta },
      candidateLicense: isNoSub ? null : adv.license,
      candidateLicenseSource: isNoSub ? undefined : adv.source,
      gates,
      measurementRefs: refs,
      policyAction: policyFor(verdict),
      confidence: "R",
      exportRule: "preserve_original_name",
      measuredDate: MEASURED_DATE,
      notes: curated?.rationale ?? s.note ?? undefined,
    });
  }

  const measIndex = measurements.map((m) => ({
    measurementId: m.measurementId,
    kind: m.kind,
  }));
  const res = validateRecords(records, { measurements: measIndex });
  if (!res.ok) {
    console.error(
      "[import] generated records FAILED validation:\n  " +
        res.errors.join("\n  "),
    );
    process.exit(1);
  }
  for (const r of records)
    if (r.measurementRefs.length === 0) {
      console.error(
        `[import] record ${r.evidenceId} has no measurement backing`,
      );
      process.exit(1);
    }

  const recordsJson = `${JSON.stringify(records, null, 2)}\n`;
  const recordsPath = join(REGISTRY_DATA, "registry", "records.json");
  const byFont = new Map<string, MeasurementResult[]>();
  for (const m of measurements) {
    const k = slug(m.originalFont);
    byFont.set(k, [...(byFont.get(k) ?? []), m]);
  }

  if (check) {
    const current = existsSync(recordsPath)
      ? readFileSync(recordsPath, "utf8")
      : "";
    if (current !== recordsJson) {
      console.error(
        "[import] --check: records.json is stale; run the importer.",
      );
      process.exit(1);
    }
    console.log("[import] --check: records.json is up to date.");
    return;
  }

  writeFileSync(recordsPath, recordsJson);
  const measDir = join(REGISTRY_DATA, "measurements");
  for (const f of readdirSync(measDir))
    if (f.endsWith(".json")) rmSync(join(measDir, f)); // delete stale, don't truncate
  for (const [k, ms] of byFont)
    writeFileSync(
      join(measDir, `${k}.json`),
      `${JSON.stringify(ms, null, 2)}\n`,
    );

  console.log(
    `[import] wrote ${records.length} records + ${measurements.length} measurements (${byFont.size} files).`,
  );
  console.log(
    `[import] verdicts: ${records.filter((r) => r.verdict === "metric_safe").length} metric_safe (structural), ${records.filter((r) => r.verdict !== "metric_safe").length} curated.`,
  );
  if (skipped.length)
    console.log(
      `[import] skipped ${skipped.length} (logged, never guessed):\n  - ${skipped.join("\n  - ")}`,
    );
}

main();

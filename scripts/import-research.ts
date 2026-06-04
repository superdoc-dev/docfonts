#!/usr/bin/env bun
/**
 * import-research.ts - GENERATE the canonical registry from font-fidelity-research artifacts.
 *
 * This is where data/registry/records.json stops being empty and the public registry becomes real.
 * A deterministic generator into the @docfonts/registry schema - NOT a CSV copier, NOT a hand seed.
 * Re-running reproduces byte-identical output from the same sources.
 *
 * SEPARATION OF CONCERNS (the architectural point):
 *   - MECHANICAL (this script): gates, advance deltas, license, measurement refs - all pulled from
 *     STRUCTURED columns, never inferred from note prose.
 *   - EDITORIAL (data/registry/verdicts.json): the public verdict AND the public candidate for rows
 *     whose taxonomy/choice is a human judgment. The importer attaches numbers ONLY to the curated
 *     candidate - it never anoints a substitute by "closest advance". metric_safe is the only verdict
 *     derived structurally (STATUS verified_shipped / layout_proven_all_faces), and its candidate
 *     comes from the STATUS substitute column.
 *   - A non-metric row publishes a CANDIDATE only if verdicts.json names one AND a structured advance
 *     exists for that exact candidate. Otherwise candidate is null and the closest measured fonts live
 *     only in a top_candidates measurement (shown, never claimed as "the" substitute). Rows with no
 *     curated verdict, or a curated candidate lacking a structured measurement, are SKIPPED + LOGGED.
 *
 * SOURCES (read-only sibling research repo):
 *   - STATUS.csv                     gate authority (static/metric/layout/ship) + status.
 *   - apryse ...summary-simple.csv   curated 1-best advance/license per font.
 *   - curated-proprietary scorecard  per-candidate advance/license (for a specific curated candidate,
 *                                    and for fonts absent from the apryse summary).
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
  type CandidateScore,
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

interface CuratedEntry {
  verdict: Verdict;
  candidate?: string;
  rationale: string;
}
const CURATED: Record<string, CuratedEntry> = verdictsDoc.verdicts as never;

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
const norm = (s: string) => stripParens(s).toLowerCase();
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

interface Measured {
  candidate: string;
  meanDelta: number;
  maxDelta: number;
  license: string | null;
  source: string;
}

const apryseMeasured = (a?: Record<string, string>): Measured | null =>
  a &&
  a.mean_advance_delta_pct !== "n/a" &&
  a.fallback_class !== "not" &&
  a.fallback_class !== "manual"
    ? {
        candidate: stripParens(a.fallback_found_so_far),
        meanDelta: Number(a.mean_advance_delta_pct) / 100,
        maxDelta: Number(a.max_advance_delta_pct) / 100,
        license: a.fallback_license !== "n/a" ? a.fallback_license : null,
        source: "apryse fallback summary 2026-06-04",
      }
    : null;

const scoreMeasured = (r: Record<string, string>): Measured => ({
  candidate: r.candidate,
  meanDelta: Number(r.weighted_mean_adv_pct) / 100,
  maxDelta: Number(r.max_adv_pct) / 100,
  license: r.license || null,
  source: "curated-proprietary scorecard 2026-06-03",
});

/** The closest measured fallback for a font (apryse 1-best, else lowest-mean scorecard row). For top_candidates / metric_safe. */
function closestMeasured(
  font: string,
  apryse: Map<string, Record<string, string>>,
  score: Map<string, Record<string, string>[]>,
): Measured | null {
  const a = apryseMeasured(apryse.get(font.toLowerCase()));
  if (a) return a;
  const rows = score.get(font.toLowerCase());
  if (rows?.length)
    return scoreMeasured(
      rows.reduce((m, r) =>
        Number(r.weighted_mean_adv_pct) < Number(m.weighted_mean_adv_pct)
          ? r
          : m,
      ),
    );
  return null;
}

/** Structured advance for a SPECIFIC curated candidate (never "closest"). null if no measurement names it. */
function measuredForCandidate(
  font: string,
  candidate: string,
  apryse: Map<string, Record<string, string>>,
  score: Map<string, Record<string, string>[]>,
): Measured | null {
  const a = apryseMeasured(apryse.get(font.toLowerCase()));
  if (a && norm(a.candidate) === norm(candidate)) return a;
  const row = score
    .get(font.toLowerCase())
    ?.find((r) => norm(r.candidate) === norm(candidate));
  return row ? scoreMeasured(row) : null;
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
  const score = new Map<string, Record<string, string>[]>();
  for (const r of parseCsv(readFileSync(SCORECARD_CSV, "utf8"))) {
    const k = r.logical_font.toLowerCase();
    score.set(k, [...(score.get(k) ?? []), r]);
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
    const refs: string[] = [];
    let candidateFamily: string | null = null;
    let recordAdvance: { meanDelta: number; maxDelta: number } | undefined;
    let recordLicense: string | null = null;
    let recordLicenseSource: string | undefined;

    if (verdict === "no_substitute") {
      // candidate stays null; closest measured fonts live only in top_candidates.
      const m = closestMeasured(original, apryse, score);
      const cands: CandidateScore[] = m
        ? [
            {
              candidate: { candidateFamily: m.candidate },
              advance: { meanDelta: m.meanDelta, maxDelta: m.maxDelta },
            },
          ]
        : [];
      const mid = `${id}#top_candidates#${MEASURED_DATE}`;
      refs.push(mid);
      measurements.push({
        kind: "top_candidates",
        measurementId: mid,
        originalFont: original,
        originalOracleEnv: "hmtx analytic (no oracle render)",
        methodVersion: METHOD,
        measuredDate: MEASURED_DATE,
        candidates: cands,
        notes: curated?.rationale,
      } satisfies TopCandidatesMeasurement);
    } else {
      // metric_safe candidate = STATUS substitute; non-metric candidate = curated (verdicts.json) only.
      const wantCandidate = structural
        ? stripParens(s.substitute_or_policy)
        : curated?.candidate;
      const m = wantCandidate
        ? structural
          ? closestMeasured(original, apryse, score)
          : measuredForCandidate(original, wantCandidate, apryse, score)
        : null;

      if (wantCandidate && m) {
        candidateFamily = wantCandidate;
        recordAdvance = { meanDelta: m.meanDelta, maxDelta: m.maxDelta };
        recordLicense = m.license;
        recordLicenseSource = m.source;
        const cslug = slug(candidateFamily);
        const aid = `${id}__${cslug}#analytic_advance#${MEASURED_DATE}`;
        refs.push(aid);
        measurements.push({
          kind: "analytic_advance",
          measurementId: aid,
          originalFont: original,
          originalOracleEnv: "hmtx analytic (no oracle render)",
          candidate: { candidateFamily },
          methodVersion: METHOD,
          measuredDate: MEASURED_DATE,
          advance: recordAdvance,
        } satisfies AnalyticAdvanceMeasurement);
        if (gates.layout === "pass") {
          const fid = `${id}__${cslug}#face_aggregate#${MEASURED_DATE}`;
          refs.push(fid);
          measurements.push({
            kind: "face_aggregate",
            measurementId: fid,
            originalFont: original,
            originalOracleEnv: ORACLE_ENV,
            candidate: { candidateFamily },
            methodVersion: METHOD,
            measuredDate: MEASURED_DATE,
            faces: {
              regular: true,
              bold: true,
              italic: true,
              boldItalic: true,
            },
            notes: "All four faces layout-proven vs Word (family-status.json).",
          } satisfies FaceAggregateMeasurement);
        }
      } else if (structural) {
        skipped.push(
          `${original}: metric_safe but no structured advance for STATUS candidate "${wantCandidate}" (not published)`,
        );
        continue;
      } else {
        // visual_only with no curated candidate: candidate null, closest shown in top_candidates only.
        const m2 = closestMeasured(original, apryse, score);
        const cands: CandidateScore[] = m2
          ? [
              {
                candidate: { candidateFamily: m2.candidate },
                advance: { meanDelta: m2.meanDelta, maxDelta: m2.maxDelta },
              },
            ]
          : [];
        if (cands.length === 0) {
          skipped.push(
            `${original}: ${verdict} with no curated candidate and no structured measurement (not published)`,
          );
          continue;
        }
        const mid = `${id}#top_candidates#${MEASURED_DATE}`;
        refs.push(mid);
        measurements.push({
          kind: "top_candidates",
          measurementId: mid,
          originalFont: original,
          originalOracleEnv: "hmtx analytic (no oracle render)",
          methodVersion: METHOD,
          measuredDate: MEASURED_DATE,
          candidates: cands,
          notes: curated?.rationale,
        } satisfies TopCandidatesMeasurement);
      }
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
      advance: recordAdvance,
      candidateLicense: recordLicense,
      candidateLicenseSource: recordLicenseSource,
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

  const withCand = records.filter((r) => r.candidate).length;
  console.log(
    `[import] wrote ${records.length} records (${withCand} with a published candidate) + ${measurements.length} measurements (${byFont.size} files).`,
  );
  if (skipped.length)
    console.log(
      `[import] skipped ${skipped.length} (logged, never guessed):\n  - ${skipped.join("\n  - ")}`,
    );
}

main();

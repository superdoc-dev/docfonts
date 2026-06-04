/**
 * Pure measurement PLAN: decide, before any font bytes are read, which (proprietary -> candidate
 * face) pairs a run will measure and which it will SKIP and WHY. Keeping this pure makes a run
 * self-auditing - the runner reports skips instead of silently dropping pairs - and lets the skip
 * logic be unit-tested without font files.
 *
 * Structural skip reasons only (knowable from records + corpus + which oracle keys exist). A run can
 * still add a runtime "unmeasurable" skip when an advance can't be computed; that is reported too.
 */
import type { EvidenceRecord } from "@docfonts/registry";

export type SkipReason =
  | "no_candidate" // record names no open substitute (no_substitute / preserve / customer_supplied)
  | "candidate_not_in_corpus" // the candidate family has no face in the loaded corpus yet
  | "oracle_missing" // operator has no oracle face for this (originalFont, styleKey)
  | "unmeasurable"; // oracle + candidate present, but an advance could not be computed (no hmtx)

export interface PlannedMeasurement {
  originalFont: string;
  candidateFamily: string;
  candidateFaceId: string;
  fileName: string;
  fileSha256: string;
  styleKey: string;
}

export interface SkippedItem {
  originalFont: string;
  candidateFamily?: string;
  styleKey?: string;
  reason: SkipReason;
}

/** A corpus face as the planner needs it (family + the join keys). */
export interface PlanCorpusFace {
  family: string;
  candidateFaceId: string;
  fileName: string;
  fileSha256: string;
  styleKey: string;
}

export interface MeasurePlan {
  planned: PlannedMeasurement[];
  skipped: SkippedItem[];
}

/**
 * Build the plan. `hasOracle(originalFont, styleKey)` reports whether the operator supplied an oracle
 * face for that target style (case-insensitive family match is the caller's concern).
 */
export function planMeasurements(
  records: readonly EvidenceRecord[],
  corpus: readonly PlanCorpusFace[],
  hasOracle: (originalFont: string, styleKey: string) => boolean,
): MeasurePlan {
  const planned: PlannedMeasurement[] = [];
  const skipped: SkippedItem[] = [];

  for (const rec of records) {
    const candidateFamily = rec.candidate?.candidateFamily;
    if (!candidateFamily) {
      skipped.push({ originalFont: rec.originalFont, reason: "no_candidate" });
      continue;
    }
    const faces = corpus.filter((c) => c.family === candidateFamily);
    if (faces.length === 0) {
      skipped.push({
        originalFont: rec.originalFont,
        candidateFamily,
        reason: "candidate_not_in_corpus",
      });
      continue;
    }
    for (const cf of faces) {
      if (!hasOracle(rec.originalFont, cf.styleKey)) {
        skipped.push({
          originalFont: rec.originalFont,
          candidateFamily,
          styleKey: cf.styleKey,
          reason: "oracle_missing",
        });
        continue;
      }
      planned.push({
        originalFont: rec.originalFont,
        candidateFamily,
        candidateFaceId: cf.candidateFaceId,
        fileName: cf.fileName,
        fileSha256: cf.fileSha256,
        styleKey: cf.styleKey,
      });
    }
  }
  return { planned, skipped };
}

/** Human-readable skip summary, grouped by reason. Printed by the runner after a measure pass. */
export function formatSkipReport(skipped: readonly SkippedItem[]): string {
  if (skipped.length === 0) return "skipped: none";
  const byReason = new Map<SkipReason, SkippedItem[]>();
  for (const s of skipped)
    (byReason.get(s.reason) ?? byReason.set(s.reason, []).get(s.reason))?.push(
      s,
    );
  const lines = [`skipped: ${skipped.length}`];
  for (const [reason, items] of byReason) {
    lines.push(`  ${reason} (${items.length}):`);
    for (const i of items) {
      const tail = [i.candidateFamily, i.styleKey].filter(Boolean).join(" / ");
      lines.push(`    - ${i.originalFont}${tail ? ` -> ${tail}` : ""}`);
    }
  }
  return lines.join("\n");
}

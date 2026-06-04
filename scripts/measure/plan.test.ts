/**
 * Hermetic tests for the measurement planner. No font files: records, a fake corpus, and a fake
 * oracle predicate exercise every skip reason and the planned path, so a run's self-audit is proven.
 */
import { describe, expect, test } from "bun:test";
import type { EvidenceRecord } from "@docfonts/registry";
import {
  formatSkipReport,
  type PlanCorpusFace,
  planMeasurements,
} from "./plan";

const rec = (
  originalFont: string,
  candidateFamily: string | null,
): EvidenceRecord =>
  ({
    evidenceId: originalFont.toLowerCase(),
    originalFont,
    candidate: candidateFamily ? { candidateFamily } : null,
    verdict: candidateFamily ? "metric_safe" : "no_substitute",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: [],
    exportRule: "preserve_original_name",
  }) as EvidenceRecord;

const face = (family: string, styleKey: string): PlanCorpusFace => ({
  family,
  candidateFaceId: `${family.toLowerCase()}#${styleKey}#w400#deadbeef`,
  fileName: `${family}-${styleKey}.ttf`,
  fileSha256: "deadbeef",
  styleKey,
});

describe("planMeasurements", () => {
  const corpus = [face("Carlito", "regular"), face("Carlito", "bold")];

  test("plans a pair when corpus face + oracle both exist", () => {
    const { planned, skipped } = planMeasurements(
      [rec("Calibri", "Carlito")],
      corpus,
      () => true,
    );
    expect(planned.map((p) => p.styleKey).sort()).toEqual(["bold", "regular"]);
    expect(skipped).toEqual([]);
  });

  test("skips no_candidate records", () => {
    const { planned, skipped } = planMeasurements(
      [rec("Aptos", null)],
      corpus,
      () => true,
    );
    expect(planned).toEqual([]);
    expect(skipped).toEqual([
      { originalFont: "Aptos", reason: "no_candidate" },
    ]);
  });

  test("skips candidate_not_in_corpus", () => {
    const { skipped } = planMeasurements(
      [rec("Georgia", "Gelasio")],
      corpus,
      () => true,
    );
    expect(skipped).toEqual([
      {
        originalFont: "Georgia",
        candidateFamily: "Gelasio",
        reason: "candidate_not_in_corpus",
      },
    ]);
  });

  test("skips oracle_missing per face the operator lacks", () => {
    // oracle present only for regular.
    const has = (_f: string, s: string) => s === "regular";
    const { planned, skipped } = planMeasurements(
      [rec("Calibri", "Carlito")],
      corpus,
      has,
    );
    expect(planned.map((p) => p.styleKey)).toEqual(["regular"]);
    expect(skipped).toEqual([
      {
        originalFont: "Calibri",
        candidateFamily: "Carlito",
        styleKey: "bold",
        reason: "oracle_missing",
      },
    ]);
  });

  test("formatSkipReport groups by reason and says 'none' when empty", () => {
    expect(formatSkipReport([])).toBe("skipped: none");
    const report = formatSkipReport([
      { originalFont: "Aptos", reason: "no_candidate" },
      {
        originalFont: "Georgia",
        candidateFamily: "Gelasio",
        reason: "candidate_not_in_corpus",
      },
    ]);
    expect(report).toContain("no_candidate (1)");
    expect(report).toContain("candidate_not_in_corpus (1)");
    expect(report).toContain("Georgia -> Gelasio");
  });
});

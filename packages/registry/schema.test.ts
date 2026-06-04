import { describe, expect, it } from "bun:test";
import type {
  AnalyticAdvanceMeasurement,
  EvidenceRecord,
  LiveLayoutMeasurement,
  MeasurementResult,
} from "./src/index";
import { validateRecords } from "./src/index";

const valid: EvidenceRecord = {
  evidenceId: "calibri",
  originalFont: "Calibri",
  candidate: {
    candidateFamily: "Carlito",
    candidateFaceId: "carlito#regular",
    fileSha256: "abc123",
  },
  verdict: "metric_safe",
  faces: { regular: true, bold: true, italic: true, boldItalic: true },
  advance: { meanDelta: 0, maxDelta: 0 },
  candidateLicense: "OFL-1.1",
  gates: { static: "pass", metric: "pass", layout: "pass", ship: "pass" },
  measurementRefs: ["calibri__carlito#analytic#2026-06-03"],
  policyAction: "substitute",
  exportRule: "preserve_original_name",
};

describe("validateRecords (public records.json contract)", () => {
  it("accepts a well-formed metric-safe record", () => {
    expect(validateRecords([valid])).toEqual({ ok: true, errors: [] });
  });

  it("accepts a no_substitute record with a null candidate and empty refs", () => {
    const aptos: EvidenceRecord = {
      ...valid,
      evidenceId: "aptos",
      originalFont: "Aptos",
      candidate: null,
      verdict: "no_substitute",
      faces: { regular: false, bold: false, italic: false, boldItalic: false },
      advance: undefined,
      gates: {
        static: "not_run",
        metric: "fail",
        layout: "not_run",
        ship: "not_run",
      },
      measurementRefs: [],
    };
    expect(validateRecords([aptos]).ok).toBe(true);
  });

  it("rejects a bad verdict, a bad gate, and a missing exportRule", () => {
    const bad = {
      ...valid,
      verdict: "totally_safe",
      gates: { ...valid.gates, layout: "maybe" },
    } as Record<string, unknown>;
    delete bad.exportRule;
    const res = validateRecords([bad]);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects non-array input", () => {
    expect(validateRecords({}).ok).toBe(false);
  });
});

describe("MeasurementResult is one type discriminated by kind", () => {
  it("an analytic measurement and a live-layout proof are both MeasurementResult", () => {
    const analytic: AnalyticAdvanceMeasurement = {
      kind: "analytic_advance",
      measurementId: "calibri__carlito#analytic#2026-06-03",
      originalFont: "Calibri",
      originalOracleEnv: "hmtx analytic (no oracle render)",
      candidate: { candidateFamily: "Carlito", fileSha256: "abc123" },
      methodVersion: "1",
      measuredDate: "2026-06-03",
      advance: { meanDelta: 0, maxDelta: 0 },
    };
    const layout: LiveLayoutMeasurement = {
      kind: "live_layout",
      measurementId: "georgia__gelasio#layout#2026-06-03",
      originalFont: "Georgia",
      originalOracleEnv: "Windows 11 M365 Word 2026-06",
      candidate: { candidateFamily: "Gelasio", fileSha256: "def456" },
      methodVersion: "1",
      measuredDate: "2026-06-03",
      proof: { pages: 6, totalLines: 216, lineBreaksMatch: true },
    };
    const all: MeasurementResult[] = [analytic, layout];
    expect(all.map((m) => m.kind)).toEqual(["analytic_advance", "live_layout"]);
    // raw proof detail lives on the measurement, never on the public record
    expect((all[1] as LiveLayoutMeasurement).proof.totalLines).toBe(216);
  });
});

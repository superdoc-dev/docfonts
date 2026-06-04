/**
 * Proves the operator's oracle-environment label flows verbatim into the emitted measurement, plus
 * the rest of the analytic-advance shape. Hermetic - no font files.
 */
import { describe, expect, test } from "bun:test";
import { toAnalyticMeasurement } from "./measurement";

describe("toAnalyticMeasurement", () => {
  const m = toAnalyticMeasurement({
    originalFont: "Calibri",
    oracleEnv: "Windows 11 26H1, M365 Word 16.0.20xxx, 2026-06",
    styleKey: "regular",
    candidate: {
      candidateFamily: "Carlito",
      candidateFaceId: "carlito#regular#w400#b4ff23ba",
      fileSha256:
        "b4ff23ba370cc95a3c349336b73f9c28514a1371210f89832efc85c4b1ea7131",
    },
    advance: { meanDelta: 0, maxDelta: 0 },
    date: "2026-06-07",
    testStringsRef: "latin-prose-v1",
  });

  test("records the oracle-env label verbatim (the provenance point)", () => {
    expect(m.originalOracleEnv).toBe(
      "Windows 11 26H1, M365 Word 16.0.20xxx, 2026-06",
    );
  });

  test("carries the analytic-advance shape and a face-specific, dated measurementId", () => {
    expect(m.kind).toBe("analytic_advance");
    expect(m.methodVersion).toBe("analytic-hmtx-v1");
    expect(m.measurementId).toBe(
      "calibri_regular__carlito#regular#w400#b4ff23ba#analytic_advance#2026-06-07",
    );
    expect(m.candidate.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.advance).toEqual({ meanDelta: 0, maxDelta: 0 });
  });
});

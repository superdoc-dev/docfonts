/**
 * Pure assembly of an analytic-advance MeasurementResult from already-computed inputs. Kept separate
 * from the runner's I/O so the shape - especially that the operator's oracle-environment label flows
 * verbatim into originalOracleEnv - is unit-testable without any font files.
 */
import type { AdvanceDelta } from "@docfonts/core";
import type { AnalyticAdvanceMeasurement } from "@docfonts/registry";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export interface AnalyticMeasureInput {
  originalFont: string;
  /** the operator-supplied oracle-environment label; recorded verbatim, never invented. */
  oracleEnv: string;
  styleKey: string;
  candidate: {
    candidateFamily: string;
    candidateFaceId: string;
    fileSha256: string;
  };
  advance: AdvanceDelta;
  date: string;
  testStringsRef: string;
}

export function toAnalyticMeasurement(
  i: AnalyticMeasureInput,
): AnalyticAdvanceMeasurement {
  return {
    kind: "analytic_advance",
    measurementId: `${slug(i.originalFont)}_${i.styleKey}__${i.candidate.candidateFaceId}#analytic_advance#${i.date}`,
    originalFont: i.originalFont,
    originalOracleEnv: i.oracleEnv,
    candidate: i.candidate,
    methodVersion: "analytic-hmtx-v1",
    measuredDate: i.date,
    testStringsRef: i.testStringsRef,
    advance: i.advance,
  };
}

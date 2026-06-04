/**
 * @docfonts/registry - the source of truth for docfonts evidence, plus the corpus + measurement
 * provenance schemas. Three artifact layers live in ./types; ./schema validates the public records.
 *
 * Boundary: composes parsed facts (@docfonts/font-metadata, TYPE-only) and verdicts (@docfonts/core).
 * It does NOT parse fonts or DOCX, and does NOT score - it stores results and answers queries. The
 * corpus / measurements / records live as versioned JSON under ./data, produced by
 * scripts/import-research.ts. Query helpers here are pure and take the loaded records as input.
 */

export {
  EVIDENCE_RECORDS_SCHEMA,
  type ValidationResult,
  validateRecords,
} from "./schema";
export type {
  AnalyticAdvanceMeasurement,
  BrowserCanvasMeasurement,
  CandidateFaceId,
  CandidateRef,
  CorpusFace,
  CorpusFamily,
  CorpusId,
  CorpusManifest,
  EvidenceId,
  EvidenceRecord,
  FaceAggregateMeasurement,
  Gates,
  LayoutProof,
  LiveLayoutMeasurement,
  MeasurementId,
  MeasurementKind,
  MeasurementResult,
} from "./types";

import type { EvidenceRecord } from "./types";

/** Evidence records whose originalFont matches `name`, case-insensitive. Pure. */
export function findByOriginal(
  records: readonly EvidenceRecord[],
  name: string,
): EvidenceRecord[] {
  const key = name.toLowerCase();
  return records.filter((r) => r.originalFont.toLowerCase() === key);
}

/** Evidence records carrying a given verdict. Pure. */
export function withVerdict(
  records: readonly EvidenceRecord[],
  verdict: EvidenceRecord["verdict"],
): EvidenceRecord[] {
  return records.filter((r) => r.verdict === verdict);
}

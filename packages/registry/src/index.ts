/**
 * @docfonts/registry - canonical evidence records + query helpers. The SOURCE OF TRUTH.
 *
 * Boundary: may import @docfonts/core (types/verdicts). Must NOT parse fonts or DOCX. Records are
 * imported one-way from font-fidelity-research via scripts/import-research.ts; never hand-edited
 * from folklore, and nothing is metric-safe without a measurement.
 */
import type { AdvanceDelta, FaceCoverage, Verdict } from "@docfonts/core";

export interface EvidenceRecord {
  /** logical proprietary font name; preserved for export (the substitute is render-only). */
  originalFont: string;
  /** open substitute family, or null when no open substitute was found. */
  candidate: string | null;
  candidateVersion?: string;
  candidateSourceUrl?: string;
  candidateSha256?: string;
  license?: string;
  faces: FaceCoverage;
  advance?: AdvanceDelta;
  measurementMethod?: string;
  measuredDate?: string;
  /** the oracle environment the proprietary original was measured in (e.g. Word build / OS). */
  oracleEnv?: string;
  verdict: Verdict;
}

/** Seeded by scripts/import-research.ts. Empty until the first import. */
export const records: EvidenceRecord[] = [];

export function findByOriginal(name: string): EvidenceRecord[] {
  const key = name.toLowerCase();
  return records.filter((r) => r.originalFont.toLowerCase() === key);
}

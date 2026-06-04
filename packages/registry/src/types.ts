/**
 * @docfonts/registry artifact schemas. Three layers, kept strictly separate:
 *   - CorpusManifest    = PROVENANCE (which open candidate files exist, from where, under what license)
 *   - MeasurementResult = PROOF (the measured numbers + raw layout detail; one type, many kinds)
 *   - EvidenceRecord    = the PUBLIC VERDICT (derived status only; points at proof by ID)
 *
 * Durable identity is by stable ID + file sha256, never by file path. The public EvidenceRecord must
 * not become a dump of proof artifacts: raw page counts / break arrays live in a LiveLayoutMeasurement.
 */
import type {
  AdvanceDelta,
  FaceCoverage,
  GateStatus,
  PolicyAction,
  Verdict,
} from "@docfonts/core";
import type { FontFaceMetadata, StyleKey } from "@docfonts/font-metadata";

// --- stable artifact IDs (file paths can change; these do not) ---
export type CorpusId = string; // e.g. "google-fonts-2026-06-04"
export type CandidateFaceId = string; // a specific open face, e.g. "carlito#bold" (+ sha-derived)
export type MeasurementId = string; // e.g. "calibri__carlito#analytic_advance#2026-06-03"
export type EvidenceId = string; // e.g. "calibri"

// ===========================================================================
// Layer 1 - CorpusManifest: open-candidate provenance + parsed facts
// ===========================================================================

/** One open font FACE in the corpus (a family has many). Denormalized keys for querying. */
export interface CorpusFace {
  candidateFaceId: CandidateFaceId;
  family: string;
  styleKey: StyleKey; // regular | bold | italic | boldItalic | other
  weight: number; // OS/2 usWeightClass
  style: "normal" | "italic";
  fileName: string;
  /** sha256 of the file bytes: the durable join key to measurements. */
  fileSha256: string;
  /** parsed facts (from @docfonts/font-metadata); the corpus stores facts, never scores. */
  metadata: FontFaceMetadata;
}

export interface CorpusFamily {
  family: string;
  license: string; // e.g. "OFL-1.1"
  licenseSource: string; // where the license came from, e.g. "google/fonts ofl/carlito"
  /** sha256 of the exact license file that accompanied this source - proves file + license pairing. */
  licenseTextSha256: string;
  sourceUrl: string;
  faces: CorpusFace[];
}

export interface CorpusManifest {
  corpusId: CorpusId;
  source: string; // e.g. "Google Fonts (Latin, all files)"
  sourceUrl: string;
  retrievedDate: string; // YYYY-MM-DD
  families: CorpusFamily[];
}

// ===========================================================================
// Layer 2 - MeasurementResult: the proof (one type, discriminated by kind)
// ===========================================================================

/** Points at what was measured. May omit the face for family-level results. */
export interface CandidateRef {
  candidateFamily: string;
  candidateFaceId?: CandidateFaceId;
  /** the exact file measured, when a specific face was used. */
  fileSha256?: string;
}

interface MeasurementBase {
  measurementId: MeasurementId;
  /** logical proprietary font name (a LABEL; no proprietary metric tables are stored). */
  originalFont: string;
  /** the oracle environment, e.g. "Windows 11 M365 Word 2026-06" - label only. */
  originalOracleEnv: string;
  /** the single candidate measured. Null/absent for negative or multi-candidate (bakeoff) results. */
  candidate?: CandidateRef | null;
  methodVersion: string;
  measuredDate: string; // YYYY-MM-DD
  testStringsRef?: string; // named test-string set
  notes?: string;
}

/** Analytic advance comparison from hmtx (no rendering). */
export interface AnalyticAdvanceMeasurement extends MeasurementBase {
  kind: "analytic_advance";
  candidate: CandidateRef; // single-pair measurement always names its candidate
  advance: AdvanceDelta;
  perFace?: Partial<Record<StyleKey, AdvanceDelta>>;
}

/** Browser / canvas measureText comparison. */
export interface BrowserCanvasMeasurement extends MeasurementBase {
  kind: "browser_canvas";
  candidate: CandidateRef;
  advance: AdvanceDelta;
  sizePx?: number;
}

/** Live Word-vs-SuperDoc layout proof. Raw proof detail lives HERE, not on the public record. */
export interface LiveLayoutMeasurement extends MeasurementBase {
  kind: "live_layout";
  candidate: CandidateRef;
  proof: LayoutProof;
}

/** Aggregate of per-face results into a family-level conclusion. */
export interface FaceAggregateMeasurement extends MeasurementBase {
  kind: "face_aggregate";
  faces: FaceCoverage;
  advance?: AdvanceDelta;
  /** the per-face measurements this aggregates. */
  components?: MeasurementId[];
}

/** A bakeoff: many candidates ranked for one original. The conclusion may still be "no substitute". */
export interface CandidateScore {
  candidate: CandidateRef;
  advance: AdvanceDelta;
  faces?: FaceCoverage;
}
export interface TopCandidatesMeasurement extends MeasurementBase {
  kind: "top_candidates";
  /** ranked best-first; empty (or all failing) is a valid "no open substitute found" result. */
  candidates: CandidateScore[];
}

export type MeasurementResult =
  | AnalyticAdvanceMeasurement
  | BrowserCanvasMeasurement
  | LiveLayoutMeasurement
  | FaceAggregateMeasurement
  | TopCandidatesMeasurement;

export type MeasurementKind = MeasurementResult["kind"];

/** Raw layout-proof detail. Belongs to a LiveLayoutMeasurement, never to the public record. */
export interface LayoutProof {
  pages: number;
  totalLines: number;
  lineBreaksMatch: boolean;
  /** 1-based line numbers whose break position diverged from Word, if any. */
  mismatchedLines?: number[];
  note?: string;
}

// ===========================================================================
// Layer 3 - EvidenceRecord: the public verdict (derived status only)
// ===========================================================================

/** Derived PUBLIC gate status. Not raw proof - the proof is in the referenced measurements. */
export interface Gates {
  static: GateStatus;
  metric: GateStatus;
  layout: GateStatus;
  ship: GateStatus;
}

export interface EvidenceRecord {
  evidenceId: EvidenceId;
  /** logical proprietary font name; preserved for export (the substitute is render-only). */
  originalFont: string;
  /** null/absent for no_substitute / preserve_only / customer_supplied / generic policy. */
  candidate?: CandidateRef | null;
  verdict: Verdict;
  faces: FaceCoverage;
  /** public advance summary; the full proof lives in the referenced measurements. */
  advance?: AdvanceDelta;
  candidateLicense?: string | null;
  candidateLicenseSource?: string;
  gates: Gates;
  /** proof behind this verdict, by MeasurementId (analytic + layout + ...). */
  measurementRefs: MeasurementId[];
  /** normalized, renderer-neutral action (see @docfonts/core PolicyAction). */
  policyAction?: PolicyAction;
  confidence?: string; // e.g. "R" | "high" | "medium"
  exportRule: "preserve_original_name";
  measuredDate?: string;
  notes?: string;
}

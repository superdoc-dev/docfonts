/**
 * Public substitution-EVIDENCE export: the renderer-facing projection of an EvidenceRecord. A document
 * renderer (SuperDoc, a PDF generator, ...) consumes THIS, never the full EvidenceRecord. It carries
 * only the structured fields a renderer needs - which logical family maps to which physical substitute,
 * the verdict and per-face breakdown, the worst-case advance that gates layout, and the proof pointers -
 * and deliberately DROPS the record's editorial prose (notes / confidence / measured dates) and the
 * candidate's license SOURCE. The renderer decides from structured data, not free text.
 *
 * Pure + reproducible: the committed data/registry/substitution-evidence.json is exactly
 * exportSubstitutionEvidence(loadRecords()) (an export.test asserts no drift). This is docfonts as the
 * UPSTREAM producer of the artifact a consumer would otherwise hand-vendor.
 */
import type {
  AdvanceDelta,
  FaceCoverage,
  PolicyAction,
  Verdict,
} from "@docfonts/core";
import type { EvidenceRecord, Gates, MeasurementId } from "./types";

/**
 * RIBBI face slot - the renderer's coarse face bucket. This is docfonts `StyleKey` minus "other": an
 * export carries no non-RIBBI face evidence, because a renderer has no face slot to attach it to.
 */
export type FaceSlot = "regular" | "bold" | "italic" | "boldItalic";

const FACE_SLOTS: ReadonlySet<string> = new Set([
  "regular",
  "bold",
  "italic",
  "boldItalic",
]);

/**
 * A named glyph-level advance divergence on one face. Mirrors the record's GlyphException but keys the
 * face as `slot` (the renderer's RIBBI vocabulary), not the record's `styleKey`.
 */
export interface ExportedGlyphException {
  slot: FaceSlot;
  codepoint: number;
  advanceDelta: number;
  note: string;
}

/**
 * One logical font's substitution evidence: the renderer-facing fields of an EvidenceRecord. A consumer
 * derives its substitute map by taking the rows whose `policyAction` is `substitute`; the verdict /
 * per-face / glyph-exception fields ride along so a verdict-aware reporting pass needs no reshape.
 */
export interface SubstitutionEvidence {
  /** docfonts EvidenceRecord id - the provenance pointer back to the source record, e.g. "cambria". */
  evidenceId: string;
  /** the proprietary family the document asks for (docfonts `originalFont`), e.g. "Cambria". */
  logicalFamily: string;
  /** the physical substitute rendered in its place; null when no candidate is recommended. */
  physicalFamily: string | null;
  /** worst-face fidelity verdict (the public summary; see `faceVerdicts` when faces disagree). */
  verdict: Verdict;
  /** per-face verdicts, AUTHORITATIVE when present (a QUALIFIED substitute); top-level = worst face. */
  faceVerdicts?: Partial<Record<FaceSlot, Verdict>>;
  /** named glyph-level divergences that qualify a face (e.g. one codepoint reflows). */
  glyphExceptions?: ExportedGlyphException[];
  faces: FaceCoverage;
  advance?: AdvanceDelta;
  gates: Gates;
  /** renderer-neutral action; `substitute` is what makes a consumer map the family. */
  policyAction: PolicyAction;
  /** proof pointers back into docfonts, by MeasurementId. */
  measurementRefs: MeasurementId[];
  /** SPDX id of the substitute's license (the license SOURCE is dropped - it is provenance, not data). */
  candidateLicense?: string | null;
  exportRule: "preserve_original_name";
}

/** Map a record `styleKey` to a renderer `slot`, rejecting "other" (no RIBBI slot to project it onto). */
function toSlot(styleKey: string, ctx: string): FaceSlot {
  if (!FACE_SLOTS.has(styleKey))
    throw new Error(
      `[export] ${ctx}: face "${styleKey}" is not a RIBBI slot and cannot be exported`,
    );
  return styleKey as FaceSlot;
}

/**
 * Project ONE EvidenceRecord to its renderer-facing evidence. PURE. Drops notes / confidence /
 * measuredDate / candidateLicenseSource; renames originalFont -> logicalFamily, candidate ->
 * physicalFamily, and every face `styleKey` -> `slot`. A record must carry a policyAction (the renderer
 * keys off it); a missing one is a data error, not a silent default.
 */
export function toSubstitutionEvidence(
  r: EvidenceRecord,
): SubstitutionEvidence {
  if (!r.policyAction)
    throw new Error(
      `[export] ${r.evidenceId}: record has no policyAction; cannot export a renderer action`,
    );
  const ev: SubstitutionEvidence = {
    evidenceId: r.evidenceId,
    logicalFamily: r.originalFont,
    physicalFamily: r.candidate?.candidateFamily ?? null,
    verdict: r.verdict,
    faces: r.faces,
    gates: r.gates,
    policyAction: r.policyAction,
    measurementRefs: r.measurementRefs,
    exportRule: r.exportRule,
  };
  if (r.advance) ev.advance = r.advance;
  if (r.candidateLicense !== undefined)
    ev.candidateLicense = r.candidateLicense;
  if (r.faceVerdicts) {
    const fv: Partial<Record<FaceSlot, Verdict>> = {};
    for (const [styleKey, verdict] of Object.entries(r.faceVerdicts))
      fv[toSlot(styleKey, `${r.evidenceId} faceVerdicts`)] = verdict;
    ev.faceVerdicts = fv;
  }
  if (r.glyphExceptions)
    ev.glyphExceptions = r.glyphExceptions.map((g) => ({
      slot: toSlot(g.styleKey, `${r.evidenceId} glyphException`),
      codepoint: g.codepoint,
      advanceDelta: g.advanceDelta,
      note: g.note,
    }));
  return ev;
}

/** Project every record to renderer-facing evidence, preserving record order. PURE. */
export function exportSubstitutionEvidence(
  records: readonly EvidenceRecord[],
): SubstitutionEvidence[] {
  return records.map(toSubstitutionEvidence);
}

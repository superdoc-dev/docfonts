/**
 * `@docfonts/fallbacks` public types. SELF-CONTAINED on purpose: this package is the small runtime
 * artifact a renderer imports, so it carries its own copy of the verdict/policy vocabulary rather than
 * depending on `@docfonts/core` (which would force core to be published too). The docfonts repo keeps a
 * drift test asserting these unions stay in sync with `@docfonts/core` and with the shipped data.
 */

/** Fidelity verdict, best to worst. Mirror of `@docfonts/core` `Verdict`. */
export type Verdict =
  | "metric_safe" // advances within the DIRECT threshold (weighted-mean <= 0.5%, worst-case <= 1%)
  | "near_metric" // LIKELY band: weighted-mean <= 1%, worst-case <= 2.5% - near-exact, a few glyphs drift
  | "cell_width_only" // monospace cell width matches; glyph shapes do not
  | "visual_only" // same visual category, but advances are NOT line-break safe
  | "customer_supplied" // the real font must come from the customer
  | "preserve_only" // keep the original name, do not substitute (e.g. math / symbol fonts)
  | "no_substitute"; // no open candidate qualifies

/** Renderer-neutral resolution action. Mirror of `@docfonts/core` `PolicyAction`. */
export type PolicyAction =
  | "substitute" // render the named physical candidate in place of the logical font
  | "category_fallback" // no clean candidate; a same-category open font with the right letterforms
  | "preserve_only" // keep the logical name + a system fallback; claim no substitute
  | "customer_supplied"; // the customer must provide the real font

/** Derived public gate status. Diagnostic only. */
export type GateStatus = "pass" | "not_run" | "fail";

/** RIBBI face slot - the renderer's coarse face bucket. */
export type FaceSlot = "regular" | "bold" | "italic" | "boldItalic";

/** Advance-width divergence vs the proprietary oracle, as fractions (0 = identical advances). */
export interface AdvanceDelta {
  meanDelta: number;
  /** the worst-case delta, not the mean, is what gates line-break fidelity. */
  maxDelta: number;
}

/** Which of the four RIBBI faces the physical candidate supplies. */
export interface FaceCoverage {
  regular: boolean;
  bold: boolean;
  italic: boolean;
  boldItalic: boolean;
}

/** The four derived gate statuses behind a verdict; the proof is the referenced measurements. */
export interface SubstituteGates {
  static: GateStatus;
  metric: GateStatus;
  layout: GateStatus;
  ship: GateStatus;
}

/** A named glyph-level advance divergence that qualifies one face (e.g. one codepoint reflows). */
export interface GlyphException {
  slot: FaceSlot;
  codepoint: number;
  advanceDelta: number;
  note: string;
}

/**
 * One logical font's substitution evidence: the renderer-facing fields of a docfonts EvidenceRecord.
 * Structurally identical to the docfonts registry's exported `SubstitutionEvidence`; the shipped
 * {@link SUBSTITUTION_EVIDENCE} is generated from that artifact, and a drift test enforces the match.
 */
export interface SubstitutionEvidence {
  /** docfonts EvidenceRecord id - the provenance pointer back to the source record, e.g. "cambria". */
  evidenceId: string;
  /** the proprietary family the document asks for, e.g. "Cambria". */
  logicalFamily: string;
  /** the physical substitute rendered in its place; null when no candidate is recommended. */
  physicalFamily: string | null;
  /** worst-face fidelity verdict (the public summary; see `faceVerdicts` when faces disagree). */
  verdict: Verdict;
  /** per-face verdicts, AUTHORITATIVE when present (a QUALIFIED substitute); top-level = worst face. */
  faceVerdicts?: Partial<Record<FaceSlot, Verdict>>;
  /** named glyph-level divergences that qualify a face. */
  glyphExceptions?: GlyphException[];
  faces: FaceCoverage;
  advance?: AdvanceDelta;
  gates: SubstituteGates;
  /** renderer-neutral action; `substitute` is what makes a consumer map the family. */
  policyAction: PolicyAction;
  /** proof pointers back into docfonts, by MeasurementId. */
  measurementRefs: string[];
  /** SPDX id of the substitute's license. */
  candidateLicense?: string | null;
  exportRule: "preserve_original_name";
}

/**
 * The ergonomic result of {@link getFallback}: the single decision a renderer needs to act on - which
 * physical family to render, how it was chosen, and whether it is metric-faithful. The full structured
 * row stays available via {@link SUBSTITUTION_EVIDENCE} for richer reporting.
 */
export interface FontFallback {
  /** the physical family to render in place of the requested font. */
  family: string;
  /** how it was chosen: a metric substitute vs a same-category visual fallback. */
  action: PolicyAction;
  /** the worst-face fidelity verdict behind the choice. */
  verdict: Verdict;
  /** true iff the substitution is metric-grade (line-break faithful): verdict metric_safe or near_metric. */
  faithful: boolean;
  /** docfonts provenance pointer - the EvidenceRecord this came from. */
  evidenceId: string;
}

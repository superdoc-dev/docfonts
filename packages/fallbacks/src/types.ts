/**
 * Public types for `@docfonts/fallbacks`. The package is self-contained so consumers install one
 * runtime dependency.
 */

/** Fidelity verdict, best to worst. */
export type Verdict =
  | "metric_safe" // advances within the DIRECT threshold (weighted-mean <= 0.5%, worst-case <= 1%)
  | "near_metric" // LIKELY band: weighted-mean <= 1%, worst-case <= 2.5% - near-exact, a few glyphs drift
  | "cell_width_only" // monospace cell width matches; glyph shapes do not
  | "visual_only" // same visual category, but advances are NOT line-break safe
  | "customer_supplied" // the real font must come from the customer
  | "preserve_only" // keep the original name, do not substitute (e.g. math / symbol fonts)
  | "no_substitute"; // no open candidate qualifies

/** Renderer-neutral resolution action. */
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
 * One logical font's structured fallback evidence.
 */
export interface SubstitutionEvidence {
  /** docfonts evidence id, e.g. "cambria". */
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
  /** stable measurement ids behind the row. */
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
  /**
   * Coarse "good enough for line-break fidelity" flag: true for the metric-grade bands (verdict
   * metric_safe or near_metric), false otherwise. NOT a claim of a perfect/exact clone - near_metric
   * drifts a few glyphs, and a row can roll up to a worse top-level verdict because of one face (see
   * Cambria). Read `verdict` (and the row's `faceVerdicts`) for the precise tier.
   */
  faithful: boolean;
  /** stable reviewed-evidence id. */
  evidenceId: string;
}

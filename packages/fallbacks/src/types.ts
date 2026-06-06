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
 * One logical font's structured fallback evidence. The raw rows are exported as
 * {@link SUBSTITUTION_EVIDENCE} for reporting; the helpers project the renderer-relevant fields.
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
 * A resolved fallback: which open family to render, how it was chosen, and whether advances preserve
 * line breaks. The full structured row stays available via {@link SUBSTITUTION_EVIDENCE} for reporting.
 */
export interface FontFallback {
  /** the open family to render in place of the requested font. */
  substituteFamily: string;
  /**
   * What a renderer should DO, independent of fidelity: `substitute` = render the named open family;
   * `category_fallback` = render a lower-fidelity same-category family. NOT a quality claim - a
   * `substitute` can still be top-level `visual_only` (e.g. Cambria). Read `verdict` for fidelity.
   */
  policyAction: PolicyAction;
  /** the worst-face fidelity verdict behind the choice. */
  verdict: Verdict;
  /**
   * Coarse "advances preserve line breaks" flag: true for metric_safe, near_metric, or monospace
   * cell_width_only (cell width, and so every advance, matches). NOT a claim of a perfect/exact clone -
   * near_metric drifts a few glyphs, cell_width_only keeps the advances but not the glyph shapes, and a
   * row can roll up to a worse top-level verdict because of one face (see Cambria). Read `verdict` (and
   * the row's `faceVerdicts`) for the precise tier.
   */
  lineBreakSafe: boolean;
  /**
   * Reviewed face coverage: which RIBBI faces this substitute is PROVEN to supply. A renderer MUST
   * respect a face-scoped row: it can be Regular-only (e.g. Baskerville -> Bacasime, Cooper Black ->
   * Caprasimo), and routing bold/italic to a face it lacks is wrong. NOTE: an all-false `faces` means
   * the row is NOT face-scoped (e.g. a category fallback, whose physical font does have faces), NOT
   * that the font has no faces - such rows render for any face. The face-aware helpers
   * ({@link getRenderableFallbackForFace}) encode this rule for you.
   */
  faces: FaceCoverage;
  /** stable reviewed-evidence id; look the full row up in {@link SUBSTITUTION_EVIDENCE}. */
  evidenceId: string;
  /**
   * Named glyph-level divergences that qualify this fallback (e.g. one codepoint reflows). Scoped to
   * the lookup: a family lookup ({@link getRenderableFallback}) carries ALL of the row's exceptions; a
   * face lookup ({@link getRenderableFallbackForFace}) carries only the requested face's. Omitted when
   * none apply - so a renderer can surface a precise "this face reflows on U+0060" without re-deriving.
   * A fresh array each call (readonly): mutating it never affects another lookup.
   */
  glyphExceptions?: readonly GlyphException[];
}

/**
 * The full, honest outcome of a fallback lookup. A discriminated union so a consumer can tell apart
 * cases that a bare `FontFallback | null` collapses: docfonts has never heard of the font (`unknown`)
 * vs knows it but recommends no renderable family (`no_recommended_fallback`), the substitute exists
 * but the consumer does not bundle it (`asset_missing`), and the deliberate non-substitution policies
 * (`preserve_only`, `customer_supplied`). The face-aware lookups add `face_missing`: a substitute is
 * recommended for the family but does NOT provide the requested face. `evidenceId` on the terminal
 * kinds points back into {@link SUBSTITUTION_EVIDENCE} for the full row (verdict, faces, ...).
 */
export type FallbackDecision =
  | { kind: "fallback"; fallback: FontFallback }
  | {
      kind: "asset_missing";
      substituteFamily: string;
      verdict: Verdict;
      evidenceId: string;
    }
  | {
      /** the family has a renderable substitute, but it does not provide the requested face - route
       *  this face through face-aware absence handling, do NOT substitute it. */
      kind: "face_missing";
      substituteFamily: string;
      evidenceId: string;
    }
  | { kind: "no_recommended_fallback"; evidenceId: string }
  | { kind: "customer_supplied"; evidenceId: string }
  | { kind: "preserve_only"; evidenceId: string }
  | { kind: "unknown" };

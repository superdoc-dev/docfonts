/**
 * @docfonts/core - scoring, verdicts, and shared types. PURE: no I/O, no font/DOCX parsing.
 *
 * Boundary: may be imported by registry and by apps. Must NOT import @docfonts/font-metadata or
 * @docfonts/docx-fonts (keep parsing/I/O out of the scoring layer).
 */

export type Verdict =
  | "metric_safe" // advances within the DIRECT threshold (wtd-mean <= 0.5%, worst-case <= 1%)
  | "near_metric" // within the LIKELY band: wtd-mean <= 1%, worst-case <= 2.5%. Near-exact, a few glyphs drift.
  | "cell_width_only"
  | "visual_only"
  | "customer_supplied"
  | "preserve_only"
  | "no_substitute";

/**
 * Substitute-quality severity, best (0) to worst. Used to roll a record's per-face verdicts up to one
 * top-level verdict: the top-level is the WORST face, so the public summary is honest at a glance while
 * the per-face breakdown shows the strong faces. near_metric sits just below metric_safe.
 */
export const VERDICT_SEVERITY: Record<Verdict, number> = {
  metric_safe: 0,
  near_metric: 1,
  cell_width_only: 2,
  visual_only: 3,
  customer_supplied: 4,
  preserve_only: 5,
  no_substitute: 6,
};

/** The worst (highest-severity) verdict among a set of per-face verdicts. */
export function worstVerdict(verdicts: readonly Verdict[]): Verdict {
  return verdicts.reduce((worst, v) =>
    VERDICT_SEVERITY[v] > VERDICT_SEVERITY[worst] ? v : worst,
  );
}

/** Public, derived gate status for an evidence record (NOT raw proof - the proof is a measurement). */
export type GateStatus = "pass" | "not_run" | "fail";

/**
 * Normalized, renderer-neutral resolution action for a public record. Deliberately NOT a
 * SuperDoc-internal action name - any document renderer (PDF generator, editor, ...) can map these.
 */
export type PolicyAction =
  | "substitute"
  | "category_fallback"
  | "preserve_only"
  | "customer_supplied";

export interface AdvanceDelta {
  /** weighted-mean advance delta as a fraction (0 = identical advances). */
  meanDelta: number;
  /** worst-case advance delta as a fraction (matters most for line-break fidelity). */
  maxDelta: number;
}

export interface FaceCoverage {
  regular: boolean;
  bold: boolean;
  italic: boolean;
  boldItalic: boolean;
}

// TODO: scoreVerdict(delta, faceCoverage, ...) -> Verdict, derived from the research catalog rules.

/**
 * @docfonts/core - scoring, verdicts, and shared types. PURE: no I/O, no font/DOCX parsing.
 *
 * Boundary: may be imported by registry and by apps. Must NOT import @docfonts/font-metadata or
 * @docfonts/docx-fonts (keep parsing/I/O out of the scoring layer).
 */

export type Verdict =
  | "metric_safe"
  | "cell_width_only"
  | "visual_only"
  | "customer_supplied"
  | "preserve_only"
  | "no_substitute";

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

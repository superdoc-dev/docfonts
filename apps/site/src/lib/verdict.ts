import type { Verdict } from "@docfonts/core";

/**
 * Presentation metadata for the six verdicts. The taxonomy lives in @docfonts/core; this is the
 * one place the site maps each verdict to a label, a non-color glyph, a CSS class, and a definition.
 * Color is load-bearing, so the glyph carries the same information for anyone who cannot use hue.
 */
export interface VerdictMeta {
  label: string;
  glyph: string;
  cls: string;
  def: string;
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  metric_safe: {
    label: "metric-safe",
    glyph: "✓", // check
    cls: "safe",
    def: "Advances match within threshold. Layout holds, pending a live render proof.",
  },
  cell_width_only: {
    label: "cell-width-only",
    glyph: "↔", // left-right arrow
    cls: "cell",
    def: "Monospace cell width matches; letterforms differ. Columns align, glyphs do not.",
  },
  visual_only: {
    label: "visual-only",
    glyph: "≈", // almost equal
    cls: "visual",
    def: "Category-correct look, but advances differ. Text will reflow.",
  },
  preserve_only: {
    label: "preserve-only",
    glyph: "▣", // square with inner square
    cls: "preserve",
    def: "Keep the original (symbol, math). Never substitute.",
  },
  customer_supplied: {
    label: "customer-supplied",
    glyph: "○", // ring
    cls: "customer",
    def: "Use a font the user provides. Outside the open registry.",
  },
  no_substitute: {
    label: "no-substitute",
    glyph: "✕", // multiplication x
    cls: "clay",
    def: "No open metric clone. Only a reflowing fallback or a customer font remains.",
  },
};

/** Display order: pass -> partial -> conditional -> no. */
export const VERDICT_ORDER: Verdict[] = [
  "metric_safe",
  "cell_width_only",
  "visual_only",
  "preserve_only",
  "customer_supplied",
  "no_substitute",
];

/** Format an advance fraction (0.0001) as a percentage string ("0.01%"). */
export function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

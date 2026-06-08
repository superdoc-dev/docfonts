/**
 * Advance-fidelity tier. Thresholds mirror the package's verdict language (see `src/types.ts`):
 * metric_safe is the DIRECT band, near_metric the LIKELY band, everything else visual_only.
 * cell_width_only is the monospace model's verdict for a matching cell: it proves line width, not
 * glyph-shape fidelity.
 */
export type CompareTier =
  | "metric_safe"
  | "near_metric"
  | "cell_width_only"
  | "visual_only";

/**
 * Classification model. `latin` is the default proportional comparison. `monospace` treats a matching
 * advance as proof of cell width only, since every glyph in a monospace cell shares one advance.
 */
export type CompareModel = "latin" | "monospace";

export const TIER_RANK: Record<CompareTier, number> = {
  metric_safe: 0,
  near_metric: 1,
  cell_width_only: 2,
  visual_only: 3,
};

/**
 * Classify a (mean, max) advance-delta pair into a fidelity tier. Deltas are fractions of the em. Under
 * the monospace model a matching cell only vouches for line width, so the metric bands collapse to
 * cell_width_only while non-matching candidates stay visual_only.
 */
export function classifyTier(
  meanDelta: number,
  maxDelta: number,
  model: CompareModel = "latin",
): CompareTier {
  let tier: CompareTier = "visual_only";
  if (meanDelta <= 0.005 && maxDelta <= 0.01) tier = "metric_safe";
  else if (meanDelta <= 0.01 && maxDelta <= 0.025) tier = "near_metric";
  if (model === "monospace" && tier !== "visual_only") return "cell_width_only";
  return tier;
}

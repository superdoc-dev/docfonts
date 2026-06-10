/**
 * Advance-fidelity tier. Thresholds mirror the package's verdict language (see `src/types.ts`):
 * metric_safe is the DIRECT band, near_metric the LIKELY band, everything else visual_only.
 * cell_width_only is the width-only verdict for models where matching advances do not prove
 * glyph-shape fidelity.
 */
export type CompareTier =
  | "metric_safe"
  | "near_metric"
  | "cell_width_only"
  | "visual_only";

/**
 * Classification model. `latin` is the default proportional comparison. `monospace` and `cjk-jp`
 * cap exact matches at cell_width_only because they prove width behavior, not visual shape.
 */
export type CompareModel = "latin" | "monospace" | "cjk-jp";

export const TIER_RANK: Record<CompareTier, number> = {
  metric_safe: 0,
  near_metric: 1,
  cell_width_only: 2,
  visual_only: 3,
};

/**
 * Classify a (mean, max) advance-delta pair into a fidelity tier. Deltas are fractions of the em. Under
 * the monospace and CJK models, matching advances only vouch for width behavior, so the metric bands
 * collapse to cell_width_only while non-matching candidates stay visual_only.
 */
export function classifyTier(
  meanDelta: number,
  maxDelta: number,
  model: CompareModel = "latin",
): CompareTier {
  let tier: CompareTier = "visual_only";
  if (meanDelta <= 0.005 && maxDelta <= 0.01) tier = "metric_safe";
  else if (meanDelta <= 0.01 && maxDelta <= 0.025) tier = "near_metric";
  if ((model === "monospace" || model === "cjk-jp") && tier !== "visual_only")
    return "cell_width_only";
  return tier;
}

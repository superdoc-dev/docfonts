import type { FeatureDistance } from "./features";
import type { CompareScore, GlyphDelta } from "./score";
import type { CompareTier } from "./tiers";
import { TIER_RANK } from "./tiers";

export interface CompareRow {
  sourceId: string;
  file: string;
  score: CompareScore;
  /** Typographic feature distance, when computed. Used as a within-tier ranking signal. */
  feature?: FeatureDistance;
}

interface RenderOptions {
  limit?: number | null;
}

function formatCodepoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Format an advance delta (fraction of the em) for a table cell, or "n/a" when not measured. */
export function formatDelta(value: number): string {
  return Number.isNaN(value) ? "n/a" : value.toFixed(4);
}

function formatWorst(worst: GlyphDelta[]): string {
  if (worst.length === 0) return "-";
  return worst
    .map((g) => `${formatCodepoint(g.codepoint)} ${g.delta.toFixed(4)}`)
    .join("; ");
}

function featureCoverageOf(feature: FeatureDistance | undefined): number {
  if (!feature || feature.total === 0) return 0;
  return feature.compared / feature.total;
}

/** Feature score for sorting: a real score, or +Infinity when nothing was compared. */
function featureScoreOf(feature: FeatureDistance | undefined): number {
  if (!feature || Number.isNaN(feature.score)) return Infinity;
  return feature.score;
}

/** Format the blended feature distance for a table cell, or "n/a" when nothing overlapped. */
export function formatFeatureScore(
  feature: FeatureDistance | undefined,
): string {
  if (!feature || Number.isNaN(feature.score)) return "n/a";
  return feature.score.toFixed(4);
}

/** Format how many features both fonts declared as a `compared/total` cell. */
export function formatFeatureCoverage(
  feature: FeatureDistance | undefined,
): string {
  if (!feature) return "-";
  return `${feature.compared}/${feature.total}`;
}

function carriesStrongAdvanceSignal(tier: CompareTier): boolean {
  return (
    tier === "metric_safe" ||
    tier === "near_metric" ||
    tier === "cell_width_only"
  );
}

/**
 * Flag a strong advance match whose declared features disagree enough to need review. Only meaningful
 * when the advance tier already vouches for line metrics; otherwise there is nothing to flag.
 */
export function formatFlags(
  tier: CompareTier,
  feature: FeatureDistance | undefined,
): string {
  if (!carriesStrongAdvanceSignal(tier) || !feature) return "-";
  if (feature.gaps.length === 0) return "-";
  return feature.gaps.map((gap) => `${gap.feature}_gap`).join(",");
}

/**
 * Render a fixed-column text table: a header row plus body rows, each cell left-padded to its column
 * width. Shared by the corpus report and the bake-off so both print aligned columns the same way.
 */
export function formatTable(header: string[], body: string[][]): string {
  const widths = header.map((h, col) =>
    Math.max(h.length, ...body.map((r) => r[col].length)),
  );
  const line = (cells: string[]) =>
    cells
      .map((cell, col) => cell.padEnd(widths[col]))
      .join("  ")
      .trimEnd();
  return [line(header), ...body.map(line)].join("\n");
}

/** Rank rows by the same order the text report prints. */
export function rankRows<T extends CompareRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const tierDiff = TIER_RANK[a.score.tier] - TIER_RANK[b.score.tier];
    if (tierDiff !== 0) return tierDiff;
    const aCoverage =
      a.score.total === 0 ? 0 : a.score.compared / a.score.total;
    const bCoverage =
      b.score.total === 0 ? 0 : b.score.compared / b.score.total;
    const coverageDiff = bCoverage - aCoverage;
    if (coverageDiff !== 0) return coverageDiff;
    const featureCoverageDiff =
      featureCoverageOf(b.feature) - featureCoverageOf(a.feature);
    if (featureCoverageDiff !== 0) return featureCoverageDiff;
    const aFeature = featureScoreOf(a.feature);
    const bFeature = featureScoreOf(b.feature);
    if (aFeature !== bFeature) return aFeature - bFeature;
    const aMean = Number.isNaN(a.score.meanDelta)
      ? Infinity
      : a.score.meanDelta;
    const bMean = Number.isNaN(b.score.meanDelta)
      ? Infinity
      : b.score.meanDelta;
    return aMean - bMean;
  });
}

/** Render the ranked table. Returned as a string so it can be tested without capturing stdout. */
export function renderReport(
  rows: CompareRow[],
  options: RenderOptions = {},
): string {
  const ranked = rankRows(rows);

  const visible =
    options.limit === null ? ranked : ranked.slice(0, options.limit);

  const header = [
    "source",
    "file",
    "mean",
    "max",
    "tier",
    "coverage",
    "missing",
    "fscore",
    "fcov",
    "flags",
    "over1",
    "over2.5",
    "worst",
  ];
  const body = visible.map((row) => [
    row.sourceId,
    row.file,
    formatDelta(row.score.meanDelta),
    formatDelta(row.score.maxDelta),
    row.score.tier,
    `${row.score.compared}/${row.score.total}`,
    String(row.score.missing),
    formatFeatureScore(row.feature),
    formatFeatureCoverage(row.feature),
    formatFlags(row.score.tier, row.feature),
    String(row.score.over1Percent),
    String(row.score.over2_5Percent),
    formatWorst(row.score.worstGlyphs),
  ]);

  return formatTable(header, body);
}

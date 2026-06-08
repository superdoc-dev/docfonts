import type { CompareScore, GlyphDelta } from "./score";
import { TIER_RANK } from "./tiers";

interface CompareRow {
  sourceId: string;
  file: string;
  score: CompareScore;
}

interface RenderOptions {
  limit?: number | null;
}

function formatCodepoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function formatDelta(value: number): string {
  return Number.isNaN(value) ? "n/a" : value.toFixed(4);
}

function formatWorst(worst: GlyphDelta[]): string {
  if (worst.length === 0) return "-";
  return worst
    .map((g) => `${formatCodepoint(g.codepoint)} ${g.delta.toFixed(4)}`)
    .join("; ");
}

/** Render the ranked table. Returned as a string so it can be tested without capturing stdout. */
export function renderReport(
  rows: CompareRow[],
  options: RenderOptions = {},
): string {
  const ranked = [...rows].sort((a, b) => {
    const tierDiff = TIER_RANK[a.score.tier] - TIER_RANK[b.score.tier];
    if (tierDiff !== 0) return tierDiff;
    const aCoverage =
      a.score.total === 0 ? 0 : a.score.compared / a.score.total;
    const bCoverage =
      b.score.total === 0 ? 0 : b.score.compared / b.score.total;
    const coverageDiff = bCoverage - aCoverage;
    if (coverageDiff !== 0) return coverageDiff;
    const aMean = Number.isNaN(a.score.meanDelta)
      ? Infinity
      : a.score.meanDelta;
    const bMean = Number.isNaN(b.score.meanDelta)
      ? Infinity
      : b.score.meanDelta;
    return aMean - bMean;
  });

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
    String(row.score.over1Percent),
    String(row.score.over2_5Percent),
    formatWorst(row.score.worstGlyphs),
  ]);

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

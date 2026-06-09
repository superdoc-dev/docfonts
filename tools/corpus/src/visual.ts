import { execFileSync, spawnSync } from "node:child_process";

/**
 * Optional rendered-glyph probe for the bake-off. ImageMagick is required only when `--visual` is used.
 */

export const VISUAL_GLYPH_GRID = "aeg RQ& @ 0123456789 g a y j ?!";

const CANVAS_SIZE = "1100x140";
const POINTSIZE = "64";

export function magickAvailable(): boolean {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function requireMagick(): void {
  if (!magickAvailable())
    throw new Error(
      "--visual needs ImageMagick 7 (`magick`) on PATH. Install it, or drop --visual to compare without rendered metrics.",
    );
}

export function renderGlyphGrid(fontPath: string, outPath: string): void {
  execFileSync(
    "magick",
    [
      "-size",
      CANVAS_SIZE,
      "canvas:white",
      "-font",
      fontPath,
      "-pointsize",
      POINTSIZE,
      "-fill",
      "black",
      "-gravity",
      "NorthWest",
      "-annotate",
      "+10+10",
      VISUAL_GLYPH_GRID,
      "-flatten",
      outPath,
    ],
    { stdio: "ignore" },
  );
}

/**
 * `magick compare -metric RMSE` prints a raw value plus a normalized value in parentheses.
 */
export function parseCompareMetric(output: string): number {
  const parenthesized = output.match(/\(([\d.eE+-]+)\)/);
  if (parenthesized) return Number(parenthesized[1]);
  const leading = output.trim().match(/^[\d.eE+-]+/);
  if (leading) return Number(leading[0]);
  throw new Error(
    `could not read a metric from \`magick compare\` output: ${output.trim()}`,
  );
}

/**
 * `magick compare` exits 1 for normal image differences and 2+ for real errors.
 */
export function compareImages(
  referencePng: string,
  candidatePng: string,
): number {
  const result = spawnSync(
    "magick",
    ["compare", "-metric", "RMSE", referencePng, candidatePng, "null:"],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  const output = `${result.stderr ?? ""}${result.stdout ?? ""}`;
  if (result.status !== 0 && result.status !== 1)
    throw new Error(`\`magick compare\` failed: ${output.trim()}`);
  return parseCompareMetric(output);
}

export function formatVisualDiff(diff: number | undefined): string {
  return diff === undefined || Number.isNaN(diff) ? "n/a" : diff.toFixed(4);
}

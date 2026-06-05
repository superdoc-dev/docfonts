/**
 * Bakeoff contract tests. A bakeoff is a COMPARISON JOB (oracle vs the discovery snapshot): ranked
 * candidates + honest negatives, generated locally by scripts/bakeoff.ts and committed under
 * data/bakeoffs/. It is DISCOVERY output, never a verdict - these tests fail the build if a result
 * stops being public-safe, mis-ranks, mislabels a tier, or starts looking like a registry verdict.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BakeoffResult, DiscoverySnapshot } from "./src/index";

const DATA = join(import.meta.dir, "data");
const snapshotId = (
  JSON.parse(
    readFileSync(
      join(DATA, "discovery", "google-fonts-all-files-2026-06-04.json"),
      "utf8",
    ),
  ) as DiscoverySnapshot
).snapshotId;

const dir = join(DATA, "bakeoffs");
const results = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as BakeoffResult);

const CATEGORIES = new Set([
  "sans",
  "serif",
  "mono",
  "script",
  "display",
  "symbol",
  "unknown",
]);
const TIERS = new Set(["direct", "likely", "visual"]);
/** the tier a candidate's advance SHOULD map to (mirrors scripts/bakeoff.ts -> the registry bands). */
const expectedTier = (mean: number, max: number) =>
  mean <= 0.005 && max <= 0.01
    ? "direct"
    : mean <= 0.01 && max <= 0.025
      ? "likely"
      : "visual";

describe("bakeoff results", () => {
  it("at least the seeded targets are present", () => {
    expect(results.length).toBeGreaterThanOrEqual(2);
    const targets = results.map((r) => r.target.toLowerCase());
    expect(targets).toContain("comic sans ms");
    expect(targets).toContain("aptos");
  });

  for (const r of results) {
    describe(r.target, () => {
      it("is pinned to the searched snapshot and labels its oracle (no path/bytes)", () => {
        expect(r.corpusSnapshotId).toBe(snapshotId);
        expect(r.oracleEnv).toBeTruthy();
        expect(CATEGORIES.has(r.targetCategory)).toBe(true);
        expect(r.measuredDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(r.consideredFaces).toBeGreaterThan(0);
      });

      it("candidates are ranked best-first, tier-correct, in the target category", () => {
        let prev = -1;
        for (const c of r.candidates) {
          expect(c.fileSha256).toMatch(/^[0-9a-f]{64}$/);
          expect(c.license).toBeTruthy();
          expect(c.family).toBeTruthy();
          expect(TIERS.has(c.tier)).toBe(true);
          expect(c.category).toBe(r.targetCategory); // category-filtered
          expect(c.advance.meanDelta).toBeGreaterThanOrEqual(prev); // ascending by mean
          prev = c.advance.meanDelta;
          // tier must follow honestly from the measured advance (no inflated "direct"/"likely").
          expect(c.tier).toBe(
            expectedTier(c.advance.meanDelta, c.advance.maxDelta),
          );
        }
      });

      it("reports negatives as counts, not silence", () => {
        expect(Array.isArray(r.rejected)).toBe(true);
        for (const x of r.rejected) {
          expect(x.reason).toBeTruthy();
          expect(x.count).toBeGreaterThan(0);
        }
      });
    });
  }

  it("is public-safe: no binaries, no private/system paths", () => {
    const blob = JSON.stringify(results);
    for (const m of ["/Users/", "/Applications/", "/System/", "localPath"])
      expect(blob.includes(m)).toBe(false);
    expect(blob).not.toMatch(/"bytes"\s*:/);
  });

  it("is a job, not a verdict: results carry no registry verdict field", () => {
    const blob = JSON.stringify(results);
    expect(blob).not.toMatch(/"verdict"\s*:/);
  });
});

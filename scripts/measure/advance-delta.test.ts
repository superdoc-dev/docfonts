/**
 * Hermetic tests for the advance-delta method, using the committed OPEN font fixtures as stand-ins
 * for both oracle and candidate (no proprietary fonts needed). They prove the math: an identical
 * face has zero delta, a different face has a positive delta, and an unmeasurable input returns null.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFontFace } from "@docfonts/font-metadata";
import { advanceDelta } from "./advance-delta";

const FIXTURES = join(
  import.meta.dir,
  "..",
  "..",
  "tests",
  "fixtures",
  "fonts",
);
function face(file: string) {
  const r = parseFontFace(new Uint8Array(readFileSync(join(FIXTURES, file))));
  if (!r.ok) throw new Error(`fixture parse failed: ${file}: ${r.error}`);
  return r.face;
}

describe("advanceDelta", () => {
  const carlito = face("Carlito-Regular.ttf");
  const liberationSerif = face("LiberationSerif-Regular.ttf");

  test("an identical face has zero mean and max delta", () => {
    const d = advanceDelta(carlito, carlito);
    expect(d).not.toBeNull();
    expect(d?.meanDelta).toBe(0);
    expect(d?.maxDelta).toBe(0);
  });

  test("a genuinely different face has a positive, finite delta", () => {
    const d = advanceDelta(carlito, liberationSerif);
    expect(d).not.toBeNull();
    expect(d?.meanDelta).toBeGreaterThan(0);
    expect(Number.isFinite(d?.meanDelta as number)).toBe(true);
    expect(Number.isFinite(d?.maxDelta as number)).toBe(true);
    // maxDelta (worst single glyph) is at least as large as the typical mean drift.
    expect(d?.maxDelta).toBeGreaterThanOrEqual(d?.meanDelta as number);
  });

  test("delta is symmetric in magnitude direction (ratio is of the oracle)", () => {
    const ab = advanceDelta(carlito, liberationSerif);
    const ba = advanceDelta(liberationSerif, carlito);
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    // both directions report a real divergence (not necessarily equal: ratio base differs).
    expect(ab?.meanDelta).toBeGreaterThan(0);
    expect(ba?.meanDelta).toBeGreaterThan(0);
  });

  test("normalizes by unitsPerEm: same em-metrics at different upem -> ~0 max (regression)", () => {
    // Stub two faces with IDENTICAL em-relative advances but different unitsPerEm (2048 vs 1000),
    // the Cambria-vs-Caladea situation. Without upem normalization, maxDelta would read ~51%.
    const stub = (upem: number, advPerEm: number) =>
      ({
        metadata: { metrics: { unitsPerEm: upem } },
        hasAdvance: true,
        gidForCodepoint: (cp: number) => cp, // any nonzero gid
        advanceWidth: () => advPerEm * upem, // same fraction of em in both faces
        covers: () => true,
      }) as unknown as Parameters<typeof advanceDelta>[0];
    const a = stub(2048, 0.5);
    const b = stub(1000, 0.5);
    const d = advanceDelta(a, b, [{ text: "ll", weight: 1 }]);
    expect(d).not.toBeNull();
    expect(d?.maxDelta as number).toBeLessThan(0.0001);
    expect(d?.meanDelta as number).toBeLessThan(0.0001);
  });

  test("returns null when no test string can be measured", () => {
    expect(
      advanceDelta(carlito, carlito, [{ text: "", weight: 1 }]),
    ).toBeNull();
  });
});

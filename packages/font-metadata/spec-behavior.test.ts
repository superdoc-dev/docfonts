import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StyleKey } from "./src/index";
import {
  advanceOfString,
  coverage,
  LATIN_CORE,
  parseFontFace,
} from "./src/index";

const FONT_DIR = join(
  import.meta.dir,
  "..",
  "..",
  "tests",
  "fixtures",
  "fonts",
);
const bytesOf = (file: string) =>
  new Uint8Array(readFileSync(join(FONT_DIR, file)));
function faceOf(file: string) {
  const r = parseFontFace(bytesOf(file));
  if (!r.ok) throw new Error(`fixture ${file} failed to parse: ${r.error}`);
  return r.face;
}
const cp = (ch: string) => ch.codePointAt(0) as number;

/**
 * Independent SFNT / OpenType-contract behavior tests. Unlike parse.test.ts (which pins parity with
 * the proven JS parser), these assert intrinsic properties of the format and of the fonts themselves
 * - a correct parser of ANY implementation would pass them. They protect us from freezing the old
 * parser's incidental quirks as permanent truth.
 */
describe("advance scales with em size (advance = units * px / unitsPerEm)", () => {
  it("doubling sizePx doubles the advance", () => {
    const f = faceOf("Carlito-Regular.ttf");
    const a16 = advanceOfString(f, "Metrology", 16) as number;
    const a32 = advanceOfString(f, "Metrology", 32) as number;
    expect(a16).toBeGreaterThan(0);
    expect(a32 / a16).toBeCloseTo(2, 6);
  });

  it("empty string has zero advance", () => {
    expect(advanceOfString(faceOf("Carlito-Regular.ttf"), "", 16)).toBe(0);
  });

  it("string advance equals the sum of its glyph advances", () => {
    const f = faceOf("Carlito-Regular.ttf");
    const upem = f.metadata.metrics.unitsPerEm as number;
    const text = "Word";
    const manual =
      ([...text].reduce(
        (sum, ch) => sum + f.advanceWidth(f.gidForCodepoint(cp(ch))),
        0,
      ) *
        16) /
      upem;
    expect(advanceOfString(f, text, 16) as number).toBeCloseTo(manual, 9);
  });
});

describe("monospace vs proportional (intrinsic hmtx property)", () => {
  it("a monospaced font gives every ASCII glyph the same advance", () => {
    const f = faceOf("LiberationMono-Regular.ttf");
    expect(f.metadata.metrics.fixedPitch).toBe(true);
    const adv = (ch: string) => f.advanceWidth(f.gidForCodepoint(cp(ch)));
    const w = adv("M");
    expect(w).toBeGreaterThan(0);
    for (const ch of ["i", "l", "W", "m", "0", " ", "."])
      expect(adv(ch)).toBe(w);
  });

  it("a proportional font gives a narrow glyph less advance than a wide one", () => {
    const f = faceOf("Carlito-Regular.ttf");
    expect(f.metadata.metrics.fixedPitch).toBe(false);
    const adv = (ch: string) => f.advanceWidth(f.gidForCodepoint(cp(ch)));
    expect(adv("i")).toBeLessThan(adv("M"));
  });
});

describe("cmap coverage (intrinsic to a Latin font)", () => {
  it("covers ASCII letters and digits, with positive gids", () => {
    const f = faceOf("Carlito-Regular.ttf");
    for (const ch of ["A", "Z", "a", "z", "0", "9"]) {
      expect(f.covers(cp(ch))).toBe(true);
      expect(f.gidForCodepoint(cp(ch))).toBeGreaterThan(0);
    }
  });

  it("does not cover a CJK ideograph (gid 0)", () => {
    const f = faceOf("Carlito-Regular.ttf");
    expect(f.covers(0x4e00)).toBe(false); // U+4E00, a Latin font has no glyph
    expect(f.gidForCodepoint(0x4e00)).toBe(0);
  });

  it("gid lookup is deterministic", () => {
    const f = faceOf("Carlito-Regular.ttf");
    expect(f.gidForCodepoint(cp("A"))).toBe(f.gidForCodepoint(cp("A")));
  });

  it("coverage() is internally consistent (covered + missing = total, ratio in [0,1])", () => {
    const c = coverage(faceOf("Roboto-Regular.ttf"), LATIN_CORE);
    expect(c.covered + c.missing.length).toBe(c.total);
    expect(c.total).toBe(LATIN_CORE.length);
    expect(c.ratio).toBeGreaterThanOrEqual(0);
    expect(c.ratio).toBeLessThanOrEqual(1);
    expect(c.ratio).toBeCloseTo(c.covered / c.total, 9);
  });
});

describe("derived fields are self-consistent with their inputs", () => {
  it("styleKey follows the bold/italic flags across the four faces", () => {
    const cases: Array<[string, boolean, boolean, StyleKey]> = [
      ["Carlito-Regular.ttf", false, false, "regular"],
      ["Carlito-Bold.ttf", true, false, "bold"],
      ["Carlito-Italic.ttf", false, true, "italic"],
      ["Carlito-BoldItalic.ttf", true, true, "boldItalic"],
    ];
    for (const [file, bold, italic, styleKey] of cases) {
      const m = faceOf(file).metadata.face;
      expect(m.bold).toBe(bold);
      expect(m.italic).toBe(italic);
      expect(m.styleKey).toBe(styleKey);
    }
  });

  it("missingLatinCore is a subset of LATIN_CORE and matches the ratio", () => {
    const { missingLatinCore, latinCoreRatio } = faceOf("Carlito-Regular.ttf")
      .metadata.coverage;
    const core = new Set(LATIN_CORE);
    for (const c of missingLatinCore) expect(core.has(c)).toBe(true);
    expect(latinCoreRatio).toBeCloseTo(
      (LATIN_CORE.length - missingLatinCore.length) / LATIN_CORE.length,
      9,
    );
  });

  it("a TrueType .ttf reports sfntVersion 1.0", () => {
    expect(faceOf("Carlito-Regular.ttf").metadata.sfntVersion).toBe("1.0");
    expect(faceOf("LiberationMono-Regular.ttf").metadata.sfntVersion).toBe(
      "1.0",
    );
  });
});

describe("robustness", () => {
  it("rejects a truncated font without throwing", () => {
    const truncated = bytesOf("Carlito-Regular.ttf").slice(0, 20);
    let result: ReturnType<typeof parseFontFace> | undefined;
    expect(() => {
      result = parseFontFace(truncated);
    }).not.toThrow();
    expect(result?.ok).toBe(false);
  });
});

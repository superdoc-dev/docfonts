import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CmapKind, FontCategory, StyleKey } from "./src/index";
import {
  advanceOfString,
  countFaces,
  coverage,
  LATIN_CORE,
  parseFontFace,
  sha256Hex,
} from "./src/index";

const FIX = join(import.meta.dir, "..", "..", "tests", "fixtures", "fonts");

describe(".ttc multi-face parsing", () => {
  const ttc = new Uint8Array(readFileSync(join(FIX, "CarlitoCollection.ttc")));

  it("countFaces reports the collection size; a single .ttf is 1", () => {
    expect(countFaces(ttc)).toBe(2);
    expect(
      countFaces(
        new Uint8Array(readFileSync(join(FIX, "Carlito-Regular.ttf"))),
      ),
    ).toBe(1);
  });

  it("parses each face by faceIndex (0 = Regular, 1 = Bold)", () => {
    const f0 = parseFontFace(ttc, { faceIndex: 0 });
    const f1 = parseFontFace(ttc, { faceIndex: 1 });
    expect(f0.ok && f0.face.metadata.face.styleKey).toBe("regular");
    expect(f1.ok && f1.face.metadata.face.styleKey).toBe("bold");
    expect(f0.ok && f0.face.metadata.names.family).toBe("Carlito");
    expect(f1.ok && f1.face.metadata.collectionIndex).toBe(1);
  });

  it("defaults to face 0 and rejects an out-of-range faceIndex", () => {
    const def = parseFontFace(ttc);
    expect(def.ok && def.face.metadata.face.styleKey).toBe("regular");
    expect(parseFontFace(ttc, { faceIndex: 5 }).ok).toBe(false);
    expect(
      parseFontFace(
        new Uint8Array(readFileSync(join(FIX, "Carlito-Regular.ttf"))),
        { faceIndex: 1 },
      ).ok,
    ).toBe(false);
  });
});

describe("styleKey is the canonical substitution slot, not raw RIBBI bits", () => {
  // A collection where face 0 is the canonical Italic (weight 400) and face 1 is a Light Italic
  // (italic bit set, weight 300). styleKey must keep the Light face OUT of the "italic" slot, or a
  // measurement run would key both faces as `family|italic` and silently measure the Light one.
  const ttc = new Uint8Array(
    readFileSync(join(FIX, "CarlitoItalicWeightCollection.ttc")),
  );

  it("a non-canonical weight does not claim a RIBBI slot, even with the italic bit set", () => {
    const f0 = parseFontFace(ttc, { faceIndex: 0 });
    const f1 = parseFontFace(ttc, { faceIndex: 1 });
    expect(f0.ok && f0.face.metadata.face.weightClass).toBe(400);
    expect(f0.ok && f0.face.metadata.face.italic).toBe(true);
    expect(f0.ok && f0.face.metadata.face.styleKey).toBe("italic");
    // Light Italic: italic bit is set, but weight 300 is non-canonical -> "other", not "italic".
    expect(f1.ok && f1.face.metadata.face.weightClass).toBe(300);
    expect(f1.ok && f1.face.metadata.face.italic).toBe(true);
    expect(f1.ok && f1.face.metadata.face.styleKey).toBe("other");
  });
});

const FONT_DIR = join(
  import.meta.dir,
  "..",
  "..",
  "tests",
  "fixtures",
  "fonts",
);
const load = (file: string) =>
  parseFontFace(new Uint8Array(readFileSync(join(FONT_DIR, file))));

/**
 * Golden facts captured from the proven font-fidelity-research parser (harness/scripts/
 * font-metadata.js) on 2026-06-04. OPEN fonts only. These lock the TypeScript port to the JS
 * parser's behaviour, including its quirks: Roboto classifies as "unknown" (its OS/2 + name don't
 * resolve serif/sans), and Liberation Sans Narrow reports useTypoMetrics + condensed.
 */
interface Golden {
  file: string;
  family: string;
  subfamily: string;
  weightClass: number;
  widthClass: number;
  italic: boolean;
  bold: boolean;
  styleKey: StyleKey;
  useTypoMetrics: boolean;
  unitsPerEm: number;
  category: FontCategory;
  condensed: boolean;
  fixedPitch: boolean;
  cmapKind: CmapKind;
  fsType: string;
  covRatio: number;
  advHello16: number;
}

const GOLDEN: Golden[] = [
  {
    file: "Carlito-Regular.ttf",
    family: "Carlito",
    subfamily: "Regular",
    weightClass: 400,
    widthClass: 5,
    italic: false,
    bold: false,
    styleKey: "regular",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "sans",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 0.9942,
    advHello16: 77.656,
  },
  {
    file: "Carlito-Bold.ttf",
    family: "Carlito",
    subfamily: "Bold",
    weightClass: 700,
    widthClass: 5,
    italic: false,
    bold: true,
    styleKey: "bold",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "sans",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 0.9942,
    advHello16: 79.531,
  },
  {
    file: "Carlito-Italic.ttf",
    family: "Carlito",
    subfamily: "Italic",
    weightClass: 400,
    widthClass: 5,
    italic: true,
    bold: false,
    styleKey: "italic",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "sans",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 0.9942,
    advHello16: 76.617,
  },
  {
    file: "Carlito-BoldItalic.ttf",
    family: "Carlito",
    subfamily: "Bold Italic",
    weightClass: 700,
    widthClass: 5,
    italic: true,
    bold: true,
    styleKey: "boldItalic",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "sans",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 0.9942,
    advHello16: 78.82,
  },
  {
    file: "LiberationMono-Regular.ttf",
    family: "Liberation Mono",
    subfamily: "Regular",
    weightClass: 400,
    widthClass: 5,
    italic: false,
    bold: false,
    styleKey: "regular",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "mono",
    condensed: false,
    fixedPitch: true,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 1,
    advHello16: 105.617,
  },
  {
    file: "LiberationSansNarrow-Regular.ttf",
    family: "Liberation Sans Narrow",
    subfamily: "Regular",
    weightClass: 400,
    widthClass: 3,
    italic: false,
    bold: false,
    styleKey: "regular",
    useTypoMetrics: true,
    unitsPerEm: 2048,
    category: "sans",
    condensed: true,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 1,
    advHello16: 67.797,
  },
  {
    file: "LiberationSerif-Regular.ttf",
    family: "Liberation Serif",
    subfamily: "Regular",
    weightClass: 400,
    widthClass: 5,
    italic: false,
    bold: false,
    styleKey: "regular",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "serif",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 1,
    advHello16: 80.422,
  },
  {
    file: "Roboto-Regular.ttf",
    family: "Roboto",
    subfamily: "Regular",
    weightClass: 400,
    widthClass: 5,
    italic: false,
    bold: false,
    styleKey: "regular",
    useTypoMetrics: false,
    unitsPerEm: 2048,
    category: "unknown",
    condensed: false,
    fixedPitch: false,
    cmapKind: "unicode",
    fsType: "installable",
    covRatio: 1,
    advHello16: 82.43,
  },
];

describe("parseFontFace golden parity (vs proven JS parser)", () => {
  for (const g of GOLDEN) {
    it(g.file, () => {
      const r = load(g.file);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const m = r.face.metadata;
      expect(m.names.family).toBe(g.family);
      expect(m.names.subfamily).toBe(g.subfamily);
      expect(m.face.weightClass).toBe(g.weightClass);
      expect(m.face.widthClass).toBe(g.widthClass);
      expect(m.face.italic).toBe(g.italic);
      expect(m.face.bold).toBe(g.bold);
      expect(m.face.styleKey).toBe(g.styleKey);
      expect(m.metrics.unitsPerEm).toBe(g.unitsPerEm);
      expect(m.metrics.useTypoMetrics).toBe(g.useTypoMetrics);
      expect(m.metrics.fixedPitch).toBe(g.fixedPitch);
      expect(m.classification.category).toBe(g.category);
      expect(m.classification.condensed).toBe(g.condensed);
      expect(m.coverage.cmapKind).toBe(g.cmapKind);
      expect(m.coverage.latinCoreRatio).toBeCloseTo(g.covRatio, 3);
      expect(m.embedding.fsTypeSummary).toBe(g.fsType);
      const adv = advanceOfString(r.face, "Hello World", 16);
      expect(adv).not.toBeNull();
      expect(adv as number).toBeCloseTo(g.advHello16, 2);
    });
  }
});

describe("font-metadata APIs", () => {
  it("coverage() over LATIN_CORE matches metadata.latinCoreRatio", () => {
    const r = load("Carlito-Regular.ttf");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cov = coverage(r.face, LATIN_CORE);
    expect(cov.total).toBe(LATIN_CORE.length);
    expect(cov.ratio).toBeCloseTo(r.face.metadata.coverage.latinCoreRatio, 6);
  });

  it("advances differ per face (no faux-styling assumption)", () => {
    const reg = load("Carlito-Regular.ttf");
    const bold = load("Carlito-Bold.ttf");
    expect(reg.ok && bold.ok).toBe(true);
    if (!reg.ok || !bold.ok) return;
    const a = advanceOfString(reg.face, "Hello World", 16) as number;
    const b = advanceOfString(bold.face, "Hello World", 16) as number;
    expect(a).not.toBeCloseTo(b, 2);
  });

  it("rejects woff2 bytes", () => {
    const woff2 = new Uint8Array([
      0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0, 0, 0, 0, 0,
    ]); // "wOF2"
    expect(parseFontFace(woff2).ok).toBe(false);
  });

  it("rejects too-short input", () => {
    expect(parseFontFace(new Uint8Array([0, 1, 2])).ok).toBe(false);
  });

  it("fileSha256 from options flows into metadata; sha256Hex is stable + 64 hex chars", async () => {
    const bytes = new Uint8Array(
      readFileSync(join(FONT_DIR, "Carlito-Regular.ttf")),
    );
    const sha = await sha256Hex(bytes);
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(bytes)).toBe(sha);
    const r = parseFontFace(bytes, { fileSha256: sha });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.face.metadata.fileSha256).toBe(sha);
  });
});

import { describe, expect, test } from "bun:test";
import {
  classifyTier,
  type FontMetrics,
  LATIN_SAMPLE,
  parseFont,
  renderReport,
  sampleMetrics,
  scoreAdvances,
} from "./scripts/compare";

// --- Synthetic SFNT builder -------------------------------------------------
//
// Assemble a minimal valid TrueType font with the five tables the parser reads (head, maxp, hhea,
// hmtx, cmap). Four glyphs: gid0 .notdef, gid1..3 advances 600/300/750 over a 1000 unit em. The
// format-4 cmap maps space -> gid3, 'A' -> gid1, 'B' -> gid2.

const UNITS_PER_EM = 1000;
const ADVANCES = [500, 600, 300, 750]; // by glyph id

function u16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}
function i16(value: number): number[] {
  return u16(value & 0xffff);
}
function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}
function tag(name: string): number[] {
  return [...name].map((c) => c.charCodeAt(0));
}

function headTable(): number[] {
  return [
    ...u32(0x00010000), // version
    ...u32(0), // fontRevision
    ...u32(0), // checkSumAdjustment
    ...u32(0x5f0f3cf5), // magicNumber
    ...u16(0), // flags
    ...u16(UNITS_PER_EM), // unitsPerEm @ offset 18
    ...u32(0),
    ...u32(0), // created
    ...u32(0),
    ...u32(0), // modified
    ...i16(0),
    ...i16(0),
    ...i16(0),
    ...i16(0), // bbox
    ...u16(0), // macStyle
    ...u16(8), // lowestRecPPEM
    ...i16(0), // fontDirectionHint
    ...i16(0), // indexToLocFormat
    ...i16(0), // glyphDataFormat
  ];
}

function maxpTable(numGlyphs: number): number[] {
  return [...u32(0x00005000), ...u16(numGlyphs)]; // version 0.5
}

function hheaTable(numberOfHMetrics: number): number[] {
  const bytes = new Array(36).fill(0);
  bytes.splice(0, 4, ...u32(0x00010000)); // version
  bytes.splice(34, 2, ...u16(numberOfHMetrics)); // numberOfHMetrics @ offset 34
  return bytes;
}

function hmtxTable(): number[] {
  return ADVANCES.flatMap((advance) => [...u16(advance), ...i16(0)]);
}

function cmapFormat4(): number[] {
  // Segments: [0x20,0x20]->gid3, [0x41,0x42]->gid1..2, [0xFFFF,0xFFFF] sentinel.
  const endCodes = [0x20, 0x42, 0xffff];
  const startCodes = [0x20, 0x41, 0xffff];
  const idDeltas = [(3 - 0x20) & 0xffff, (1 - 0x41) & 0xffff, 1];
  const idRangeOffsets = [0, 0, 0];
  const segCount = endCodes.length;
  const segX2 = segCount * 2;
  const sub = [
    ...u16(4), // format
    ...u16(14 + segX2 * 4 + 2), // length
    ...u16(0), // language
    ...u16(segX2), // segCountX2
    ...u16(4), // searchRange
    ...u16(1), // entrySelector
    ...u16(2), // rangeShift
    ...endCodes.flatMap(u16),
    ...u16(0), // reservedPad
    ...startCodes.flatMap(u16),
    ...idDeltas.flatMap(i16),
    ...idRangeOffsets.flatMap(u16),
  ];
  const header = [
    ...u16(0), // version
    ...u16(1), // numTables
    ...u16(3), // platformID (Windows)
    ...u16(1), // encodingID (BMP)
    ...u32(12), // subtable offset
  ];
  return [...header, ...sub];
}

/** Same format-4 data, but advertised under a non-Unicode (Macintosh) platform/encoding. */
function cmapMacintoshOnly(): number[] {
  const sub = cmapFormat4().slice(12); // drop the Windows header, keep the subtable bytes
  const header = [
    ...u16(0), // version
    ...u16(1), // numTables
    ...u16(1), // platformID (Macintosh)
    ...u16(0), // encodingID (Roman)
    ...u32(12), // subtable offset
  ];
  return [...header, ...sub];
}

function buildFont(tables: { name: string; data: number[] }[]): Uint8Array {
  const numTables = tables.length;
  const headerSize = 12 + numTables * 16;
  let offset = headerSize;
  const placed = tables.map((t) => {
    const at = offset;
    offset += t.data.length;
    offset = (offset + 3) & ~3; // 4-byte align
    return { ...t, offset: at };
  });

  const header = [
    ...u32(0x00010000), // sfntVersion
    ...u16(numTables),
    ...u16(0), // searchRange
    ...u16(0), // entrySelector
    ...u16(0), // rangeShift
  ];
  const directory = placed.flatMap((t) => [
    ...tag(t.name),
    ...u32(0), // checksum (ignored)
    ...u32(t.offset),
    ...u32(t.data.length),
  ]);

  const bytes = new Uint8Array(offset);
  bytes.set([...header, ...directory], 0);
  for (const t of placed) bytes.set(t.data, t.offset);
  return bytes;
}

function syntheticFont(): Uint8Array {
  return buildFont([
    { name: "cmap", data: cmapFormat4() },
    { name: "head", data: headTable() },
    { name: "hhea", data: hheaTable(ADVANCES.length) },
    { name: "hmtx", data: hmtxTable() },
    { name: "maxp", data: maxpTable(ADVANCES.length) },
  ]);
}

// --- Latin sample -----------------------------------------------------------

describe("LATIN_SAMPLE", () => {
  test("covers printable ASCII and is sorted and unique", () => {
    expect(LATIN_SAMPLE).toContain(0x20); // space
    expect(LATIN_SAMPLE).toContain(0x7e); // tilde
    expect(LATIN_SAMPLE).toContain(0x41); // 'A'
    for (let cp = 0x20; cp <= 0x7e; cp++) expect(LATIN_SAMPLE).toContain(cp);
    expect(new Set(LATIN_SAMPLE).size).toBe(LATIN_SAMPLE.length);
    expect([...LATIN_SAMPLE]).toEqual([...LATIN_SAMPLE].sort((a, b) => a - b));
  });

  test("includes common Latin-1 and General Punctuation marks", () => {
    expect(LATIN_SAMPLE).toContain(0x00c0); // A with grave
    expect(LATIN_SAMPLE).toContain(0x00e9); // e with acute
    expect(LATIN_SAMPLE).toContain(0x00a7); // section sign
    expect(LATIN_SAMPLE).toContain(0x00bf); // inverted question
    expect(LATIN_SAMPLE).toContain(0x2014); // em dash codepoint
    expect(LATIN_SAMPLE).toContain(0x20ac); // euro
    expect(LATIN_SAMPLE).not.toContain(0x00ad); // soft hyphen is not a visible glyph
  });
});

// --- Tiers ------------------------------------------------------------------

describe("classifyTier", () => {
  test("matches the verdict thresholds at the boundaries", () => {
    expect(classifyTier(0.005, 0.01)).toBe("metric_safe");
    expect(classifyTier(0.0051, 0.01)).toBe("near_metric");
    expect(classifyTier(0.005, 0.011)).toBe("near_metric");
    expect(classifyTier(0.01, 0.025)).toBe("near_metric");
    expect(classifyTier(0.0101, 0.025)).toBe("visual_only");
    expect(classifyTier(0.01, 0.026)).toBe("visual_only");
    expect(classifyTier(0, 0)).toBe("metric_safe");
  });
});

// --- Scoring ----------------------------------------------------------------

describe("scoreAdvances", () => {
  const sample = [0x41, 0x42, 0x43];

  test("compares only shared codepoints and reports coverage", () => {
    const reference = new Map([
      [0x41, 0.5],
      [0x42, 0.6],
      [0x43, 0.7],
    ]);
    const candidate = new Map([
      [0x41, 0.5],
      [0x42, 0.6],
      // 0x43 unmapped by candidate
    ]);
    const score = scoreAdvances(reference, candidate, sample);
    expect(score.compared).toBe(2);
    expect(score.total).toBe(3);
    expect(score.missing).toBe(1);
    expect(score.meanDelta).toBe(0);
    expect(score.maxDelta).toBe(0);
    expect(score.over1Percent).toBe(0);
    expect(score.over2_5Percent).toBe(0);
    expect(score.tier).toBe("metric_safe");
    expect(score.worstGlyphs).toEqual([]);
  });

  test("computes mean and max deltas and worst glyphs", () => {
    const reference = new Map([
      [0x41, 0.5],
      [0x42, 0.5],
      [0x43, 0.5],
    ]);
    const candidate = new Map([
      [0x41, 0.5], // delta 0
      [0x42, 0.52], // delta 0.02
      [0x43, 0.56], // delta 0.06
    ]);
    const score = scoreAdvances(reference, candidate, sample);
    expect(score.compared).toBe(3);
    expect(score.maxDelta).toBeCloseTo(0.06, 10);
    expect(score.meanDelta).toBeCloseTo((0 + 0.02 + 0.06) / 3, 10);
    expect(score.over1Percent).toBe(2);
    expect(score.over2_5Percent).toBe(1);
    expect(score.tier).toBe("visual_only");
    expect(score.worstGlyphs.map((g) => g.codepoint)).toEqual([0x43, 0x42]);
  });

  test("reports the floor tier when nothing overlaps", () => {
    const score = scoreAdvances(new Map([[0x41, 0.5]]), new Map(), sample);
    expect(score.compared).toBe(0);
    expect(score.tier).toBe("visual_only");
    expect(Number.isNaN(score.meanDelta)).toBe(true);
    expect(Number.isNaN(score.maxDelta)).toBe(true);
  });
});

// --- SFNT parsing -----------------------------------------------------------

describe("parseFont", () => {
  test("reads unitsPerEm and normalized advances from a synthetic SFNT", () => {
    const font = parseFont(syntheticFont());
    expect(font.unitsPerEm).toBe(UNITS_PER_EM);
    expect(font.normalizedAdvance(0x41)).toBeCloseTo(600 / 1000, 10); // 'A' -> gid1
    expect(font.normalizedAdvance(0x42)).toBeCloseTo(300 / 1000, 10); // 'B' -> gid2
    expect(font.normalizedAdvance(0x20)).toBeCloseTo(750 / 1000, 10); // space -> gid3
    expect(font.normalizedAdvance(0x43)).toBeUndefined(); // 'C' unmapped
  });

  test("sampleMetrics + scoreAdvances against itself is identical", () => {
    const font = parseFont(syntheticFont());
    const metrics = sampleMetrics(font, [0x20, 0x41, 0x42]);
    const score = scoreAdvances(metrics, metrics, [0x20, 0x41, 0x42]);
    expect(score.compared).toBe(3);
    expect(score.meanDelta).toBe(0);
    expect(score.tier).toBe("metric_safe");
  });

  test("throws on a missing required table", () => {
    const noCmap = buildFont([
      { name: "head", data: headTable() },
      { name: "hhea", data: hheaTable(ADVANCES.length) },
      { name: "hmtx", data: hmtxTable() },
      { name: "maxp", data: maxpTable(ADVANCES.length) },
    ]);
    expect(() => parseFont(noCmap)).toThrow(/missing required table/);
  });

  test("throws on a font collection container", () => {
    const ttcf = new Uint8Array([...u32(0x74746366), ...u32(0), ...u32(0)]);
    expect(() => parseFont(ttcf)).toThrow(/collection/);
  });

  test("throws on bytes that are not an SFNT", () => {
    expect(() => parseFont(new Uint8Array([1, 2, 3, 4]))).toThrow(/too small/);
    expect(() =>
      parseFont(new Uint8Array([...u32(0xdeadbeef), ...u32(0), ...u32(0)])),
    ).toThrow(/not an SFNT/);
  });

  test("throws when the only cmap subtable is non-Unicode", () => {
    const macOnly = buildFont([
      { name: "cmap", data: cmapMacintoshOnly() },
      { name: "head", data: headTable() },
      { name: "hhea", data: hheaTable(ADVANCES.length) },
      { name: "hmtx", data: hmtxTable() },
      { name: "maxp", data: maxpTable(ADVANCES.length) },
    ]);
    expect(() => parseFont(macOnly)).toThrow(/no readable Unicode cmap/);
  });
});

// --- Report -----------------------------------------------------------------

describe("renderReport", () => {
  const mockFont = (advance: number): FontMetrics => ({
    unitsPerEm: 1000,
    normalizedAdvance: () => advance,
  });
  /** A font that maps only `mapped`, with a constant advance, so we can force a missing count. */
  const partialFont = (advance: number, mapped: number[]): FontMetrics => ({
    unitsPerEm: 1000,
    normalizedAdvance: (cp) => (mapped.includes(cp) ? advance : undefined),
  });

  test("ranks metric_safe above visual_only and includes the columns", () => {
    const reference = sampleMetrics(mockFont(0.5), [0x41]);
    const close = scoreAdvances(
      reference,
      sampleMetrics(mockFont(0.5), [0x41]),
      [0x41],
    );
    const far = scoreAdvances(
      reference,
      sampleMetrics(mockFont(0.7), [0x41]),
      [0x41],
    );
    const report = renderReport([
      { sourceId: "far-src", file: "far.otf", score: far },
      { sourceId: "near-src", file: "near.otf", score: close },
    ]);
    const lines = report.split("\n");
    expect(lines[0]).toContain("source");
    expect(lines[0]).toContain("coverage");
    expect(lines[0]).toContain("missing");
    expect(lines[0]).toContain("over1");
    expect(lines[0]).toContain("over2.5");
    expect(lines[0]).toContain("worst");
    // metric_safe row sorts first.
    expect(lines[1]).toContain("near-src");
    expect(lines[1]).toContain("metric_safe");
    expect(lines[2]).toContain("far-src");
    expect(lines[2]).toContain("visual_only");
  });

  test("can limit the rendered table to the top rows", () => {
    const reference = sampleMetrics(mockFont(0.5), [0x41]);
    const close = scoreAdvances(
      reference,
      sampleMetrics(mockFont(0.5), [0x41]),
      [0x41],
    );
    const far = scoreAdvances(
      reference,
      sampleMetrics(mockFont(0.7), [0x41]),
      [0x41],
    );
    const report = renderReport(
      [
        { sourceId: "far-src", file: "far.otf", score: far },
        { sourceId: "near-src", file: "near.otf", score: close },
      ],
      { limit: 1 },
    );
    expect(report.split("\n")).toHaveLength(2);
    expect(report).toContain("near-src");
    expect(report).not.toContain("far-src");
  });

  test("prints coverage and the missing count", () => {
    const sample = [0x41, 0x42, 0x43];
    const reference = sampleMetrics(mockFont(0.5), sample);
    // Candidate maps only 0x41 and 0x42, so one sample codepoint is missing.
    const score = scoreAdvances(
      reference,
      sampleMetrics(partialFont(0.5, [0x41, 0x42]), sample),
      sample,
    );
    expect(score.compared).toBe(2);
    expect(score.missing).toBe(1);
    const report = renderReport([{ sourceId: "src", file: "c.otf", score }]);
    const headers = report.split("\n")[0].split(/\s+/);
    const row = report.split("\n")[1].split(/\s+/);
    expect(row[headers.indexOf("coverage")]).toBe("2/3");
    expect(row[headers.indexOf("missing")]).toBe("1");
    expect(row[headers.indexOf("over1")]).toBe("0");
    expect(row[headers.indexOf("over2.5")]).toBe("0");
  });
});

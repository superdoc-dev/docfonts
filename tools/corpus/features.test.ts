import { describe, expect, test } from "bun:test";
import {
  type FontFeatures,
  featureDistance,
  parseFeatures,
  renderReport,
  scoreAdvances,
} from "./compare";

// --- Synthetic SFNT builder -------------------------------------------------
//
// `parseFeatures` only needs `openFont` to validate the container, which reads head.unitsPerEm and
// checks that the five required tables exist. It never parses cmap/hmtx here, so those tables can be
// empty stubs. We attach configurable OS/2 and post tables to exercise the feature reader.

const UNITS_PER_EM = 1000;

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
function writeI16(bytes: number[], at: number, value: number): void {
  const [hi, lo] = i16(value);
  bytes[at] = hi;
  bytes[at + 1] = lo;
}

function headTable(): number[] {
  const bytes = new Array(54).fill(0);
  bytes.splice(0, 4, ...u32(0x00010000)); // version
  bytes.splice(18, 2, ...u16(UNITS_PER_EM)); // unitsPerEm @ offset 18
  return bytes;
}

interface Os2Spec {
  version: number;
  weightClass?: number;
  widthClass?: number;
  panose?: number[];
  sxHeight?: number;
  sCapHeight?: number;
}

/** Build an OS/2 table whose length matches the requested version, with the given fields set. */
function os2Table(spec: Os2Spec): number[] {
  const length = spec.version >= 2 ? 96 : spec.version === 1 ? 86 : 78;
  const bytes = new Array(length).fill(0);
  writeI16(bytes, 0, spec.version);
  if (spec.weightClass !== undefined) writeI16(bytes, 4, spec.weightClass);
  if (spec.widthClass !== undefined) writeI16(bytes, 6, spec.widthClass);
  if (spec.panose) for (let i = 0; i < 10; i++) bytes[32 + i] = spec.panose[i];
  if (spec.version >= 2) {
    if (spec.sxHeight !== undefined) writeI16(bytes, 86, spec.sxHeight);
    if (spec.sCapHeight !== undefined) writeI16(bytes, 88, spec.sCapHeight);
  }
  return bytes;
}

/** Build a post table (version 3.0) with the given italicAngle in degrees (16.16 fixed). */
function postTable(italicAngleDegrees: number): number[] {
  const bytes = new Array(32).fill(0);
  bytes.splice(0, 4, ...u32(0x00030000)); // version 3.0
  bytes.splice(4, 4, ...u32((italicAngleDegrees * 0x10000) & 0xffffffff)); // italicAngle @ 4
  return bytes;
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
    ...u16(0),
    ...u16(0),
    ...u16(0),
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

/** A minimal valid SFNT plus the optional tables a caller wants to test. */
function fontWith(extra: { name: string; data: number[] }[]): Uint8Array {
  return buildFont([
    { name: "cmap", data: [0, 0] },
    { name: "head", data: headTable() },
    { name: "hhea", data: new Array(36).fill(0) },
    { name: "hmtx", data: [0, 0, 0, 0] },
    { name: "maxp", data: [...u32(0x00005000), ...u16(1)] },
    ...extra,
  ]);
}

// --- OS/2 parsing -----------------------------------------------------------

describe("parseFeatures OS/2", () => {
  test("reads weight class and width class", () => {
    const features = parseFeatures(
      fontWith([
        {
          name: "OS/2",
          data: os2Table({ version: 4, weightClass: 700, widthClass: 5 }),
        },
      ]),
    );
    expect(features.weightClass).toBe(700);
    expect(features.widthClass).toBe(5);
  });

  test("treats an all-zero PANOSE as unset", () => {
    const features = parseFeatures(
      fontWith([
        {
          name: "OS/2",
          data: os2Table({
            version: 4,
            panose: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          }),
        },
      ]),
    );
    expect(features.panose).toBeUndefined();
  });

  test("treats a family-byte-only PANOSE [2,0,...] as unset", () => {
    const features = parseFeatures(
      fontWith([
        {
          name: "OS/2",
          data: os2Table({
            version: 4,
            panose: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          }),
        },
      ]),
    );
    expect(features.panose).toBeUndefined();
  });

  test("keeps a PANOSE with real style data", () => {
    const panose = [2, 11, 6, 4, 2, 2, 2, 2, 2, 4];
    const features = parseFeatures(
      fontWith([{ name: "OS/2", data: os2Table({ version: 4, panose }) }]),
    );
    expect(features.panose).toEqual(panose);
  });

  test("normalizes positive sxHeight and sCapHeight by unitsPerEm", () => {
    const features = parseFeatures(
      fontWith([
        {
          name: "OS/2",
          data: os2Table({ version: 2, sxHeight: 520, sCapHeight: 700 }),
        },
      ]),
    );
    expect(features.xHeight).toBeCloseTo(520 / UNITS_PER_EM, 10);
    expect(features.capHeight).toBeCloseTo(700 / UNITS_PER_EM, 10);
  });

  test("treats zero heights as unset", () => {
    const features = parseFeatures(
      fontWith([
        {
          name: "OS/2",
          data: os2Table({ version: 2, sxHeight: 0, sCapHeight: 0 }),
        },
      ]),
    );
    expect(features.xHeight).toBeUndefined();
    expect(features.capHeight).toBeUndefined();
  });

  test("treats an old OS/2 without height fields as missing heights", () => {
    // Version 0 has no sxHeight/sCapHeight fields at all.
    const features = parseFeatures(
      fontWith([
        { name: "OS/2", data: os2Table({ version: 0, weightClass: 400 }) },
      ]),
    );
    expect(features.weightClass).toBe(400);
    expect(features.xHeight).toBeUndefined();
    expect(features.capHeight).toBeUndefined();
  });

  test("leaves every OS/2 feature unset when the table is absent", () => {
    const features = parseFeatures(fontWith([]));
    expect(features.weightClass).toBeUndefined();
    expect(features.widthClass).toBeUndefined();
    expect(features.xHeight).toBeUndefined();
    expect(features.capHeight).toBeUndefined();
    expect(features.panose).toBeUndefined();
  });
});

// --- post parsing -----------------------------------------------------------

describe("parseFeatures post", () => {
  test("reads a slanted italic angle", () => {
    const features = parseFeatures(
      fontWith([{ name: "post", data: postTable(-12) }]),
    );
    expect(features.italicAngle).toBeCloseTo(-12, 10);
  });

  test("reads an upright zero angle as real data, not missing", () => {
    const features = parseFeatures(
      fontWith([{ name: "post", data: postTable(0) }]),
    );
    expect(features.italicAngle).toBe(0);
  });

  test("leaves italic angle unset when post is absent", () => {
    const features = parseFeatures(fontWith([]));
    expect(features.italicAngle).toBeUndefined();
  });
});

// --- Feature distance -------------------------------------------------------

describe("featureDistance", () => {
  const reference: FontFeatures = {
    weightClass: 400,
    widthClass: 5,
    xHeight: 0.5,
    capHeight: 0.7,
    italicAngle: 0,
    panose: [2, 11, 6, 4, 2, 2, 2, 2, 2, 4],
  };

  test("is zero for identical features and counts all of them", () => {
    const result = featureDistance(reference, reference);
    expect(result.score).toBe(0);
    expect(result.compared).toBe(6);
    expect(result.missing).toBe(0);
    expect(result.total).toBe(6);
    expect(result.gaps).toEqual([]);
  });

  test("skips features the candidate does not declare", () => {
    const candidate: FontFeatures = { weightClass: 400, xHeight: 0.5 };
    const result = featureDistance(reference, candidate);
    expect(result.compared).toBe(2);
    expect(result.missing).toBe(4);
    expect(result.score).toBe(0); // both compared features match exactly
    expect(result.gaps).toEqual([]);
  });

  test("returns NaN and zero coverage when nothing overlaps", () => {
    const result = featureDistance(reference, {});
    expect(Number.isNaN(result.score)).toBe(true);
    expect(result.compared).toBe(0);
    expect(result.missing).toBe(6);
    expect(result.gaps).toEqual([]);
  });

  test("grows with divergence and stays in [0, 1]", () => {
    const far: FontFeatures = {
      weightClass: 900,
      widthClass: 9,
      xHeight: 0.3,
      capHeight: 0.9,
      italicAngle: -30,
      panose: [5, 2, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const result = featureDistance(reference, far);
    expect(result.compared).toBe(6);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  test("reports large per-feature gaps for manual review", () => {
    const result = featureDistance(reference, {
      ...reference,
      weightClass: 500,
    });
    expect(result.gaps).toEqual([{ feature: "weight", distance: 0.1 }]);
  });
});

// --- Report ordering on feature distance ------------------------------------

describe("renderReport feature ordering", () => {
  test("orders fuller feature evidence before thinner feature evidence", () => {
    const reference = new Map([[0x41, 0.5]]);
    const score = scoreAdvances(reference, new Map([[0x41, 0.5]]), [0x41]);
    const thinExactFeature = {
      score: 0,
      compared: 1,
      missing: 5,
      total: 6,
      gaps: [],
    };
    const fullerFeature = {
      score: 0.2,
      compared: 5,
      missing: 1,
      total: 6,
      gaps: [],
    };

    const report = renderReport([
      {
        sourceId: "thin-exact",
        file: "thin.otf",
        score,
        feature: thinExactFeature,
      },
      {
        sourceId: "fuller",
        file: "fuller.otf",
        score,
        feature: fullerFeature,
      },
    ]);
    const lines = report.split("\n");
    expect(lines[1]).toContain("fuller");
    expect(lines[2]).toContain("thin-exact");
  });

  test("orders by feature distance within the same advance tier and coverage", () => {
    // Identical advance scores (same tier, coverage, mean), so feature distance is the only tiebreaker.
    const reference = new Map([[0x41, 0.5]]);
    const score = scoreAdvances(reference, new Map([[0x41, 0.5]]), [0x41]);
    expect(score.tier).toBe("metric_safe");

    const closeFeature = {
      score: 0.1,
      compared: 6,
      missing: 0,
      total: 6,
      gaps: [],
    };
    const farFeature = {
      score: 0.4,
      compared: 6,
      missing: 0,
      total: 6,
      gaps: [],
    };

    const report = renderReport([
      { sourceId: "far-src", file: "far.otf", score, feature: farFeature },
      {
        sourceId: "close-src",
        file: "close.otf",
        score,
        feature: closeFeature,
      },
    ]);
    const lines = report.split("\n");
    expect(lines[0]).toContain("fscore");
    expect(lines[0]).toContain("fcov");
    expect(lines[0]).toContain("flags");
    expect(lines[1]).toContain("close-src");
    expect(lines[2]).toContain("far-src");
  });

  test("sinks rows with no comparable features below rows that have them", () => {
    const reference = new Map([[0x41, 0.5]]);
    const score = scoreAdvances(reference, new Map([[0x41, 0.5]]), [0x41]);
    const withFeature = {
      score: 0.4,
      compared: 3,
      missing: 3,
      total: 6,
      gaps: [],
    };

    const report = renderReport([
      { sourceId: "no-feature", file: "a.otf", score },
      { sourceId: "has-feature", file: "b.otf", score, feature: withFeature },
    ]);
    const lines = report.split("\n");
    expect(lines[1]).toContain("has-feature");
    expect(lines[2]).toContain("no-feature");
  });

  test("flags strong advance rows whose features disagree", () => {
    const reference = new Map([[0x41, 0.5]]);
    const score = scoreAdvances(reference, new Map([[0x41, 0.5]]), [0x41]);
    const feature = {
      score: 0.2,
      compared: 6,
      missing: 0,
      total: 6,
      gaps: [{ feature: "weight" as const, distance: 0.1 }],
    };

    const report = renderReport([
      { sourceId: "weight-gap", file: "a.otf", score, feature },
    ]);
    const lines = report.split("\n");
    expect(lines[0]).toContain("flags");
    expect(lines[1]).toContain("weight_gap");
  });

  test("does not flag weak visual-only rows", () => {
    const reference = new Map([[0x41, 0.5]]);
    const score = scoreAdvances(reference, new Map([[0x41, 0.9]]), [0x41]);
    expect(score.tier).toBe("visual_only");
    const feature = {
      score: 0.2,
      compared: 6,
      missing: 0,
      total: 6,
      gaps: [{ feature: "weight" as const, distance: 0.1 }],
    };

    const report = renderReport([
      { sourceId: "visual-row", file: "a.otf", score, feature },
    ]);
    const lines = report.split("\n");
    expect(lines[1]).toContain(" - ");
    expect(lines[1]).not.toContain("weight_gap");
  });
});

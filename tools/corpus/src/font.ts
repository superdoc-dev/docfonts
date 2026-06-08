import { LATIN_SAMPLE } from "./samples";

const REQUIRED_TABLES = ["head", "maxp", "hhea", "hmtx", "cmap"] as const;

/** A parsed font's em size plus a normalized advance lookup over its Unicode `cmap`. */
export interface FontMetrics {
  unitsPerEm: number;
  /** Advance width of a codepoint as a fraction of the em, or undefined when the font does not map it. */
  normalizedAdvance(codepoint: number): number | undefined;
}

function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/** Resolve a codepoint to a glyph id within one `cmap` subtable, for the formats we support (4, 6, 12). */
function makeCmapLookup(
  view: DataView,
  subOffset: number,
): (codepoint: number) => number | undefined {
  const format = view.getUint16(subOffset);

  if (format === 4) {
    const segX2 = view.getUint16(subOffset + 6);
    const segCount = segX2 / 2;
    const endOffset = subOffset + 14;
    const startOffset = endOffset + segX2 + 2; // skip reservedPad
    const deltaOffset = startOffset + segX2;
    const rangeOffsetBase = deltaOffset + segX2;
    return (cp) => {
      if (cp > 0xffff) return undefined;
      for (let i = 0; i < segCount; i++) {
        const end = view.getUint16(endOffset + i * 2);
        if (cp > end) continue;
        const start = view.getUint16(startOffset + i * 2);
        if (cp < start) return undefined;
        const delta = view.getInt16(deltaOffset + i * 2);
        const rangeOffset = view.getUint16(rangeOffsetBase + i * 2);
        if (rangeOffset === 0) {
          const gid = (cp + delta) & 0xffff;
          return gid === 0 ? undefined : gid;
        }
        const glyphOffset =
          rangeOffsetBase + i * 2 + rangeOffset + (cp - start) * 2;
        const raw = view.getUint16(glyphOffset);
        if (raw === 0) return undefined;
        const gid = (raw + delta) & 0xffff;
        return gid === 0 ? undefined : gid;
      }
      return undefined;
    };
  }

  if (format === 6) {
    const firstCode = view.getUint16(subOffset + 6);
    const entryCount = view.getUint16(subOffset + 8);
    return (cp) => {
      if (cp < firstCode || cp >= firstCode + entryCount) return undefined;
      const gid = view.getUint16(subOffset + 10 + (cp - firstCode) * 2);
      return gid === 0 ? undefined : gid;
    };
  }

  if (format === 12) {
    const numGroups = view.getUint32(subOffset + 12);
    const groupsOffset = subOffset + 16;
    return (cp) => {
      let lo = 0;
      let hi = numGroups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const g = groupsOffset + mid * 12;
        const start = view.getUint32(g);
        const end = view.getUint32(g + 4);
        if (cp < start) hi = mid - 1;
        else if (cp > end) lo = mid + 1;
        else {
          const gid = view.getUint32(g + 8) + (cp - start);
          return gid === 0 ? undefined : gid;
        }
      }
      return undefined;
    };
  }

  throw new Error(`unsupported cmap subtable format: ${format}`);
}

/** Pick the best Unicode `cmap` subtable and return its glyph lookup. */
function readCmap(
  view: DataView,
  cmapOffset: number,
): (codepoint: number) => number | undefined {
  const numSubtables = view.getUint16(cmapOffset + 2);
  const candidates: { score: number; offset: number }[] = [];
  for (let i = 0; i < numSubtables; i++) {
    const recordOffset = cmapOffset + 4 + i * 8;
    const platformId = view.getUint16(recordOffset);
    const encodingId = view.getUint16(recordOffset + 2);
    const score = cmapPreference(platformId, encodingId);
    if (score === null) continue;
    candidates.push({
      score,
      offset: cmapOffset + view.getUint32(recordOffset + 4),
    });
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    const format = view.getUint16(candidate.offset);
    if (format === 4 || format === 6 || format === 12)
      return makeCmapLookup(view, candidate.offset);
  }
  throw new Error("unsupported font: no readable Unicode cmap subtable");
}

/** Rank Unicode `cmap` subtables (full Unicode first, then BMP); null for non-Unicode subtables. */
function cmapPreference(platformId: number, encodingId: number): number | null {
  if (platformId === 3 && encodingId === 10) return 4; // Windows Unicode UCS-4
  if (platformId === 0 && (encodingId === 4 || encodingId === 6)) return 3; // Unicode full
  if (platformId === 3 && encodingId === 1) return 2; // Windows Unicode BMP
  if (platformId === 0) return 1; // Unicode BMP and earlier
  return null; // Macintosh, Windows symbol, and anything else: not a Unicode cmap
}

/**
 * Parse just enough of an SFNT font (TrueType or CFF/OTF) to read normalized advance widths by
 * codepoint. Throws an explicit error when the container is a collection or a required table is missing.
 */
export function parseFont(bytes: Uint8Array): FontMetrics {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12)
    throw new Error("unsupported font: file is too small to be an SFNT");

  const sfntVersion = view.getUint32(0);
  if (sfntVersion === 0x74746366)
    throw new Error("unsupported font: TrueType/OpenType collections (ttcf)");
  const isSfnt =
    sfntVersion === 0x00010000 ||
    sfntVersion === 0x4f54544f ||
    sfntVersion === 0x74727565;
  if (!isSfnt)
    throw new Error(
      `unsupported font: not an SFNT (sfntVersion 0x${sfntVersion.toString(16)})`,
    );

  const numTables = view.getUint16(4);
  const tables = new Map<string, number>();
  for (let i = 0; i < numTables; i++) {
    const recordOffset = 12 + i * 16;
    tables.set(tagAt(view, recordOffset), view.getUint32(recordOffset + 8));
  }

  const missing = REQUIRED_TABLES.filter((tag) => !tables.has(tag));
  if (missing.length > 0)
    throw new Error(
      `unsupported font: missing required table(s): ${missing.join(", ")}`,
    );

  const headOffset = tables.get("head") as number;
  const unitsPerEm = view.getUint16(headOffset + 18);
  if (unitsPerEm === 0)
    throw new Error("unsupported font: head.unitsPerEm is zero");

  const numberOfHMetrics = view.getUint16((tables.get("hhea") as number) + 34);
  if (numberOfHMetrics === 0)
    throw new Error("unsupported font: hhea.numberOfHMetrics is zero");

  const hmtxOffset = tables.get("hmtx") as number;
  const advanceOfGlyph = (glyphId: number): number => {
    const index = glyphId < numberOfHMetrics ? glyphId : numberOfHMetrics - 1;
    return view.getUint16(hmtxOffset + index * 4);
  };

  const lookup = readCmap(view, tables.get("cmap") as number);

  return {
    unitsPerEm,
    normalizedAdvance(codepoint: number): number | undefined {
      const glyphId = lookup(codepoint);
      if (glyphId === undefined) return undefined;
      return advanceOfGlyph(glyphId) / unitsPerEm;
    },
  };
}

/** Build a font's normalized-advance map over the sample (only codepoints it maps are included). */
export function sampleMetrics(
  font: FontMetrics,
  sample: readonly number[] = LATIN_SAMPLE,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const cp of sample) {
    const advance = font.normalizedAdvance(cp);
    if (advance !== undefined) map.set(cp, advance);
  }
  return map;
}

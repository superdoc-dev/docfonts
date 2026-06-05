/**
 * @docfonts/font-metadata - SFNT (TTF/OTF/TTC) parser. Browser-safe (DataView, no Node Buffer/fs).
 *
 * Faithful TypeScript port of the proven font-fidelity-research parser
 * (harness/scripts/font-metadata.js). Emits FACTS only - no provenance, no scoring, no DOCX. woff2 is
 * NOT supported (Brotli-transformed SFNT); decompress to .ttf/.otf first.
 */
import type {
  CmapKind,
  CoverageResult,
  FontCategory,
  FontFaceMetadata,
  ParsedFace,
  ParseOptions,
  ParseResult,
  StyleKey,
} from "./types";

// --- big-endian readers over a DataView (browser-safe; no Node Buffer) ---
const u8 = (d: DataView, o: number) => d.getUint8(o);
const u16 = (d: DataView, o: number) => d.getUint16(o, false);
const i16 = (d: DataView, o: number) => d.getInt16(o, false);
const u32 = (d: DataView, o: number) => d.getUint32(o, false);
const ascii = (b: Uint8Array, o: number, len: number): string => {
  let s = "";
  for (let i = 0; i < len; i += 1) s += String.fromCharCode(b[o + i]);
  return s;
};
const tag = (b: Uint8Array, o: number) => ascii(b, o, 4);
const utf16be = (b: Uint8Array, o: number, len: number): string => {
  let s = "";
  for (let i = 0; i + 1 < len; i += 2)
    s += String.fromCharCode((b[o + i] << 8) | b[o + i + 1]);
  return s;
};

type TableRec = { offset: number; length: number };

/** Number of faces in a font file: numFonts for a .ttc collection, else 1. */
export function countFaces(bytes: Uint8Array): number {
  if (bytes.length < 12 || tag(bytes, 0) !== "ttcf") return 1;
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return u32(d, 8); // ttc header: numFonts
}

function tableDirectory(b: Uint8Array, d: DataView, faceIndex: number) {
  let sfntOffset = 0;
  let collection = false;
  let collectionIndex: number | undefined;
  if (tag(b, 0) === "ttcf") {
    collection = true;
    const numFonts = u32(d, 8);
    if (faceIndex < 0 || faceIndex >= numFonts) {
      throw new RangeError(
        `faceIndex ${faceIndex} out of range (collection has ${numFonts} faces)`,
      );
    }
    sfntOffset = u32(d, 12 + faceIndex * 4); // this face's table directory
    collectionIndex = faceIndex;
  } else if (faceIndex !== 0) {
    throw new RangeError(
      `faceIndex ${faceIndex} on a single-face font (only 0 is valid)`,
    );
  }
  const numTables = u16(d, sfntOffset + 4);
  const byTag: Record<string, TableRec> = {};
  for (let i = 0; i < numTables; i += 1) {
    const rec = sfntOffset + 12 + i * 16;
    byTag[tag(b, rec)] = { offset: u32(d, rec + 8), length: u32(d, rec + 12) };
  }
  return { byTag, collection, collectionIndex, sfntOffset };
}

function sfntVersion(b: Uint8Array, d: DataView, offset: number): string {
  const v = u32(d, offset);
  if (v === 0x00010000) return "1.0"; // TrueType outlines
  const t = tag(b, offset);
  if (t === "OTTO" || t === "true" || t === "typ1") return t;
  return `0x${v.toString(16).padStart(8, "0")}`;
}

// --- name table -----------------------------------------------------------
function parseName(
  b: Uint8Array,
  d: DataView,
  tbl?: TableRec,
): Record<number, string> {
  const out: Record<number, string> = {};
  if (!tbl) return out;
  const base = tbl.offset;
  const count = u16(d, base + 2);
  const stringOffset = base + u16(d, base + 4);
  const seen: Record<number, number> = {};
  for (let i = 0; i < count; i += 1) {
    const rec = base + 6 + i * 12;
    const platformID = u16(d, rec);
    const length = u16(d, rec + 8);
    const strOff = stringOffset + u16(d, rec + 10);
    const nameID = u16(d, rec + 6);
    if (strOff + length > b.length) continue;
    // platform 3 (Windows) and 0 (Unicode) store UTF-16BE; 1 (Mac) stores single-byte.
    const value =
      platformID === 3 || platformID === 0
        ? utf16be(b, strOff, length)
        : ascii(b, strOff, length);
    const better = platformID === 3 ? 2 : platformID === 0 ? 1 : 0;
    if (out[nameID] === undefined || (seen[nameID] ?? -1) < better) {
      out[nameID] = value;
      seen[nameID] = better;
    }
  }
  return out;
}

// --- cmap -> glyph-id lookup ----------------------------------------------
type GidLookup = (cp: number) => number;

const format0 =
  (d: DataView, sub: number): GidLookup =>
  (cp) =>
    cp < 256 ? u8(d, sub + 6 + cp) : 0;

const format6 = (d: DataView, sub: number): GidLookup => {
  const first = u16(d, sub + 6);
  const count = u16(d, sub + 8);
  return (cp) =>
    cp < first || cp >= first + count ? 0 : u16(d, sub + 10 + (cp - first) * 2);
};

function format4(b: Uint8Array, d: DataView, sub: number): GidLookup {
  const segX2 = u16(d, sub + 6);
  const segCount = segX2 / 2;
  const endBase = sub + 14;
  const startBase = endBase + segX2 + 2;
  const deltaBase = startBase + segX2;
  const rangeBase = deltaBase + segX2;
  return (cp) => {
    if (cp > 0xffff) return 0;
    for (let i = 0; i < segCount; i += 1) {
      const end = u16(d, endBase + 2 * i);
      if (cp > end) continue;
      const start = u16(d, startBase + 2 * i);
      if (cp < start) return 0;
      const idDelta = i16(d, deltaBase + 2 * i);
      const idRangeOffset = u16(d, rangeBase + 2 * i);
      if (idRangeOffset === 0) return (cp + idDelta) & 0xffff;
      const addr = rangeBase + 2 * i + idRangeOffset + 2 * (cp - start);
      if (addr + 1 >= b.length) return 0;
      const g = u16(d, addr);
      return g === 0 ? 0 : (g + idDelta) & 0xffff;
    }
    return 0;
  };
}

function format12(d: DataView, sub: number): GidLookup {
  const nGroups = u32(d, sub + 12);
  const groupBase = sub + 16;
  return (cp) => {
    for (let i = 0; i < nGroups; i += 1) {
      const g = groupBase + i * 12;
      const start = u32(d, g);
      const end = u32(d, g + 4);
      if (cp < start) return 0;
      if (cp <= end) return u32(d, g + 8) + (cp - start);
    }
    return 0;
  };
}

function makeSubtableLookup(
  b: Uint8Array,
  d: DataView,
  sub: number,
): GidLookup {
  const format = u16(d, sub);
  if (format === 4) return format4(b, d, sub);
  if (format === 12) return format12(d, sub);
  if (format === 6) return format6(d, sub);
  if (format === 0) return format0(d, sub);
  return () => 0;
}

function parseCmap(
  b: Uint8Array,
  d: DataView,
  tbl?: TableRec,
): { gid: GidLookup; kind: CmapKind; symbolOnly: boolean } {
  if (!tbl) return { gid: () => 0, kind: "none", symbolOnly: false };
  const base = tbl.offset;
  const numTables = u16(d, base + 2);
  let best: { offset: number; score: number } | null = null;
  let symbol: number | null = null;
  for (let i = 0; i < numTables; i += 1) {
    const rec = base + 4 + i * 8;
    const platformID = u16(d, rec);
    const encodingID = u16(d, rec + 2);
    const subOffset = base + u32(d, rec + 4);
    let score = -1;
    if (platformID === 3 && encodingID === 10) score = 5;
    else if (platformID === 0 && encodingID >= 4) score = 5;
    else if (platformID === 3 && encodingID === 1) score = 4;
    else if (platformID === 0) score = 3;
    if (platformID === 3 && encodingID === 0) symbol = subOffset;
    if (score > 0 && (!best || score > best.score))
      best = { offset: subOffset, score };
  }
  if (!best && symbol !== null)
    return {
      gid: makeSubtableLookup(b, d, symbol),
      kind: "symbol",
      symbolOnly: true,
    };
  if (!best) return { gid: () => 0, kind: "none", symbolOnly: false };
  return {
    gid: makeSubtableLookup(b, d, best.offset),
    kind: "unicode",
    symbolOnly: false,
  };
}

// --- hmtx advance width (font units) per glyph id -------------------------
function makeAdvance(
  d: DataView,
  hmtxOffset: number,
  numberOfHMetrics: number,
): (gid: number) => number {
  return (gid) => {
    const i = gid < numberOfHMetrics ? gid : numberOfHMetrics - 1;
    return u16(d, hmtxOffset + i * 4);
  };
}

// --- classification (category / serif / fsType) ---------------------------
function guessSerifFromName(family: string): boolean | null {
  if (!family) return null;
  if (
    /serif|times|georgia|garamond|cambria|caslon|bodoni|book|roman|minion|palatino|century|schoolbook|constantia/i.test(
      family,
    )
  ) {
    if (/sans/i.test(family)) return false;
    return true;
  }
  if (
    /sans|arial|helvetica|verdana|tahoma|calibri|segoe|grotesk|gothic/i.test(
      family,
    )
  )
    return false;
  return null;
}

function inferCategory(args: {
  panose: number[] | null;
  sFamilyClass: number | null;
  usWidthClass: number | null;
  monospaced: boolean;
  cmapKind: CmapKind;
  family: string;
}): { category: FontCategory; condensed: boolean } {
  const { panose, sFamilyClass, usWidthClass, monospaced, cmapKind, family } =
    args;
  const familyClassHi =
    sFamilyClass != null ? (sFamilyClass >> 8) & 0xff : null;
  const panoseKind = panose ? panose[0] : null;
  const panoseSerif = panose ? panose[1] : null;
  const condensed =
    usWidthClass != null && usWidthClass > 0 && usWidthClass < 5;
  let category: FontCategory = "unknown";
  if (cmapKind === "symbol" || panoseKind === 5 || familyClassHi === 12)
    category = "symbol";
  else if (monospaced) category = "mono";
  else if (panoseKind === 3 || familyClassHi === 10) category = "script";
  else {
    let serif: boolean | null = null;
    if (familyClassHi != null) {
      if (familyClassHi >= 1 && familyClassHi <= 7) serif = true;
      else if (familyClassHi === 8) serif = false;
    }
    if (serif === null && panoseKind === 2 && panoseSerif != null) {
      if (panoseSerif >= 2 && panoseSerif <= 10) serif = true;
      else if (panoseSerif >= 11 && panoseSerif <= 15) serif = false;
    }
    if (serif === null) serif = guessSerifFromName(family);
    category = serif === true ? "serif" : serif === false ? "sans" : "unknown";
  }
  return { category, condensed };
}

function decodeFsType(fsType: number | null): {
  value: number | null;
  summary: string;
} {
  if (fsType == null) return { value: null, summary: "unknown" };
  const masked = fsType & 0x000f;
  let level: string;
  if (masked === 0) level = "installable";
  else if (masked & 0x0002) level = "restricted-no-embed";
  else if (masked & 0x0004) level = "preview-print";
  else if (masked & 0x0008) level = "editable";
  else level = "reserved";
  const flags: string[] = [];
  if (fsType & 0x0100) flags.push("no-subset");
  if (fsType & 0x0200) flags.push("bitmap-only");
  return {
    value: fsType,
    summary: flags.length ? `${level} (${flags.join(",")})` : level,
  };
}

function styleKeyOf(
  bold: boolean,
  italic: boolean,
  weightClass: number | null,
): StyleKey {
  // styleKey is the canonical four-face SUBSTITUTION SLOT, not raw RIBBI bits. A face earns a slot
  // only when its weight matches that slot's canonical weight (~400 upright/italic, ~700 bold);
  // otherwise (Light/Medium/Black/Thin uprights, obliques, and bolds) it is "other" and never claims
  // a slot. Without this, a collection's Light Oblique (italic bit, weight 300) would shadow the true
  // Oblique under the same family|styleKey key and get measured in its place. Null weight = trust the
  // RIBBI bits (no OS/2 weight to judge by).
  const regularWeight =
    weightClass == null || (weightClass >= 350 && weightClass <= 550);
  const boldWeight =
    weightClass == null || (weightClass >= 600 && weightClass <= 800);
  if (bold && italic) return boldWeight ? "boldItalic" : "other";
  if (bold) return boldWeight ? "bold" : "other";
  if (italic) return regularWeight ? "italic" : "other";
  return regularWeight ? "regular" : "other";
}

// --- representative Latin text coverage probe -----------------------------
export function buildLatinCore(): number[] {
  const cps: number[] = [];
  for (let c = 0x20; c <= 0x7e; c += 1) cps.push(c);
  for (const c of [0xa0, 0xa9, 0xae, 0xb0, 0xb7]) cps.push(c);
  for (let c = 0xc0; c <= 0xff; c += 1)
    if (c !== 0xd7 && c !== 0xf7) cps.push(c);
  for (const c of [
    0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x2122,
  ])
    cps.push(c);
  return cps;
}
export const LATIN_CORE: readonly number[] = buildLatinCore();

// --- main parse -----------------------------------------------------------
export function parseFontFace(
  bytes: Uint8Array,
  options: ParseOptions = {},
): ParseResult {
  if (bytes.length < 12) return { ok: false, error: "too short to be a font" };
  const first = tag(bytes, 0);
  if (first === "wOF2" || first === "wOFF") {
    return {
      ok: false,
      error: "woff/woff2 not supported; decompress to .ttf/.otf first",
    };
  }
  try {
    const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const { byTag, collection, collectionIndex, sfntOffset } = tableDirectory(
      bytes,
      d,
      options.faceIndex ?? 0,
    );
    const headT = byTag.head;
    const os2T = byTag["OS/2"];
    const hheaT = byTag.hhea;
    const postT = byTag.post;

    const unitsPerEm = headT ? u16(d, headT.offset + 18) : null;
    const macStyle = headT ? u16(d, headT.offset + 44) : null;

    let weightClass: number | null = null;
    let widthClass: number | null = null;
    let fsType: number | null = null;
    let sFamilyClass: number | null = null;
    let panose: number[] | null = null;
    let fsSelection: number | null = null;
    let typo: { ascent: number; descent: number; lineGap: number } | undefined;
    let win: { ascent: number; descent: number } | undefined;
    if (os2T) {
      const o = os2T.offset;
      weightClass = u16(d, o + 4);
      widthClass = u16(d, o + 6);
      fsType = u16(d, o + 8);
      sFamilyClass = i16(d, o + 30);
      panose = [];
      for (let i = 0; i < 10; i += 1) panose.push(u8(d, o + 32 + i));
      fsSelection = u16(d, o + 62);
      typo = {
        ascent: i16(d, o + 68),
        descent: i16(d, o + 70),
        lineGap: i16(d, o + 72),
      };
      win = { ascent: u16(d, o + 74), descent: u16(d, o + 76) };
    }

    const hhea = hheaT
      ? {
          ascent: i16(d, hheaT.offset + 4),
          descent: i16(d, hheaT.offset + 6),
          lineGap: i16(d, hheaT.offset + 8),
        }
      : undefined;
    const numberOfHMetrics = hheaT ? u16(d, hheaT.offset + 34) : 0;
    const hmtxT = byTag.hmtx;
    const hasAdvance = Boolean(hmtxT && numberOfHMetrics);
    const advanceWidth =
      hmtxT && numberOfHMetrics
        ? makeAdvance(d, hmtxT.offset, numberOfHMetrics)
        : () => 0;

    const fixedPitch = postT ? u32(d, postT.offset + 12) !== 0 : false;
    const monospaced = fixedPitch || (panose ? panose[3] === 9 : false);

    const names = parseName(bytes, d, byTag.name);
    const family = names[16] || names[1] || "";
    const subfamily = names[17] || names[2] || "";

    const cmap = parseCmap(bytes, d, byTag.cmap);
    const { category, condensed } = inferCategory({
      panose,
      sFamilyClass,
      usWidthClass: widthClass,
      monospaced,
      cmapKind: cmap.kind,
      family,
    });

    const useTypoMetrics =
      fsSelection != null ? (fsSelection & 0x80) !== 0 : null;
    const italic =
      ((macStyle ?? 0) & 0x2) !== 0 || ((fsSelection ?? 0) & 0x1) !== 0;
    const bold =
      ((macStyle ?? 0) & 0x1) !== 0 || ((fsSelection ?? 0) & 0x20) !== 0;
    const fsTypeDecoded = decodeFsType(fsType);

    // Latin-core coverage now, so the corpus has it without retaining the lookup closures.
    const missingLatinCore: number[] = [];
    for (const cp of LATIN_CORE)
      if (cmap.gid(cp) === 0) missingLatinCore.push(cp);
    const latinCoreRatio = LATIN_CORE.length
      ? (LATIN_CORE.length - missingLatinCore.length) / LATIN_CORE.length
      : 0;

    const metadata: FontFaceMetadata = {
      fileSha256: options.fileSha256 ?? "",
      sfntVersion: collection ? "ttcf" : sfntVersion(bytes, d, sfntOffset),
      collectionIndex,
      names: {
        family,
        subfamily,
        fullName: names[4] || undefined,
        postscriptName: names[6] || undefined,
        typographicFamily: names[16] || undefined,
        typographicSubfamily: names[17] || undefined,
      },
      face: {
        weightClass,
        widthClass,
        italic,
        bold,
        styleKey: styleKeyOf(bold, italic, weightClass),
      },
      metrics: {
        unitsPerEm,
        hhea,
        typo,
        win,
        useTypoMetrics,
        fixedPitch,
      },
      coverage: {
        cmapKind: cmap.kind,
        latinCoreRatio,
        missingLatinCore,
      },
      classification: { category, condensed },
      embedding: {
        fsTypeValue: fsTypeDecoded.value,
        fsTypeSummary: fsTypeDecoded.summary,
      },
    };

    const face: ParsedFace = {
      metadata,
      advanceWidth,
      gidForCodepoint: cmap.gid,
      covers: (cp) => cmap.gid(cp) !== 0,
      hasAdvance,
    };
    return { ok: true, face };
  } catch (e) {
    return { ok: false, error: `parse failed: ${(e as Error).message}` };
  }
}

/** Analytic advance of a string in px (hmtx + cmap, no rendering). null if no metrics. */
export function advanceOfString(
  face: ParsedFace,
  text: string,
  sizePx: number,
): number | null {
  const upem = face.metadata.metrics.unitsPerEm;
  if (!upem || !face.hasAdvance) return null;
  let units = 0;
  for (const ch of text)
    units += face.advanceWidth(
      face.gidForCodepoint(ch.codePointAt(0) as number),
    );
  return (units * sizePx) / upem;
}

/** Coverage of a codepoint set, using the face's cmap. */
export function coverage(
  face: ParsedFace,
  codepoints: readonly number[],
): CoverageResult {
  const missing: number[] = [];
  let n = 0;
  for (const cp of codepoints) {
    if (face.covers(cp)) n += 1;
    else missing.push(cp);
  }
  return {
    total: codepoints.length,
    covered: n,
    ratio: codepoints.length ? n / codepoints.length : 0,
    missing,
  };
}

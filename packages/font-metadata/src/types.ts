/**
 * @docfonts/font-metadata types. FACTS parsed from a font file - no provenance, no scoring, no DOCX.
 */

/** Line metrics from a font table, in font units (unitsPerEm). */
export interface LineMetrics {
  ascent: number;
  descent: number;
  lineGap: number;
}

export type StyleKey = "regular" | "bold" | "italic" | "boldItalic" | "other";
export type FontCategory =
  | "serif"
  | "sans"
  | "mono"
  | "script"
  | "display"
  | "symbol"
  | "unknown";
export type CmapKind = "unicode" | "symbol" | "none";

/**
 * Serializable facts for ONE font face - what the corpus stores. `fileSha256` is the join key to the
 * source/provenance layer; it is supplied by the caller (see {@link sha256Hex}), NOT derived from the
 * font tables, because license/identity decisions do not belong to the parser.
 */
export interface FontFaceMetadata {
  fileSha256: string;
  sfntVersion: string;
  /** index of the parsed face within a .ttc collection (see ParseOptions.faceIndex). Undefined for single-face files. */
  collectionIndex?: number;
  names: {
    family: string;
    subfamily: string;
    fullName?: string;
    postscriptName?: string;
    typographicFamily?: string;
    typographicSubfamily?: string;
  };
  face: {
    weightClass: number | null;
    widthClass: number | null;
    italic: boolean;
    bold: boolean;
    styleKey: StyleKey;
  };
  metrics: {
    unitsPerEm: number | null;
    hhea?: LineMetrics;
    typo?: LineMetrics;
    win?: { ascent: number; descent: number };
    useTypoMetrics: boolean | null;
    fixedPitch: boolean;
  };
  coverage: {
    cmapKind: CmapKind;
    latinCoreRatio: number;
    missingLatinCore: number[];
  };
  classification: {
    category: FontCategory;
    condensed: boolean;
  };
  embedding: {
    fsTypeValue: number | null;
    fsTypeSummary: string;
  };
}

/**
 * A parsed face: serializable {@link FontFaceMetadata} plus glyph lookups for measurement. The lookups
 * are NOT serialized into the corpus; the measurement layer uses them, the corpus stores `metadata`.
 */
export interface ParsedFace {
  metadata: FontFaceMetadata;
  /** advance width of a glyph id, in font units (0 if the font has no hmtx). */
  advanceWidth(gid: number): number;
  /** glyph id for a codepoint, 0 = missing. */
  gidForCodepoint(cp: number): number;
  covers(cp: number): boolean;
  /** whether the font has a usable hmtx advance table. */
  hasAdvance: boolean;
}

export type ParseResult =
  | { ok: true; face: ParsedFace }
  | { ok: false; error: string };

export interface ParseOptions {
  /** caller-computed sha256 of the file bytes (the corpus join key). See {@link sha256Hex}. */
  fileSha256?: string;
  /** which face of a .ttc collection to parse (default 0). For a single-face .ttf/.otf only 0 is valid; a nonzero index is a parse error. */
  faceIndex?: number;
}

export interface CoverageResult {
  total: number;
  covered: number;
  ratio: number;
  missing: number[];
}

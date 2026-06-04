/**
 * @docfonts/font-metadata - SFNT (TTF/OTF/TTC) parser. Browser-safe, dependency-free.
 *
 * Boundary: knows FONTS only. Must NOT import @docfonts/docx-fonts or @docfonts/core. Emits facts
 * ({@link FontFaceMetadata}) plus glyph lookups for measurement. Provenance and scoring live in
 * other layers (registry / core).
 */

export {
  advanceOfString,
  buildLatinCore,
  coverage,
  LATIN_CORE,
  parseFontFace,
} from "./parse";
export { sha256Hex } from "./sha256";
export type {
  CmapKind,
  CoverageResult,
  FontCategory,
  FontFaceMetadata,
  LineMetrics,
  ParsedFace,
  ParseOptions,
  ParseResult,
  StyleKey,
} from "./types";

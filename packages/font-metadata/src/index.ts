/**
 * @docfonts/font-metadata - SFNT (TTF/OTF) parser: cmap coverage, hmtx advances, head/hhea metrics.
 *
 * Boundary: knows FONTS only. Must NOT import @docfonts/docx-fonts or @docfonts/core. Pure parsing
 * of font bytes into facts. Seed by porting font-fidelity-research/harness/scripts/font-metadata.js
 * to TypeScript (see scripts/import-research.ts).
 */

export interface FaceMetrics {
  family: string;
  weightClass: number;
  italic: boolean;
  unitsPerEm: number;
  /** advance width per glyph id, in font units. */
  advanceWidths: number[];
  // TODO(port): cmap coverage set, category (serif/sans/mono/display), widthClass.
}

export function parseFace(_bytes: Uint8Array): FaceMetrics {
  throw new Error(
    "not implemented: port from font-fidelity-research/harness/scripts/font-metadata.js",
  );
}

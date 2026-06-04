/**
 * @docfonts/docx-fonts - parse font declarations from a .docx: theme1.xml (major/minor), w:rFonts,
 * styles, and any embedded fonts. Knows DOCX only.
 *
 * Boundary: must NOT import @docfonts/core (scoring) or @docfonts/font-metadata (SFNT parsing).
 * Output is the set of declared/used font names; scoring + resolution happen elsewhere.
 */

export interface DocxFontUsage {
  /** font family names declared or referenced in the document body/styles. */
  declared: string[];
  /** theme heading/body fonts, if present. */
  theme?: { major?: string; minor?: string };
}

export function scanDocxFonts(_docxBytes: Uint8Array): DocxFontUsage {
  throw new Error(
    "not implemented: parse [Content_Types].xml + word/theme/theme1.xml + rFonts",
  );
}

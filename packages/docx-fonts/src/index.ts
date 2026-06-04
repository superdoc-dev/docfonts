/**
 * @docfonts/docx-fonts - parse font declarations from a .docx: theme1.xml (major/minor), w:rFonts
 * (explicit typefaces + theme references), styles, headers, and footers. Knows DOCX only.
 *
 * Boundary: must NOT import @docfonts/core (scoring) or @docfonts/font-metadata (SFNT parsing).
 * Output is the set of declared/used font names; scoring + resolution happen elsewhere.
 *
 * Runs in the browser (the scanner never uploads): fflate unzips in-memory and parsing is plain
 * string scanning over the few XML parts that carry font names - no DOM, no XML library, no I/O.
 */
import { unzipSync } from "fflate";

export interface DocxFontUsage {
  /** distinct font family names declared or referenced in the document body / styles / theme. */
  declared: string[];
  /** theme heading (major) / body (minor) Latin fonts, if a theme is present. */
  theme?: { major?: string; minor?: string };
}

const decoder = new TextDecoder();

/** Explicit typeface attributes carried by <w:rFonts> (a real font name). */
const RFONTS_FACE_ATTRS = ["ascii", "hAnsi", "cs", "eastAsia"] as const;
/** Theme-reference attributes on <w:rFonts> (point at the theme major/minor font, not a name). */
const RFONTS_THEME_ATTRS = [
  "asciiTheme",
  "hAnsiTheme",
  "cstheme",
  "eastAsiaTheme",
] as const;

function entryText(
  zip: Record<string, Uint8Array>,
  path: string,
): string | null {
  const bytes = zip[path];
  return bytes ? decoder.decode(bytes) : null;
}

/** Read a single XML attribute value, namespace-tolerant (matches `w:NAME="..."` or `NAME="..."`). */
function readAttr(element: string, name: string): string | undefined {
  const m = element.match(new RegExp(`(?:[A-Za-z]+:)?${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

/**
 * Namespace-tolerant element opener: an optional `prefix:` then the local name. OOXML binds prefixes
 * to namespaces, not the literal string - Word uses w:/a:, but we don't assume it.
 */
const NS = "(?:[A-Za-z0-9_]+:)?";

/** Extract the Latin typeface from a theme major/minor font block (any namespace prefix). */
function themeLatin(
  themeXml: string,
  which: "major" | "minor",
): string | undefined {
  const block = themeXml.match(
    new RegExp(`<${NS}${which}Font\\b[^>]*>([\\s\\S]*?)</${NS}${which}Font>`),
  );
  if (!block) return undefined;
  const latin = block[1].match(
    new RegExp(`<${NS}latin\\b[^>]*\\btypeface="([^"]*)"`),
  );
  const name = latin?.[1]?.trim();
  return name || undefined;
}

/**
 * Parse the font declarations from .docx bytes. Returns the distinct set of font family names the
 * document references (explicit rFonts typefaces, resolved theme references, and the theme fonts
 * themselves) plus the theme major/minor Latin fonts. Throws if the bytes are not a valid .docx.
 */
export function scanDocxFonts(docxBytes: Uint8Array): DocxFontUsage {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(docxBytes);
  } catch (e) {
    throw new Error(
      `not a valid .docx (could not unzip): ${(e as Error).message}`,
    );
  }
  if (!zip["word/document.xml"]) {
    throw new Error("not a valid .docx: missing word/document.xml");
  }

  // Resolve the theme first, so rFonts theme references (minorHAnsi / majorHAnsi / ...) can be mapped.
  const themeXml = entryText(zip, "word/theme/theme1.xml");
  const theme = themeXml
    ? {
        major: themeLatin(themeXml, "major"),
        minor: themeLatin(themeXml, "minor"),
      }
    : undefined;

  const declared = new Set<string>();
  const addThemeRef = (value: string) => {
    if (/^minor/i.test(value) && theme?.minor) declared.add(theme.minor);
    else if (/^major/i.test(value) && theme?.major) declared.add(theme.major);
  };

  // Parts that carry run / style font declarations.
  const parts = Object.keys(zip).filter(
    (p) =>
      p === "word/document.xml" ||
      p === "word/styles.xml" ||
      /^word\/(header|footer)\d*\.xml$/.test(p),
  );
  for (const path of parts) {
    const xml = entryText(zip, path);
    if (!xml) continue;
    for (const match of xml.matchAll(
      new RegExp(`<${NS}rFonts\\b[^>]*/?>`, "g"),
    )) {
      const element = match[0];
      for (const a of RFONTS_FACE_ATTRS) {
        const v = readAttr(element, a)?.trim();
        if (v) declared.add(v);
      }
      for (const a of RFONTS_THEME_ATTRS) {
        const v = readAttr(element, a);
        if (v) addThemeRef(v);
      }
    }
  }

  // The theme major/minor are the document's default heading/body fonts: a document on default
  // styling uses them even without an explicit rFonts, so they count as referenced.
  if (theme?.major) declared.add(theme.major);
  if (theme?.minor) declared.add(theme.minor);

  return {
    declared: [...declared].sort((a, b) => a.localeCompare(b)),
    ...(theme && (theme.major || theme.minor) ? { theme } : {}),
  };
}

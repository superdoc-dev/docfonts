/**
 * Hermetic tests for scanDocxFonts: minimal .docx packages are built in-memory with fflate (no real
 * Word fixture needed), exercising explicit rFonts typefaces, theme resolution, styles/headers, and
 * the invalid-input guards. Parsing must stay in-browser-safe, so these run anywhere bun does.
 */
import { describe, expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { scanDocxFonts } from "./src/index";

function docx(parts: Record<string, string>): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const [path, xml] of Object.entries(parts)) files[path] = strToU8(xml);
  return zipSync(files);
}

const THEME = `<?xml version="1.0"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:fontScheme>
  <a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
  <a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme></a:themeElements></a:theme>`;

const DOC = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  <w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>hi</w:t></w:r></w:p>
  <w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial"/></w:rPr></w:r></w:p>
  <w:p><w:r><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/></w:rPr></w:r></w:p>
  <w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr></w:r></w:p>
</w:body></w:document>`;

describe("scanDocxFonts", () => {
  test("extracts explicit rFonts typefaces, deduped and sorted", () => {
    const u = scanDocxFonts(docx({ "word/document.xml": DOC }));
    // Calibri appears twice -> once; Arial present.
    expect(u.declared).toContain("Calibri");
    expect(u.declared).toContain("Arial");
    expect(u.declared.filter((f) => f === "Calibri")).toHaveLength(1);
    expect([...u.declared]).toEqual(
      [...u.declared].sort((a, b) => a.localeCompare(b)),
    );
  });

  test("resolves theme major/minor and a minorHAnsi reference to the theme font", () => {
    const u = scanDocxFonts(
      docx({ "word/document.xml": DOC, "word/theme/theme1.xml": THEME }),
    );
    expect(u.theme).toEqual({ major: "Aptos Display", minor: "Aptos" });
    // asciiTheme="minorHAnsi" -> Aptos (minor); theme fonts are also declared defaults.
    expect(u.declared).toContain("Aptos");
    expect(u.declared).toContain("Aptos Display");
  });

  test("picks up fonts declared only in styles.xml and headers", () => {
    const styles = `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style><w:rPr><w:rFonts w:ascii="Cambria"/></w:rPr></w:style></w:styles>`;
    const header = `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:p><w:r><w:rPr><w:rFonts w:ascii="Georgia"/></w:rPr></w:r></w:p></w:hdr>`;
    const u = scanDocxFonts(
      docx({
        "word/document.xml": DOC,
        "word/styles.xml": styles,
        "word/header1.xml": header,
      }),
    );
    expect(u.declared).toContain("Cambria");
    expect(u.declared).toContain("Georgia");
  });

  test("a document with no theme omits the theme field", () => {
    const u = scanDocxFonts(docx({ "word/document.xml": DOC }));
    expect(u.theme).toBeUndefined();
  });

  test("covers fonts in footnotes, endnotes, and comments", () => {
    const part = (font: string) =>
      `<w:root xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:r><w:rPr><w:rFonts w:ascii="${font}"/></w:rPr></w:r></w:p></w:root>`;
    const u = scanDocxFonts(
      docx({
        "word/document.xml": DOC,
        "word/footnotes.xml": part("Garamond"),
        "word/endnotes.xml": part("Palatino Linotype"),
        "word/comments.xml": part("Courier New"),
      }),
    );
    expect(u.declared).toContain("Garamond");
    expect(u.declared).toContain("Palatino Linotype");
    expect(u.declared).toContain("Courier New");
  });

  test("tolerates non-standard namespace prefixes on elements (OOXML binds ns, not the prefix)", () => {
    const doc = `<x:document xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><x:body>
      <x:p><x:r><x:rPr><x:rFonts x:ascii="Tahoma"/></x:rPr></x:r></x:p></x:body></x:document>`;
    const theme = `<b:theme xmlns:b="http://schemas.openxmlformats.org/drawingml/2006/main"><b:themeElements><b:fontScheme>
      <b:majorFont><b:latin typeface="Garamond"/></b:majorFont><b:minorFont><b:latin typeface="Verdana"/></b:minorFont>
      </b:fontScheme></b:themeElements></b:theme>`;
    const u = scanDocxFonts(
      docx({ "word/document.xml": doc, "word/theme/theme1.xml": theme }),
    );
    expect(u.declared).toContain("Tahoma");
    expect(u.theme).toEqual({ major: "Garamond", minor: "Verdana" });
  });

  test("throws on a zip that is not a .docx (no word/document.xml)", () => {
    expect(() => scanDocxFonts(docx({ "hello.txt": "not a docx" }))).toThrow(
      /word\/document\.xml/,
    );
  });

  test("throws on bytes that are not a zip at all", () => {
    expect(() =>
      scanDocxFonts(strToU8("plain text, definitely not a zip")),
    ).toThrow(/not a valid \.docx/);
  });
});

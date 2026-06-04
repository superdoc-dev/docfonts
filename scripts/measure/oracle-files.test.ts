import { describe, expect, test } from "bun:test";
import { isOracleFontFile } from "./oracle-files";

describe("isOracleFontFile", () => {
  test("accepts ttf, otf, and ttc (collections, e.g. Cambria.ttc), case-insensitively", () => {
    for (const f of ["Calibri.ttf", "Foo.OTF", "Cambria.ttc", "X.TTC"]) {
      expect(isOracleFontFile(f)).toBe(true);
    }
  });

  test("rejects non-font files", () => {
    for (const f of [
      "notes.txt",
      "license.md",
      "Cambria.ttc.bak",
      ".DS_Store",
      "font.woff2",
    ]) {
      expect(isOracleFontFile(f)).toBe(false);
    }
  });
});

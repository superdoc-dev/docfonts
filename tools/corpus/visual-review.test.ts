import { describe, expect, test } from "bun:test";
import { isAbsolute } from "node:path";
import {
  DEFAULT_OUT,
  escapeHtml,
  FACE_SLOTS,
  fontAssetName,
  formatCodepoint,
  isFaceSlot,
  OVERLAY_GLYPHS,
  renderVisualReviewApp,
  resolveOutPath,
  type VisualReviewApp,
} from "./src/contact-sheet";
import {
  parseArgs,
  parseCandidateFaceValue,
  parseFaceValue,
  parseLabeledValue,
} from "./visual-review";

describe("parseArgs", () => {
  test("keeps --reference and --candidate as regular-face shorthands", () => {
    const args = parseArgs([
      "--reference",
      "ref.ttf",
      "--candidate",
      "Inter=/fonts/inter.ttf",
      "--candidate",
      "Roboto=/fonts/roboto.ttf",
    ]);
    expect(args.referenceFaces).toEqual({ regular: "ref.ttf" });
    expect(args.candidates).toEqual([
      { label: "Inter", faces: { regular: "/fonts/inter.ttf" } },
      { label: "Roboto", faces: { regular: "/fonts/roboto.ttf" } },
    ]);
  });

  test("collects four-face reference and candidate values", () => {
    const args = parseArgs([
      "--reference-face",
      "regular=/ref-r.ttf",
      "--reference-face",
      "bold=/ref-b.ttf",
      "--reference-face",
      "italic=/ref-i.ttf",
      "--reference-face",
      "boldItalic=/ref-bi.ttf",
      "--candidate-face",
      "A:regular=/a-r.ttf",
      "--candidate-face",
      "A:bold=/a-b.ttf",
      "--candidate-face",
      "A:italic=/a-i.ttf",
      "--candidate-face",
      "A:boldItalic=/a-bi.ttf",
    ]);
    expect(args.referenceFaces).toEqual({
      regular: "/ref-r.ttf",
      bold: "/ref-b.ttf",
      italic: "/ref-i.ttf",
      boldItalic: "/ref-bi.ttf",
    });
    expect(args.candidates).toEqual([
      {
        label: "A",
        faces: {
          regular: "/a-r.ttf",
          bold: "/a-b.ttf",
          italic: "/a-i.ttf",
          boldItalic: "/a-bi.ttf",
        },
      },
    ]);
  });

  test("captures --family and --out", () => {
    const args = parseArgs([
      "--reference",
      "ref.ttf",
      "--family",
      "Verdana",
      "--out",
      "/tmp/review.html",
    ]);
    expect(args.family).toBe("Verdana");
    expect(args.out).toBe("/tmp/review.html");
  });

  test("rejects duplicate faces", () => {
    expect(() =>
      parseArgs(["--reference", "a.ttf", "--reference-face", "regular=b.ttf"]),
    ).toThrow("duplicate reference face: regular");
    expect(() =>
      parseArgs([
        "--candidate",
        "A=/a.ttf",
        "--candidate-face",
        "A:regular=/b.ttf",
      ]),
    ).toThrow('duplicate candidate "A" face: regular');
  });

  test("rejects unknown arguments and missing values", () => {
    expect(() => parseArgs(["--bogus"])).toThrow("unknown argument: --bogus");
    expect(() => parseArgs(["--reference"])).toThrow(
      "--reference requires a value",
    );
  });
});

describe("labeled values", () => {
  test("splits on the first equals and trims", () => {
    expect(parseLabeledValue("--candidate", " Inter = /a=b.ttf ")).toEqual([
      "Inter",
      "/a=b.ttf",
    ]);
  });

  test("parses reference face values", () => {
    expect(parseFaceValue("--reference-face", "bold=/b.ttf")).toEqual([
      "bold",
      "/b.ttf",
    ]);
  });

  test("parses candidate face values", () => {
    expect(
      parseCandidateFaceValue("--candidate-face", "A:bold=/a.ttf"),
    ).toEqual(["A", "bold", "/a.ttf"]);
  });

  test("rejects invalid face names and shapes", () => {
    expect(() => parseFaceValue("--reference-face", "black=/b.ttf")).toThrow(
      "face must be one of",
    );
    expect(() =>
      parseCandidateFaceValue("--candidate-face", "A=/a.ttf"),
    ).toThrow('expects "Label:face=value"');
  });
});

describe("output helpers", () => {
  test("defaults to the ignored cache path", () => {
    expect(resolveOutPath(undefined)).toBe(DEFAULT_OUT);
    expect(DEFAULT_OUT.endsWith("/.cache/corpus-visual/review.html")).toBe(
      true,
    );
  });

  test("uses an explicit .html path as the file", () => {
    expect(resolveOutPath("/tmp/out/review.html")).toBe("/tmp/out/review.html");
  });

  test("treats a non-html path as a directory", () => {
    expect(resolveOutPath("/tmp/out")).toBe("/tmp/out/review.html");
  });

  test("resolves a relative path to absolute", () => {
    const resolved = resolveOutPath("out/review.html");
    expect(isAbsolute(resolved)).toBe(true);
    expect(resolved.endsWith("/out/review.html")).toBe(true);
  });

  test("names copied font assets by prefix and face", () => {
    expect(fontAssetName("c0", "boldItalic", "/fonts/A.ttf")).toBe(
      "c0-boldItalic.ttf",
    );
    expect(fontAssetName("ref", "regular", "/fonts/A")).toBe("ref-regular.ttf");
  });
});

describe("face and glyph helpers", () => {
  test("recognizes the four face slots", () => {
    for (const slot of FACE_SLOTS) expect(isFaceSlot(slot)).toBe(true);
    expect(isFaceSlot("black")).toBe(false);
  });

  test("formatCodepoint pads to four hex digits", () => {
    expect(formatCodepoint(0x61)).toBe("U+0061");
    expect(formatCodepoint(0x26)).toBe("U+0026");
  });

  test("the overlay glyph set is non-empty and unique", () => {
    expect(OVERLAY_GLYPHS.length).toBeGreaterThan(0);
    expect(new Set(OVERLAY_GLYPHS).size).toBe(OVERLAY_GLYPHS.length);
  });
});

describe("escapeHtml", () => {
  test("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x" class='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; class=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});

function sampleApp(): VisualReviewApp {
  return {
    family: "Verdana",
    reference: {
      label: "Reference",
      faces: {
        regular: {
          asset: "assets/fonts/ref-regular.ttf",
          sourceName: "Reference.ttf",
        },
        bold: {
          asset: "assets/fonts/ref-bold.ttf",
          sourceName: "Reference Bold.ttf",
        },
      },
    },
    candidates: [
      {
        label: "Inter <b>",
        faces: {
          regular: {
            asset: "assets/fonts/c0-regular.ttf",
            sourceName: "Inter.ttf",
          },
          bold: {
            asset: "assets/fonts/c0-bold.ttf",
            sourceName: "Inter Bold.ttf",
          },
        },
      },
    ],
  };
}

describe("renderVisualReviewApp", () => {
  test("produces a complete HTML document with font-face rules", () => {
    const html = renderVisualReviewApp(sampleApp());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Visual review: Verdana</title>");
    expect(html).toContain('@font-face { font-family: "docfonts-ref-regular"');
    expect(html).toContain('src: url("assets/fonts/c0-regular.ttf")');
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  test("escapes visible labels and serializes safe JSON", () => {
    const html = renderVisualReviewApp(sampleApp());
    expect(html).not.toContain("<b>");
    expect(html).toContain('"label":"Inter \\u003cb>"');
  });

  test("embeds the face selector and overlay app script", () => {
    const html = renderVisualReviewApp(sampleApp());
    expect(html).toContain('id="face-toolbar"');
    expect(html).toContain("let selectedFace = firstAvailableFace");
    expect(html).toContain("Cyan is reference, magenta is candidate");
  });

  test("falls back to a placeholder family", () => {
    const app = sampleApp();
    app.family = undefined;
    const html = renderVisualReviewApp(app);
    expect(html).toContain("Visual review: (family not specified)");
  });
});

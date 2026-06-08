/**
 * Behavior contract for the 0.2 fallback API. The load-bearing guarantees: getFallbackDecision tells
 * the honest cases apart (a known font with no open substitute is NOT the same as an unknown font, and
 * a substitute you do not bundle is its own case); getRenderableFallback / createFallbackMap only ever
 * hand back a family the consumer can actually render.
 */
import { describe, expect, test } from "bun:test";
import {
  createFallbackMap,
  type GlyphException,
  getFallbackDecision,
  getFallbackDecisionForFace,
  getRenderableFallback,
  getRenderableFallbackForFace,
  normalizeFamilyName,
  SUBSTITUTION_EVIDENCE,
} from "./src/index";

// A consumer that ships exactly these five open fallback families.
const BUNDLED = new Set([
  "Carlito",
  "Caladea",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
]);
const canRenderFamily = (f: string) => BUNDLED.has(f);

describe("getFallbackDecision", () => {
  test("a renderable substitute -> kind 'fallback' with the resolved family", () => {
    expect(getFallbackDecision("Helvetica", { canRenderFamily })).toEqual({
      kind: "fallback",
      fallback: {
        substituteFamily: "Liberation Sans",
        policyAction: "substitute",
        verdict: "metric_safe",
        lineBreakSafe: true,
        faces: { regular: true, bold: true, italic: true, boldItalic: true },
        evidenceId: "helvetica",
        generic: "sans-serif",
      },
    });
  });

  test("a substitute the consumer does NOT bundle -> kind 'asset_missing' (not null, not unknown)", () => {
    // Georgia -> Gelasio is a real substitute; a consumer that doesn't ship Gelasio sees which font to add.
    expect(getFallbackDecision("Georgia", { canRenderFamily })).toEqual({
      kind: "asset_missing",
      substituteFamily: "Gelasio",
      verdict: "near_metric",
      evidenceId: "georgia",
      generic: "serif",
    });
  });

  test("a measured 'no open font' is distinct from an unknown font", () => {
    // The whole point of the decision API: docfonts MEASURED Aptos and Tahoma; it never heard of "Foo".
    expect(getFallbackDecision("Aptos")).toEqual({
      kind: "customer_supplied",
      evidenceId: "aptos",
      generic: "sans-serif",
    });
    expect(getFallbackDecision("Tahoma")).toEqual({
      kind: "no_recommended_fallback",
      evidenceId: "tahoma",
      generic: "sans-serif",
    });
    expect(getFallbackDecision("Cambria Math")).toEqual({
      kind: "preserve_only",
      evidenceId: "cambria-math",
      generic: "serif",
    });
    expect(getFallbackDecision("Foo Unknown Font")).toEqual({
      kind: "unknown",
    });
  });

  test("without canRenderFamily, a named substitute resolves to 'fallback' (un-gated)", () => {
    expect(getFallbackDecision("Georgia").kind).toBe("fallback");
  });
});

describe("getRenderableFallback", () => {
  test("returns the family to render, or null when nothing is renderable", () => {
    expect(
      getRenderableFallback("Helvetica", { canRenderFamily })?.substituteFamily,
    ).toBe("Liberation Sans");
    // asset_missing, no_recommended_fallback, customer_supplied, preserve_only, unknown -> null here.
    expect(getRenderableFallback("Georgia", { canRenderFamily })).toBeNull();
    expect(getRenderableFallback("Aptos", { canRenderFamily })).toBeNull();
    expect(
      getRenderableFallback("Foo Unknown", { canRenderFamily }),
    ).toBeNull();
  });

  test("lineBreakSafe covers the advance-preserving verdicts (metric_safe | near_metric | cell_width_only)", () => {
    const SAFE = new Set(["metric_safe", "near_metric", "cell_width_only"]);
    for (const row of SUBSTITUTION_EVIDENCE) {
      const fb = getRenderableFallback(row.logicalFamily, {
        canRenderFamily: () => true,
      });
      if (!fb) continue;
      expect(fb.lineBreakSafe, `${row.evidenceId} (${row.verdict})`).toBe(
        SAFE.has(row.verdict),
      );
    }
  });

  test("a monospace cell_width_only substitute is lineBreakSafe (advances match)", () => {
    // Consolas -> Inconsolata SemiExpanded: glyph shapes differ, but cell width (every advance) matches.
    const fb = getRenderableFallback("Consolas", {
      canRenderFamily: () => true,
    });
    expect(fb?.verdict).toBe("cell_width_only");
    expect(fb?.lineBreakSafe).toBe(true);
  });
});

describe("createFallbackMap", () => {
  test("only includes families the consumer can render, keyed by normalized logical family", () => {
    const map = createFallbackMap({ canRenderFamily });
    expect(Object.keys(map).sort()).toEqual([
      "arial",
      "calibri",
      "calibri light",
      "cambria",
      "courier new",
      "helvetica",
      "times new roman",
    ]);
    expect(map.helvetica.substituteFamily).toBe("Liberation Sans");
    // Each entry carries the logical font's generic, so a face-aware resolver can emit a keyword.
    expect(map.helvetica.generic).toBe("sans-serif");
    expect(map["times new roman"].generic).toBe("serif");
    expect(map["courier new"].generic).toBe("monospace");
    // Georgia/Arial Narrow/Baskerville point at un-bundled families, so they are absent.
    expect(map.georgia).toBeUndefined();
  });

  test("canRenderFamily is required (asset-safety enforced by the type)", () => {
    // @ts-expect-error - a render map must be asset-safe; omitting canRenderFamily is a compile error.
    const unsafe = () => createFallbackMap();
    expect(typeof unsafe).toBe("function");
  });
});

describe("normalizeFamilyName (public)", () => {
  test("trims, strips quotes, lowercases - matches the map keys", () => {
    expect(normalizeFamilyName("Times New Roman")).toBe("times new roman");
    expect(normalizeFamilyName("  'CALIBRI'  ")).toBe("calibri");
    const map = createFallbackMap({ canRenderFamily });
    expect(map[normalizeFamilyName("Times New Roman")]?.substituteFamily).toBe(
      "Liberation Serif",
    );
  });
});

describe("face-aware lookups (Regular-only safety)", () => {
  const renderAll = { canRenderFamily: () => true };

  test("every FontFallback now carries the substitute's face coverage", () => {
    // The family-level result is self-describing, so a map consumer can route per-face.
    expect(
      getRenderableFallback("Baskerville Old Face", renderAll)?.faces,
    ).toEqual({
      regular: true,
      bold: false,
      italic: false,
      boldItalic: false,
    });
  });

  test("a Regular-only substitute is returned for Regular and NULL for bold/italic", () => {
    // Baskerville -> Bacasime is Regular-only. The face-safe lookup must not route bold to it.
    expect(
      getRenderableFallbackForFace("Baskerville Old Face", "regular", renderAll)
        ?.substituteFamily,
    ).toBe("Bacasime Antique");
    expect(
      getRenderableFallbackForFace("Baskerville Old Face", "bold", renderAll),
    ).toBeNull();
    expect(
      getRenderableFallbackForFace("Baskerville Old Face", "italic", renderAll),
    ).toBeNull();
  });

  test("an uncovered face is `face_missing`, not `unknown` or null collapse", () => {
    expect(
      getFallbackDecisionForFace(
        "Baskerville Old Face",
        "boldItalic",
        renderAll,
      ),
    ).toEqual({
      kind: "face_missing",
      substituteFamily: "Bacasime Antique",
      evidenceId: "baskerville-old-face",
      generic: "serif",
    });
  });

  test("a covered face carries its OWN verdict, not the worst-face rollup", () => {
    // Cambria rolls up to visual_only (Bold Italic), but the regular face is metric_safe.
    expect(getRenderableFallback("Cambria", renderAll)?.verdict).toBe(
      "visual_only",
    );
    expect(
      getRenderableFallbackForFace("Cambria", "regular", renderAll)?.verdict,
    ).toBe("metric_safe");
    expect(
      getRenderableFallbackForFace("Cambria", "boldItalic", renderAll)?.verdict,
    ).toBe("visual_only");
  });

  test("face-aware lookups stay asset-aware and honest for non-fallback families", () => {
    // Not bundled -> asset_missing (face is moot). Unknown / policy rows pass through unchanged.
    expect(
      getFallbackDecisionForFace("Baskerville Old Face", "regular", {
        canRenderFamily: () => false,
      }).kind,
    ).toBe("asset_missing");
    expect(getFallbackDecisionForFace("Foo Unknown", "regular").kind).toBe(
      "unknown",
    );
    expect(getFallbackDecisionForFace("Aptos", "regular").kind).toBe(
      "customer_supplied",
    );
  });

  test("a category fallback (all-false faces) is NOT face-scoped: it renders for EVERY face", () => {
    // Regression: Calibri Light -> Carlito is a category_fallback with all-false faces. That means
    // "not face-scoped", not "no faces" - it must render for every face, never face_missing.
    const carlito = { canRenderFamily: (f: string) => f === "Carlito" };
    for (const face of ["regular", "bold", "italic", "boldItalic"] as const) {
      expect(
        getRenderableFallbackForFace("Calibri Light", face, carlito)
          ?.substituteFamily,
        `Calibri Light ${face}`,
      ).toBe("Carlito");
    }
    // ...while a genuinely face-scoped Regular-only row still gates bold to face_missing.
    expect(
      getFallbackDecisionForFace("Baskerville Old Face", "bold", {
        canRenderFamily: () => true,
      }).kind,
    ).toBe("face_missing");
  });
});

describe("glyphExceptions projection", () => {
  const renderAll = { canRenderFamily: () => true };

  test("a family lookup carries ALL the row's glyph exceptions", () => {
    // Cambria -> Caladea's only exception is the Bold Italic grave accent (U+0060).
    const fb = getRenderableFallback("Cambria", renderAll);
    expect(fb?.verdict).toBe("visual_only");
    expect(fb?.glyphExceptions).toMatchObject([
      { slot: "boldItalic", codepoint: 0x60 },
    ]);
  });

  test("a face lookup carries ONLY that face's exceptions (and per-face verdict)", () => {
    const regular = getRenderableFallbackForFace(
      "Cambria",
      "regular",
      renderAll,
    );
    expect(regular?.verdict).toBe("metric_safe");
    expect(regular?.glyphExceptions).toBeUndefined(); // no Bold-Italic exception leaks onto Regular

    const boldItalic = getRenderableFallbackForFace(
      "Cambria",
      "boldItalic",
      renderAll,
    );
    expect(boldItalic?.verdict).toBe("visual_only");
    expect(boldItalic?.glyphExceptions).toMatchObject([
      { slot: "boldItalic", codepoint: 0x60 },
    ]);
  });

  test("a fallback with no exceptions omits the field entirely", () => {
    expect(
      getRenderableFallback("Calibri", renderAll)?.glyphExceptions,
    ).toBeUndefined();
    expect(
      getRenderableFallbackForFace("Calibri", "regular", renderAll)
        ?.glyphExceptions,
    ).toBeUndefined();
  });

  test("returns a FRESH array each call - mutating it does not corrupt a later lookup", () => {
    const first = getRenderableFallback("Cambria", renderAll)
      ?.glyphExceptions as GlyphException[];
    expect(first.length).toBe(1);
    first.push(first[0]); // a careless consumer mutates the returned array
    expect(
      getRenderableFallback("Cambria", renderAll)?.glyphExceptions,
    ).toHaveLength(1);
  });
});

describe("generic CSS family metadata", () => {
  const renderAll = { canRenderFamily: () => true };

  test("every evidence row carries one of the broad generic categories", () => {
    const GENERICS = new Set(["serif", "sans-serif", "monospace"]);
    for (const row of SUBSTITUTION_EVIDENCE) {
      expect(
        GENERICS.has(row.generic),
        `${row.evidenceId} (${row.generic})`,
      ).toBe(true);
    }
  });

  test("a resolved fallback projects the logical font's generic", () => {
    expect(getRenderableFallback("Cambria", renderAll)?.generic).toBe("serif");
    expect(getRenderableFallback("Calibri", renderAll)?.generic).toBe(
      "sans-serif",
    );
    expect(getRenderableFallback("Consolas", renderAll)?.generic).toBe(
      "monospace",
    );
  });
});

describe("advance measurement basis", () => {
  test("every measured row states which sample/model produced its deltas", () => {
    const BASES = new Set(["latin_full", "latin_text", "monospace_cell"]);
    for (const row of SUBSTITUTION_EVIDENCE) {
      if (!row.advance) continue;
      expect(
        BASES.has(row.advance.basis),
        `${row.evidenceId} (${row.advance.basis})`,
      ).toBe(true);
    }
  });

  test("monospace cell-width rows are not labeled as proportional Latin measurements", () => {
    expect(
      SUBSTITUTION_EVIDENCE.find((row) => row.evidenceId === "consolas")
        ?.advance?.basis,
    ).toBe("monospace_cell");
    expect(
      SUBSTITUTION_EVIDENCE.find((row) => row.evidenceId === "calibri")?.advance
        ?.basis,
    ).toBe("latin_full");
  });
});

describe("Cooper Black -> Caprasimo (Regular-only, metric_safe)", () => {
  const renderAll = { canRenderFamily: () => true };
  const onlyCaprasimo = { canRenderFamily: (f: string) => f === "Caprasimo" };

  test("the family resolves to Caprasimo as an exact, line-break-safe Regular substitute", () => {
    // Unlike Baskerville -> Bacasime (visual_only, NBSP reflows), Cooper measures 0% across the Latin
    // core, so the row is metric_safe with no glyph exceptions.
    expect(getRenderableFallback("Cooper Black", renderAll)).toEqual({
      substituteFamily: "Caprasimo",
      policyAction: "substitute",
      verdict: "metric_safe",
      lineBreakSafe: true,
      faces: { regular: true, bold: false, italic: false, boldItalic: false },
      evidenceId: "cooper-black",
      generic: "serif",
    });
  });

  test("Regular maps; bold/italic/boldItalic are face_missing (never faux-styled onto Caprasimo)", () => {
    expect(
      getRenderableFallbackForFace("Cooper Black", "regular", renderAll)
        ?.substituteFamily,
    ).toBe("Caprasimo");
    for (const face of ["bold", "italic", "boldItalic"] as const) {
      expect(
        getRenderableFallbackForFace("Cooper Black", face, renderAll),
        `Cooper Black ${face}`,
      ).toBeNull();
      expect(
        getFallbackDecisionForFace("Cooper Black", face, renderAll),
        `Cooper Black ${face} decision`,
      ).toEqual({
        kind: "face_missing",
        substituteFamily: "Caprasimo",
        evidenceId: "cooper-black",
        generic: "serif",
      });
    }
  });

  test("stays asset-aware: a consumer that does not bundle Caprasimo gets asset_missing, not a render", () => {
    // Asset gate: Cooper stays inert until a consumer actually bundles Caprasimo.
    expect(
      getFallbackDecision("Cooper Black", { canRenderFamily: () => false }),
    ).toEqual({
      kind: "asset_missing",
      substituteFamily: "Caprasimo",
      verdict: "metric_safe",
      evidenceId: "cooper-black",
      generic: "serif",
    });
    expect(
      getRenderableFallbackForFace("Cooper Black", "regular", onlyCaprasimo)
        ?.substituteFamily,
    ).toBe("Caprasimo");
  });
});

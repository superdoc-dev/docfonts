/**
 * Behavior contract for the public fallback helpers: honest action labels, asset-aware routing, and
 * null for unknown or non-renderable rows.
 */
import { describe, expect, test } from "bun:test";
import {
  deriveFallbackMap,
  getFallback,
  SUBSTITUTION_EVIDENCE,
} from "./src/index";

// Sample consumer bundle for asset-gating tests.
const BUNDLED = new Set([
  "Carlito",
  "Caladea",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
]);
const hasFamily = (f: string) => BUNDLED.has(f);

describe("getFallback", () => {
  test("a metric substitute resolves to its open family, marked faithful", () => {
    expect(getFallback("Helvetica", { hasFamily })).toEqual({
      family: "Liberation Sans",
      action: "substitute",
      verdict: "metric_safe",
      faithful: true,
      evidenceId: "helvetica",
    });
  });

  test("a category fallback is reported as such and is NOT faithful", () => {
    expect(getFallback("Calibri Light", { hasFamily })).toEqual({
      family: "Carlito",
      action: "category_fallback",
      verdict: "visual_only",
      faithful: false,
      evidenceId: "calibri-light",
    });
  });

  test("case- and quote-insensitive lookup", () => {
    expect(getFallback("  'CALIBRI'  ", { hasFamily })?.family).toBe("Carlito");
  });

  test("a substitute whose family the consumer does NOT bundle resolves to null (inert row)", () => {
    expect(getFallback("Georgia")?.family).toBe("Gelasio");
    expect(getFallback("Georgia", { hasFamily })).toBeNull();
  });

  test("Baskerville (Regular-only) resolves the family; face routing is the consumer's job", () => {
    expect(getFallback("Baskerville Old Face")?.family).toBe(
      "Bacasime Antique",
    );
    const row = SUBSTITUTION_EVIDENCE.find(
      (r) => r.evidenceId === "baskerville-old-face",
    );
    expect(row?.faces).toEqual({
      regular: true,
      bold: false,
      italic: false,
      boldItalic: false,
    });
  });

  test("unknown family, and a row that recommends no substitute, resolve to null", () => {
    expect(getFallback("Comic Papyrus Nonexistent", { hasFamily })).toBeNull();
    // Aptos is no_substitute (physicalFamily null) and Cambria Math is preserve_only (null): both null.
    expect(getFallback("Aptos", { hasFamily })).toBeNull();
    expect(getFallback("Cambria Math", { hasFamily })).toBeNull();
  });

  test("faithful is exactly the two metric-grade bands (metric_safe | near_metric)", () => {
    for (const row of SUBSTITUTION_EVIDENCE) {
      if (row.physicalFamily === null) continue;
      const fb = getFallback(row.logicalFamily);
      const expected =
        row.verdict === "metric_safe" || row.verdict === "near_metric";
      expect(fb?.faithful, `${row.evidenceId} (${row.verdict})`).toBe(expected);
    }
  });
});

describe("deriveFallbackMap", () => {
  test("keys are the active, bundled logical families (lowercased); inert rows excluded", () => {
    const map = deriveFallbackMap({ hasFamily });
    // The 5-family bundle activates exactly the seven rows whose physical family it ships (six
    // substitutes + the Calibri Light category fallback, which also points at the bundled Carlito).
    expect(Object.keys(map).sort()).toEqual([
      "arial",
      "calibri",
      "calibri light",
      "cambria",
      "courier new",
      "helvetica",
      "times new roman",
    ]);
    expect(map.helvetica.family).toBe("Liberation Sans");
    // Georgia/Arial Narrow/Baskerville point at un-bundled families, so they are absent.
    expect(map.georgia).toBeUndefined();
  });

  test("deriveFallbackMap will not compile without hasFamily (asset-safety is enforced by the type)", () => {
    // @ts-expect-error - hasFamily is required; an ungated render map is a compile error by design.
    const unsafe = () => deriveFallbackMap();
    expect(typeof unsafe).toBe("function");
  });

  test("hasFamily is required, and a bundle-everything consumer activates all renderable rows", () => {
    const map = deriveFallbackMap({ hasFamily: () => true });
    const renderable = SUBSTITUTION_EVIDENCE.filter(
      (r) =>
        r.physicalFamily !== null &&
        (r.policyAction === "substitute" ||
          r.policyAction === "category_fallback"),
    ).length;
    expect(Object.keys(map).length).toBe(renderable);
    expect(map.georgia?.family).toBe("Gelasio");
  });
});

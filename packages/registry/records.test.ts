/**
 * Contract tests for the two record sources, kept distinct on purpose:
 *   - loadRecords()     -> the CANONICAL generated registry (data/registry/records.json). Empty until
 *                          scripts/import-research.ts runs. Empty is a valid state, NOT a build failure.
 *   - loadSeedRecords() -> the INTERIM research seed the site renders from for now. Must be present,
 *                          schema-valid, and factually shaped.
 * We deliberately do NOT assert "empty records.json must fall back to the seed" - that silent fallback
 * was removed; the seed is an explicit, temporary source, not the production contract.
 */
import { describe, expect, test } from "bun:test";
import {
  findByOriginal,
  loadRecords,
  loadSeedRecords,
  validateRecords,
  withVerdict,
} from "./src/index";

describe("loadRecords (canonical generated registry)", () => {
  const records = loadRecords();

  test("is an array and is schema-valid (empty is allowed until the importer runs)", () => {
    expect(Array.isArray(records)).toBe(true);
    expect(validateRecords(records).ok).toBe(true);
  });
});

describe("loadSeedRecords (interim research seed)", () => {
  const records = loadSeedRecords();

  test("is present and schema-valid", () => {
    expect(records.length).toBeGreaterThanOrEqual(9);
    expect(validateRecords(records)).toEqual({ ok: true, errors: [] });
  });

  test("includes the load-bearing example pages (a pass and the honest no)", () => {
    const ids = records.map((r) => r.evidenceId);
    expect(ids).toContain("calibri");
    expect(ids).toContain("aptos");
  });

  test("Calibri is a metric_safe Carlito substitute", () => {
    const [calibri] = findByOriginal(records, "Calibri");
    expect(calibri?.verdict).toBe("metric_safe");
    expect(calibri?.candidate?.candidateFamily).toBe("Carlito");
  });

  test("Aptos is no_substitute with no candidate", () => {
    const [aptos] = findByOriginal(records, "Aptos");
    expect(aptos?.verdict).toBe("no_substitute");
    expect(aptos?.candidate ?? null).toBeNull();
  });

  test("every metric_safe record has a candidate and an in-threshold advance", () => {
    for (const r of withVerdict(records, "metric_safe")) {
      expect(r.candidate?.candidateFamily).toBeTruthy();
      // direct threshold: weighted-mean advance <= 0.5%.
      expect(r.advance?.meanDelta ?? 1).toBeLessThanOrEqual(0.005);
    }
  });

  test("a layout=pass gate is backed by a face_aggregate or live_layout proof ref", () => {
    for (const r of records) {
      if (r.gates.layout !== "pass") continue;
      const backed = r.measurementRefs.some(
        (ref) =>
          ref.includes("#face_aggregate#") || ref.includes("#live_layout#"),
      );
      expect(backed).toBe(true);
    }
  });

  test("no_substitute records never carry a candidate", () => {
    for (const r of withVerdict(records, "no_substitute")) {
      expect(r.candidate ?? null).toBeNull();
    }
  });
});

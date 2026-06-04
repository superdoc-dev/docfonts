/**
 * Regression guard for the registry data. The schema accepts an empty array, so {ok:true} alone is
 * not enough - these tests assert the records are actually present and shaped right, which is what
 * makes the site build its /fonts/<font> pages. If records.json reverts to [] and the seed is also
 * missing, this goes red instead of silently building a 2-page site.
 */
import { describe, expect, test } from "bun:test";
import {
  findByOriginal,
  loadRecords,
  validateRecords,
  withVerdict,
} from "./src/index";
import { SEED_RECORDS } from "./src/seed";

describe("loadRecords", () => {
  const records = loadRecords();

  test("is non-empty (the empty-array reset must fail the build, not pass it)", () => {
    expect(records.length).toBeGreaterThanOrEqual(9);
  });

  test("validates against EVIDENCE_RECORDS_SCHEMA", () => {
    const res = validateRecords(records);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  test("includes the pages the site must generate", () => {
    const ids = records.map((r) => r.evidenceId);
    // /fonts/calibri and /fonts/aptos are load-bearing examples (a pass and the honest no).
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

  test("no_substitute records never carry a candidate", () => {
    for (const r of withVerdict(records, "no_substitute")) {
      expect(r.candidate ?? null).toBeNull();
    }
  });
});

describe("SEED_RECORDS", () => {
  test("is itself non-empty and schema-valid (the durable fallback source)", () => {
    expect(SEED_RECORDS.length).toBeGreaterThanOrEqual(9);
    expect(validateRecords(SEED_RECORDS).ok).toBe(true);
  });
});

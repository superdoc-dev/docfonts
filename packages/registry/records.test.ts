/**
 * Contract tests for the CANONICAL registry: loadRecords() reads data/registry/records.json, the
 * hand-curated source of truth. (scripts/import-research.ts seeded it originally but is no longer
 * authoritative - see its header.) Validated against the committed measurement set (ref resolution +
 * layout-gate<->proof), so a dangling ref fails the build.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  findByOriginal,
  loadRecords,
  type MeasurementKind,
  validateRecords,
  withVerdict,
} from "./src/index";

/** Load the committed measurement index (id + kind) so records can be validated for ref resolution. */
function measurementIndex(): {
  measurementId: string;
  kind: MeasurementKind;
}[] {
  const dir = join(import.meta.dir, "data", "measurements");
  const out: { measurementId: string; kind: MeasurementKind }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const arr = JSON.parse(readFileSync(join(dir, f), "utf8")) as {
      measurementId: string;
      kind: MeasurementKind;
    }[];
    for (const m of arr)
      out.push({ measurementId: m.measurementId, kind: m.kind });
  }
  return out;
}

describe("loadRecords (canonical hand-curated registry)", () => {
  const records = loadRecords();

  test("is present + non-empty", () => {
    expect(records.length).toBeGreaterThanOrEqual(7);
  });

  test("validates against the schema AND the committed measurement set (no dangling refs)", () => {
    const res = validateRecords(records, { measurements: measurementIndex() });
    expect(res.errors).toEqual([]);
    expect(res.ok).toBe(true);
  });

  test("every metric-claiming record is backed by a measurement (policy rows are exempt)", () => {
    // preserve_only / customer_supplied make NO per-glyph metric claim, so they need no measurement.
    // Everything that asserts a measured result (incl. the measured "no" of no_substitute) must.
    const POLICY = new Set(["preserve_only", "customer_supplied"]);
    for (const r of records) {
      if (POLICY.has(r.verdict)) continue;
      expect(r.measurementRefs.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("Calibri is a metric_safe Carlito substitute", () => {
    const [calibri] = findByOriginal(records, "Calibri");
    expect(calibri?.verdict).toBe("metric_safe");
    expect(calibri?.candidate?.candidateFamily).toBe("Carlito");
  });

  test("Aptos is no_substitute with no candidate, no record-level advance", () => {
    const [aptos] = findByOriginal(records, "Aptos");
    expect(aptos?.verdict).toBe("no_substitute");
    expect(aptos?.candidate ?? null).toBeNull();
    expect(aptos?.advance).toBeUndefined();
  });

  test("Consolas is cell_width_only (the curated verdict, not a prose guess)", () => {
    const [consolas] = findByOriginal(records, "Consolas");
    expect(consolas?.verdict).toBe("cell_width_only");
  });

  test("every metric_safe record has a candidate and a direct-threshold advance (mean<=0.5%, max<=1%)", () => {
    for (const r of withVerdict(records, "metric_safe")) {
      expect(r.candidate?.candidateFamily).toBeTruthy();
      expect(r.advance?.meanDelta ?? 1).toBeLessThanOrEqual(0.005);
      expect(r.advance?.maxDelta ?? 1).toBeLessThanOrEqual(0.01);
    }
  });

  test("every near_metric record's advance is inside the likely band (mean<=1%, max<=2.5%, over direct)", () => {
    for (const r of withVerdict(records, "near_metric")) {
      expect(r.candidate?.candidateFamily).toBeTruthy();
      const mean = r.advance?.meanDelta ?? 1;
      const max = r.advance?.maxDelta ?? 1;
      // within the likely band...
      expect(mean).toBeLessThanOrEqual(0.01);
      expect(max).toBeLessThanOrEqual(0.025);
      // ...and genuinely a near-miss, not silently within the direct (metric_safe) band.
      expect(max).toBeGreaterThan(0.01);
    }
  });

  test("no_substitute records never carry a candidate", () => {
    for (const r of withVerdict(records, "no_substitute")) {
      expect(r.candidate ?? null).toBeNull();
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
});

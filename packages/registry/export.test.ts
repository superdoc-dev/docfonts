/**
 * Contract tests for the PUBLIC substitution-evidence export (data/registry/substitution-evidence.json):
 * the renderer-facing projection a consumer vendors instead of hand-copying EvidenceRecords. These
 * enforce the two things that make it safe to ship: it is a FAITHFUL, reproducible projection of the
 * canonical records (no drift, no fabricated fields), and it is HYGIENIC - it leaks none of the records'
 * editorial prose or provenance labels (notes / confidence / measured dates / oracle environments /
 * local paths). Plus the one structural guarantee a renderer relies on: substitute rows resolve to the
 * reviewed corpus, and faces are keyed by RIBBI `slot`, never the record's `styleKey`.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  exportSubstitutionEvidence,
  loadCorpus,
  loadRecords,
  loadSubstitutionEvidence,
  toSubstitutionEvidence,
} from "./src/index";

/** Keys that carry editorial prose or provenance and must NEVER appear on an exported row. */
const FORBIDDEN_KEYS = [
  "notes",
  "confidence",
  "measuredDate",
  "candidateLicenseSource",
  "originalFont",
  "candidate",
  "originalOracleEnv",
  "styleKey",
] as const;

describe("substitution-evidence export (renderer-facing projection)", () => {
  const evidence = loadSubstitutionEvidence();
  const records = loadRecords();

  test("committed artifact is exactly a fresh export of the canonical records (no drift)", () => {
    // The single anti-drift guarantee: regenerating from records.json must reproduce the committed file.
    expect(evidence).toEqual(exportSubstitutionEvidence(records));
    // and it covers every record, one row each, in order.
    expect(evidence.map((e) => e.evidenceId)).toEqual(
      records.map((r) => r.evidenceId),
    );
  });

  test("no row leaks an editorial-prose or provenance key", () => {
    for (const row of evidence) {
      for (const k of FORBIDDEN_KEYS) {
        expect(k in row, `${row.evidenceId} must not carry "${k}"`).toBe(false);
      }
      // glyph exceptions key the face as `slot`, never the record's `styleKey`.
      for (const g of row.glyphExceptions ?? [])
        expect("styleKey" in g).toBe(false);
    }
  });

  test("the raw artifact text carries no local path or oracle-environment leak", () => {
    const raw = readFileSync(
      join(import.meta.dir, "data", "registry", "substitution-evidence.json"),
      "utf8",
    );
    for (const needle of [
      "/Users/",
      "/Applications/",
      "/System/",
      "DFonts",
      "Microsoft Word",
      "macOS",
      "originalOracleEnv",
    ]) {
      expect(raw.includes(needle), `must not contain "${needle}"`).toBe(false);
    }
  });

  test("every row carries a policyAction and the preserve_original_name export rule", () => {
    for (const row of evidence) {
      expect(row.policyAction, row.evidenceId).toBeTruthy();
      expect(row.exportRule).toBe("preserve_original_name");
    }
  });

  test("projection is faithful: logical/physical/verdict/gates mirror the source record", () => {
    const byId = new Map(records.map((r) => [r.evidenceId, r]));
    for (const row of evidence) {
      const r = byId.get(row.evidenceId);
      expect(r, row.evidenceId).toBeTruthy();
      if (!r) continue;
      expect(row.logicalFamily).toBe(r.originalFont);
      expect(row.physicalFamily).toBe(r.candidate?.candidateFamily ?? null);
      expect(row.verdict).toBe(r.verdict);
      expect(row.gates).toEqual(r.gates);
      expect(r.policyAction).toBe(row.policyAction);
      expect(row.measurementRefs).toEqual(r.measurementRefs);
      // a renderer must not see a measurementRef the source record never claimed.
      for (const ref of row.measurementRefs)
        expect(r.measurementRefs).toContain(ref);
    }
  });

  test("glyph exceptions map styleKey -> RIBBI slot (Cambria grave, Baskerville NBSP)", () => {
    const cambria = evidence.find((e) => e.evidenceId === "cambria");
    const grave = cambria?.glyphExceptions?.[0];
    expect(grave?.slot).toBe("boldItalic");
    expect(grave?.codepoint).toBe(0x60);

    const bask = evidence.find((e) => e.evidenceId === "baskerville-old-face");
    const nbsp = bask?.glyphExceptions?.[0];
    expect(nbsp?.slot).toBe("regular");
    expect(nbsp?.codepoint).toBe(0xa0);
    // Baskerville is Regular-only: a consumer must route bold/italic/boldItalic through face-aware
    // absence handling, so the projection must report only regular as covered.
    expect(bask?.faces).toEqual({
      regular: true,
      bold: false,
      italic: false,
      boldItalic: false,
    });
  });

  test("every substitute row's physical family resolves to the reviewed corpus", () => {
    const corpusFamilies = new Set(
      loadCorpus().flatMap((m) => m.families.map((f) => f.family)),
    );
    for (const row of evidence) {
      if (row.policyAction !== "substitute" || row.physicalFamily === null)
        continue;
      expect(
        corpusFamilies.has(row.physicalFamily),
        `${row.evidenceId} -> ${row.physicalFamily} must be in the reviewed corpus`,
      ).toBe(true);
    }
  });

  test("when faceVerdicts are present the top-level verdict equals the worst face (honest rollup)", () => {
    const SEVERITY: Record<string, number> = {
      metric_safe: 0,
      near_metric: 1,
      cell_width_only: 2,
      visual_only: 3,
      customer_supplied: 4,
      preserve_only: 5,
      no_substitute: 6,
    };
    for (const row of evidence) {
      const fv = row.faceVerdicts;
      if (!fv) continue;
      const worst = Object.values(fv).reduce((w, v) =>
        SEVERITY[v] > SEVERITY[w] ? v : w,
      );
      expect(row.verdict, row.evidenceId).toBe(worst);
    }
  });

  test("toSubstitutionEvidence rejects a non-RIBBI face and a record with no policyAction", () => {
    const base = records.find((r) => r.evidenceId === "cambria");
    expect(base).toBeTruthy();
    if (!base) return;
    // a glyph exception on the non-RIBBI "other" slot has no renderer face to attach to.
    expect(() =>
      toSubstitutionEvidence({
        ...base,
        glyphExceptions: [
          { styleKey: "other", codepoint: 0x41, advanceDelta: 0.1, note: "x" },
        ],
      }),
    ).toThrow(/not a RIBBI slot/);
    // a record a renderer would key off must declare its action.
    expect(() =>
      toSubstitutionEvidence({ ...base, policyAction: undefined }),
    ).toThrow(/no policyAction/);
  });
});

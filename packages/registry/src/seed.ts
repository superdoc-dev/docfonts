/**
 * Hand-seeded evidence records, carried from font-fidelity-research (scorecard 2026-06-03 +
 * word-font-decision-catalog). This TypeScript module is the DURABLE source until
 * scripts/import-research.ts regenerates data/registry/records.json from corpus + measurements.
 *
 * Typed as EvidenceRecord[], so the seed is validated at COMPILE time (stronger than the JSON
 * schema, which accepts an empty array). loadRecords() uses records.json when it is non-empty and
 * falls back to this seed otherwise, so a fresh build reproduces the full site from saved source.
 *
 * Every number here is measured, not asserted. metric_safe = advance within the direct threshold
 * (analytic-hmtx); ship stays not_run until a live SuperDoc-vs-Word layout proof exists.
 */
import type { EvidenceRecord } from "./types";

export const SEED_RECORDS: EvidenceRecord[] = [
  {
    evidenceId: "calibri",
    originalFont: "Calibri",
    candidate: { candidateFamily: "Carlito" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (google/fonts ofl/carlito)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: ["calibri__carlito#analytic_advance#2026-06-03"],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live SuperDoc-vs-Word layout proof still required before ship.",
  },
  {
    evidenceId: "arial",
    originalFont: "Arial",
    candidate: { candidateFamily: "Liberation Sans" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (RedHat liberation-fonts)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: ["arial__liberation-sans#analytic_advance#2026-06-03"],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live layout proof still required before ship.",
  },
  {
    evidenceId: "times-new-roman",
    originalFont: "Times New Roman",
    candidate: { candidateFamily: "Liberation Serif" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (RedHat liberation-fonts)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: [
      "times-new-roman__liberation-serif#analytic_advance#2026-06-03",
    ],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live layout proof still required before ship.",
  },
  {
    evidenceId: "courier-new",
    originalFont: "Courier New",
    candidate: { candidateFamily: "Liberation Mono" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (RedHat liberation-fonts)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: [
      "courier-new__liberation-mono#analytic_advance#2026-06-03",
    ],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live layout proof still required before ship.",
  },
  {
    evidenceId: "cambria",
    originalFont: "Cambria",
    candidate: { candidateFamily: "Caladea" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0.0001, maxDelta: 0.0005 },
    candidateLicense: "Apache-2.0",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (Fedora google-crosextra-caladea)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: ["cambria__caladea#analytic_advance#2026-06-03"],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live layout proof still required before ship.",
  },
  {
    evidenceId: "georgia",
    originalFont: "Georgia",
    candidate: { candidateFamily: "Gelasio" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (SorkinType/Gelasio)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: ["georgia__gelasio#analytic_advance#2026-06-03"],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). Live layout proof still required before ship.",
  },
  {
    evidenceId: "arial-narrow",
    originalFont: "Arial Narrow",
    candidate: { candidateFamily: "Liberation Sans Narrow" },
    verdict: "metric_safe",
    faces: { regular: true, bold: true, italic: true, boldItalic: true },
    advance: { meanDelta: 0, maxDelta: 0 },
    candidateLicense: "GPLv2-with-font-exception",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (RedHat liberation-fonts)",
    gates: {
      static: "pass",
      metric: "pass",
      layout: "not_run",
      ship: "not_run",
    },
    measurementRefs: [
      "arial-narrow__liberation-sans-narrow#analytic_advance#2026-06-03",
    ],
    policyAction: "substitute",
    confidence: "high",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance within direct threshold (analytic-hmtx). License carries a GPLv2 font exception. Live layout proof still required before ship.",
  },
  {
    evidenceId: "comic-sans-ms",
    originalFont: "Comic Sans MS",
    candidate: { candidateFamily: "Comic Neue" },
    verdict: "visual_only",
    faces: { regular: false, bold: false, italic: false, boldItalic: false },
    advance: { meanDelta: 0.0973, maxDelta: 0.1384 },
    candidateLicense: "OFL-1.1",
    candidateLicenseSource:
      "font-fidelity-research scorecard 2026-06-03 (google/fonts ofl/comicneue)",
    gates: { static: "pass", metric: "fail", layout: "not_run", ship: "fail" },
    measurementRefs: ["comic-sans-ms__comic-neue#analytic_advance#2026-06-03"],
    policyAction: "category_fallback",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "Advance too far for metric fidelity (mean 9.73%, max 13.84%); category-correct visual fallback only. Per-face metric coverage not assessed for a category fallback.",
  },
  {
    evidenceId: "aptos",
    originalFont: "Aptos",
    candidate: null,
    verdict: "no_substitute",
    faces: { regular: false, bold: false, italic: false, boldItalic: false },
    gates: {
      static: "not_run",
      metric: "fail",
      layout: "not_run",
      ship: "fail",
    },
    measurementRefs: ["aptos#analytic_advance#2026-06-03"],
    policyAction: "customer_supplied",
    exportRule: "preserve_original_name",
    measuredDate: "2026-06-03",
    notes:
      "No open metric clone (measured 2026-06-03, analytic-hmtx). Closest open font is Source Sans 3, a visual fallback only (advance 2.84% mean / 6.96% max), which reflows. Policy: customer-supplied first, else a reported visual/category fallback.",
  },
];

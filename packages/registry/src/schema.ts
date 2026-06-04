/**
 * Machine-readable schema + a dependency-free validator for the PUBLIC records.json
 * (EvidenceRecord[]). Consumers and CI can verify a registry export without a JSON-Schema engine.
 * EVIDENCE_RECORDS_SCHEMA is also serialized to data/registry/schema.json.
 */
import type { EvidenceRecord } from "./types";

const VERDICTS = [
  "metric_safe",
  "cell_width_only",
  "visual_only",
  "customer_supplied",
  "preserve_only",
  "no_substitute",
] as const;
const GATE = ["pass", "not_run", "fail"] as const;

export const EVIDENCE_RECORDS_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "docfonts evidence records",
  type: "array",
  items: {
    type: "object",
    required: [
      "evidenceId",
      "originalFont",
      "verdict",
      "faces",
      "gates",
      "measurementRefs",
      "exportRule",
    ],
    properties: {
      evidenceId: { type: "string" },
      originalFont: { type: "string" },
      candidate: { type: ["object", "null"] },
      verdict: { enum: VERDICTS },
      faces: {
        type: "object",
        required: ["regular", "bold", "italic", "boldItalic"],
        properties: {
          regular: { type: "boolean" },
          bold: { type: "boolean" },
          italic: { type: "boolean" },
          boldItalic: { type: "boolean" },
        },
      },
      gates: {
        type: "object",
        required: ["static", "metric", "layout", "ship"],
        properties: {
          static: { enum: GATE },
          metric: { enum: GATE },
          layout: { enum: GATE },
          ship: { enum: GATE },
        },
      },
      measurementRefs: { type: "array", items: { type: "string" } },
      exportRule: { const: "preserve_original_name" },
    },
  },
} as const;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Dependency-free structural validation of a records.json payload against the schema's invariants. */
export function validateRecords(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(data))
    return { ok: false, errors: ["records must be an array"] };
  data.forEach((rec, i) => {
    const r = rec as Partial<EvidenceRecord>;
    const at = `records[${i}]`;
    if (typeof r.evidenceId !== "string" || !r.evidenceId)
      errors.push(`${at}.evidenceId must be a non-empty string`);
    if (typeof r.originalFont !== "string" || !r.originalFont)
      errors.push(`${at}.originalFont must be a non-empty string`);
    if (!VERDICTS.includes(r.verdict as (typeof VERDICTS)[number]))
      errors.push(`${at}.verdict invalid: ${String(r.verdict)}`);
    if (r.exportRule !== "preserve_original_name")
      errors.push(`${at}.exportRule must be "preserve_original_name"`);
    if (!Array.isArray(r.measurementRefs))
      errors.push(`${at}.measurementRefs must be an array`);
    const g = r.gates as Record<string, unknown> | undefined;
    if (!g || typeof g !== "object") errors.push(`${at}.gates missing`);
    else
      for (const k of ["static", "metric", "layout", "ship"] as const) {
        if (!GATE.includes(g[k] as (typeof GATE)[number]))
          errors.push(`${at}.gates.${k} invalid`);
      }
    const f = r.faces as Record<string, unknown> | undefined;
    if (!f || typeof f !== "object") errors.push(`${at}.faces missing`);
    else
      for (const k of ["regular", "bold", "italic", "boldItalic"] as const) {
        if (typeof f[k] !== "boolean")
          errors.push(`${at}.faces.${k} must be boolean`);
      }
  });
  return { ok: errors.length === 0, errors };
}

/**
 * Machine-readable schema + a dependency-free validator for the PUBLIC records.json
 * (EvidenceRecord[]). Consumers and CI can verify a registry export without a JSON-Schema engine.
 * EVIDENCE_RECORDS_SCHEMA is also serialized to data/registry/schema.json.
 */
import type { EvidenceRecord, MeasurementKind } from "./types";

const VERDICTS = [
  "metric_safe",
  "cell_width_only",
  "visual_only",
  "customer_supplied",
  "preserve_only",
  "no_substitute",
] as const;
const GATE = ["pass", "not_run", "fail"] as const;
/** the four named faces plus "other"; faceVerdicts / glyphExceptions key off these. */
const STYLE_KEYS: ReadonlySet<string> = new Set([
  "regular",
  "bold",
  "italic",
  "boldItalic",
  "other",
]);
/**
 * Verdicts that name a specific substitute and therefore must carry a candidate. visual_only is NOT
 * here: a visual row may publish candidate:null (no human-approved pick) with the closest measured
 * fonts shown only in a top_candidates measurement.
 */
const NEEDS_CANDIDATE: ReadonlySet<string> = new Set([
  "metric_safe",
  "cell_width_only",
]);
/** measurement kinds that can substantiate a passing layout gate. */
const LAYOUT_PROOF_KINDS: ReadonlySet<string> = new Set([
  "live_layout",
  "face_aggregate",
]);

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

export interface ValidateOptions {
  /** known measurements (id + kind). When given, refs are resolved and gate<->proof is checked. */
  measurements?: ReadonlyArray<{
    measurementId: string;
    kind: MeasurementKind;
  }>;
}

/**
 * Dependency-free validation of a records.json payload. Beyond the structural schema it enforces
 * registry invariants: unique evidenceIds, candidate shape, verdict<->candidate consistency, and -
 * when `measurements` are supplied - measurement-ref resolution plus the rule that a passing layout
 * gate must be backed by a live_layout or face_aggregate measurement.
 */
export function validateRecords(
  data: unknown,
  opts: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(data))
    return { ok: false, errors: ["records must be an array"] };

  const seenIds = new Set<string>();
  const known = new Map<string, MeasurementKind>();
  for (const m of opts.measurements ?? []) known.set(m.measurementId, m.kind);
  const haveMeasurements = opts.measurements !== undefined;

  data.forEach((rec, i) => {
    const r = rec as Partial<EvidenceRecord>;
    const at = `records[${i}]`;

    if (typeof r.evidenceId !== "string" || !r.evidenceId)
      errors.push(`${at}.evidenceId must be a non-empty string`);
    else if (seenIds.has(r.evidenceId))
      errors.push(`${at}.evidenceId duplicate: ${r.evidenceId}`);
    else seenIds.add(r.evidenceId);

    if (typeof r.originalFont !== "string" || !r.originalFont)
      errors.push(`${at}.originalFont must be a non-empty string`);
    if (!VERDICTS.includes(r.verdict as (typeof VERDICTS)[number]))
      errors.push(`${at}.verdict invalid: ${String(r.verdict)}`);
    if (r.exportRule !== "preserve_original_name")
      errors.push(`${at}.exportRule must be "preserve_original_name"`);

    const refs = r.measurementRefs;
    if (!Array.isArray(refs))
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

    // candidate shape: null/absent is allowed; if present it must carry a candidateFamily string.
    if (r.candidate !== undefined && r.candidate !== null) {
      const c = r.candidate as unknown as Record<string, unknown>;
      if (
        typeof c !== "object" ||
        typeof c.candidateFamily !== "string" ||
        !c.candidateFamily
      ) {
        errors.push(
          `${at}.candidate must be null or carry a non-empty candidateFamily`,
        );
      }
    }

    // verdict <-> candidate consistency
    if (typeof r.verdict === "string") {
      const hasCandidate = r.candidate != null;
      if (r.verdict === "no_substitute" && hasCandidate)
        errors.push(`${at}: no_substitute must not carry a candidate`);
      if (NEEDS_CANDIDATE.has(r.verdict) && !hasCandidate)
        errors.push(`${at}: verdict "${r.verdict}" requires a candidate`);
    }

    // face-scoped evidence (optional): faceVerdicts values are real verdicts on real style keys;
    // glyphExceptions name a style key and carry a note. When present they make the record qualified.
    if (r.faceVerdicts != null) {
      const fv = r.faceVerdicts as Record<string, unknown>;
      for (const [k, v] of Object.entries(fv)) {
        if (!STYLE_KEYS.has(k))
          errors.push(`${at}.faceVerdicts has unknown style key: ${k}`);
        if (!VERDICTS.includes(v as (typeof VERDICTS)[number]))
          errors.push(`${at}.faceVerdicts.${k} invalid verdict: ${String(v)}`);
      }
    }
    if (r.glyphExceptions != null) {
      if (!Array.isArray(r.glyphExceptions))
        errors.push(`${at}.glyphExceptions must be an array`);
      else
        r.glyphExceptions.forEach((e, j) => {
          const ex = e as unknown as Record<string, unknown>;
          if (!STYLE_KEYS.has(ex.styleKey as string))
            errors.push(
              `${at}.glyphExceptions[${j}].styleKey invalid: ${String(ex.styleKey)}`,
            );
          if (typeof ex.codepoint !== "number")
            errors.push(
              `${at}.glyphExceptions[${j}].codepoint must be a number`,
            );
          if (typeof ex.note !== "string" || !ex.note)
            errors.push(
              `${at}.glyphExceptions[${j}].note must be a non-empty string`,
            );
        });
    }

    // ref resolution + gate<->proof consistency (only when the measurement set is supplied)
    if (haveMeasurements && Array.isArray(refs)) {
      for (const ref of refs)
        if (!known.has(ref as string))
          errors.push(`${at}.measurementRefs unresolved: ${ref}`);
      if (
        g?.layout === "pass" &&
        !refs.some((ref) =>
          LAYOUT_PROOF_KINDS.has(known.get(ref as string) ?? ""),
        )
      ) {
        errors.push(
          `${at}.gates.layout=pass requires a live_layout or face_aggregate measurement ref`,
        );
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

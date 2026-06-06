/**
 * Fallback lookups over the reviewed evidence:
 *   - getRenderableFallback / getFallbackDecision - family-level ("which family", + the full outcome).
 *   - getRenderableFallbackForFace / getFallbackDecisionForFace - face-SAFE: a Regular-only substitute
 *     returns null / `face_missing` for bold/italic instead of being wrongly routed to a face it lacks.
 *   - createFallbackMap - a family-level resolver map (asset-gated). Each entry carries `faces`, so a
 *     consumer can route per-face; for Regular-only rows it MUST, or use the face-aware lookups.
 */
import { SUBSTITUTION_EVIDENCE } from "./data.js";
import type {
  FaceSlot,
  FallbackDecision,
  FontFallback,
  SubstitutionEvidence,
  Verdict,
} from "./types.js";

/** Reports whether the consumer can actually render (i.e. bundles the asset for) a physical family. */
export type CanRenderFamily = (family: string) => boolean;

/** Options for {@link getRenderableFallback} and {@link createFallbackMap}: a render map must be asset-safe. */
export interface RenderableFallbackOptions {
  canRenderFamily: CanRenderFamily;
}

/** Options for {@link getFallbackDecision}. `canRenderFamily` is optional - omit it for the raw decision. */
export interface FallbackDecisionOptions {
  canRenderFamily?: CanRenderFamily;
}

/**
 * Verdicts whose advances preserve line breaks: the proportional metric-grade bands, plus
 * cell_width_only (a monospace whose cell width - and therefore every advance - matches). Glyph shapes
 * may still differ (read `verdict`); line breaks do not move.
 */
const LINE_BREAK_SAFE_VERDICTS: ReadonlySet<Verdict> = new Set<Verdict>([
  "metric_safe",
  "near_metric",
  "cell_width_only",
]);

/** Normalize a family name to a lookup key: trim, strip surrounding quotes, lowercase (CSS-name safe). */
export function normalizeFamilyName(name: string): string {
  return name
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim()
    .toLowerCase();
}

/** Evidence rows indexed by normalized logical family, built once. */
const BY_LOGICAL: ReadonlyMap<string, SubstitutionEvidence> = new Map(
  SUBSTITUTION_EVIDENCE.map((row) => [
    normalizeFamilyName(row.logicalFamily),
    row,
  ]),
);

/**
 * Build the FontFallback for a row known to carry a renderable physical family. `verdict` is passed in
 * so a face-aware caller can supply the per-face verdict (faceVerdicts[face]) instead of the worst-face
 * top-level one - e.g. Cambria regular is metric_safe even though the family rolls up to visual_only.
 * `faceSlot` (a face lookup) scopes the glyph exceptions to that face; omitting it (a family lookup)
 * carries all of the row's. Empty exception sets are dropped so the field is present only when it bites.
 */
function buildFallback(
  row: SubstitutionEvidence,
  physicalFamily: string,
  verdict: Verdict,
  faceSlot?: FaceSlot,
): FontFallback {
  // Always hand back a FRESH array - filter() already copies; the family path must copy too, or a
  // consumer mutating it would corrupt the shared evidence row for later lookups.
  const glyphExceptions = faceSlot
    ? row.glyphExceptions?.filter((g) => g.slot === faceSlot)
    : row.glyphExceptions
      ? [...row.glyphExceptions]
      : undefined;
  return {
    substituteFamily: physicalFamily,
    policyAction: row.policyAction,
    verdict,
    lineBreakSafe: LINE_BREAK_SAFE_VERDICTS.has(verdict),
    faces: row.faces,
    evidenceId: row.evidenceId,
    ...(glyphExceptions && glyphExceptions.length > 0
      ? { glyphExceptions }
      : {}),
  };
}

/** Decide a single row against the consumer's asset availability. Pure. */
function decideRow(
  row: SubstitutionEvidence,
  canRenderFamily: CanRenderFamily | undefined,
): FallbackDecision {
  const { policyAction, physicalFamily, verdict, evidenceId } = row;
  // Deliberate non-substitution policies first: nothing renders in the original's place.
  if (policyAction === "preserve_only")
    return { kind: "preserve_only", evidenceId };
  if (policyAction === "customer_supplied")
    return { kind: "customer_supplied", evidenceId };
  // substitute / category_fallback with no named open family: docfonts knows the font but recommends
  // no renderable family - distinct from the `no_substitute` verdict (read the row for that nuance).
  if (physicalFamily === null)
    return { kind: "no_recommended_fallback", evidenceId };
  // Named substitute the consumer does not bundle: surfaced so a UI can say which font to add.
  if (canRenderFamily && !canRenderFamily(physicalFamily))
    return {
      kind: "asset_missing",
      substituteFamily: physicalFamily,
      verdict,
      evidenceId,
    };
  return {
    kind: "fallback",
    fallback: buildFallback(row, physicalFamily, verdict),
  };
}

/** True when a row actually scopes faces (any RIBBI face marked covered). An all-false `faces` means
 *  the row is NOT face-scoped - e.g. a category fallback whose physical font does have faces - so it
 *  must not be gated per-face, only a measured per-face substitute (Baskerville Regular-only) is. */
function isFaceScoped(row: SubstitutionEvidence): boolean {
  const f = row.faces;
  return f.regular || f.bold || f.italic || f.boldItalic;
}

/**
 * Face-aware variant of {@link decideRow}: same family-level outcome, but when the family HAS a
 * renderable substitute AND the row is face-scoped, gate on whether it provides the requested `face`.
 * A face a face-scoped substitute does not cover yields `face_missing` (route it through absence
 * handling); a covered face yields a fallback carrying that face's own verdict. A NON-face-scoped row
 * (category fallback, all-false `faces`) renders for any face - it never becomes face_missing.
 */
function decideRowForFace(
  row: SubstitutionEvidence,
  face: FaceSlot,
  canRenderFamily: CanRenderFamily | undefined,
): FallbackDecision {
  const base = decideRow(row, canRenderFamily);
  // Non-fallback outcomes (asset_missing / no_recommended_fallback / policy) do not depend on the face.
  if (base.kind !== "fallback") return base;
  if (isFaceScoped(row) && !row.faces[face])
    return {
      kind: "face_missing",
      substituteFamily: base.fallback.substituteFamily,
      evidenceId: row.evidenceId,
    };
  const faceVerdict = row.faceVerdicts?.[face] ?? row.verdict;
  return {
    kind: "fallback",
    fallback: buildFallback(
      row,
      base.fallback.substituteFamily,
      faceVerdict,
      face,
    ),
  };
}

/**
 * The full, honest outcome for a requested family: a discriminated union (see {@link FallbackDecision}).
 * Distinguishes an unknown font from a measured "no open substitute", a substitute you do not bundle,
 * and the deliberate non-substitution policies. Case- and quote-insensitive.
 */
export function getFallbackDecision(
  family: string,
  options: FallbackDecisionOptions = {},
): FallbackDecision {
  const row = BY_LOGICAL.get(normalizeFamilyName(family));
  return row ? decideRow(row, options.canRenderFamily) : { kind: "unknown" };
}

/**
 * The open family to render for a requested font, or null when there is nothing the consumer can render
 * (no row, no open substitute, a deliberate non-substitution policy, or a substitute it does not
 * bundle). For the reasons behind a null - to report them in a UI - use {@link getFallbackDecision}.
 */
export function getRenderableFallback(
  family: string,
  options: RenderableFallbackOptions,
): FontFallback | null {
  const decision = getFallbackDecision(family, options);
  return decision.kind === "fallback" ? decision.fallback : null;
}

/**
 * Face-aware outcome for a requested family + RIBBI face. Like {@link getFallbackDecision} but adds
 * `face_missing` when the substitute exists yet does not provide that face (a Regular-only row asked
 * for bold/italic). A covered face's fallback carries that face's own verdict. Case- and quote-insensitive.
 */
export function getFallbackDecisionForFace(
  family: string,
  face: FaceSlot,
  options: FallbackDecisionOptions = {},
): FallbackDecision {
  const row = BY_LOGICAL.get(normalizeFamilyName(family));
  return row
    ? decideRowForFace(row, face, options.canRenderFamily)
    : { kind: "unknown" };
}

/**
 * The open family to render for a requested font AND a specific face, or null when that face has no
 * renderable substitute (face not covered, no row, a non-substitution policy, or not bundled). This is
 * the face-SAFE lookup: a Regular-only substitute returns null for bold/italic instead of being routed
 * to a face it does not have. Use {@link getFallbackDecisionForFace} to report the reason.
 */
export function getRenderableFallbackForFace(
  family: string,
  face: FaceSlot,
  options: RenderableFallbackOptions,
): FontFallback | null {
  const decision = getFallbackDecisionForFace(family, face, options);
  return decision.kind === "fallback" ? decision.fallback : null;
}

/**
 * A family-level substitute map: every fallback the consumer can render, keyed by the normalized
 * (lowercased) logical family - normalize lookups with {@link normalizeFamilyName}. Only renderable
 * rows are included. Each entry carries `faces`; a face-scoped (e.g. Regular-only) row is only safe in
 * a FACE-AWARE resolver - one that checks `faces` or uses {@link getRenderableFallbackForFace} - since
 * applying a Regular-only entry to bold/italic would route a face the substitute does not provide.
 */
export function createFallbackMap(
  options: RenderableFallbackOptions,
): Record<string, FontFallback> {
  const out: Record<string, FontFallback> = {};
  for (const [key, row] of BY_LOGICAL) {
    const decision = decideRow(row, options.canRenderFamily);
    if (decision.kind === "fallback") out[key] = decision.fallback;
  }
  return out;
}

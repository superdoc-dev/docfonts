/**
 * Fallback lookups over the reviewed evidence. Three intents:
 *   - getRenderableFallback - "I need a family to render now" (asset-gated, returns a family or null).
 *   - getFallbackDecision   - "I need diagnostics / UI / reporting" (the full honest outcome).
 *   - createFallbackMap      - "I need a resolver map" (asset-gated, render-only rows).
 * Face routing stays consumer-owned: these answer which family, not which face.
 */
import { SUBSTITUTION_EVIDENCE } from "./data.js";
import type {
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

/** Build the FontFallback for a row known to carry a renderable physical family. */
function buildFallback(
  row: SubstitutionEvidence,
  physicalFamily: string,
): FontFallback {
  return {
    substituteFamily: physicalFamily,
    policyAction: row.policyAction,
    verdict: row.verdict,
    lineBreakSafe: LINE_BREAK_SAFE_VERDICTS.has(row.verdict),
    evidenceId: row.evidenceId,
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
  return { kind: "fallback", fallback: buildFallback(row, physicalFamily) };
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
 * The renderer's substitute map: every fallback the consumer can actually render, keyed by the
 * normalized (lowercased) logical family - normalize lookups with {@link normalizeFamilyName}. Only
 * `kind: "fallback"` rows are included, so the map is safe to wire straight into a resolver.
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

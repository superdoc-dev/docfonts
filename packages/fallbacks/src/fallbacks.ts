/**
 * The V1 ergonomic surface over {@link SUBSTITUTION_EVIDENCE}: a single recommendation lookup,
 * `getFallback`, and a renderer-safe batch map, `deriveFallbackMap`.
 *
 * The asset-availability split is deliberate. `getFallback` is the broad lookup - "what does docfonts
 * recommend for this family?" - and gating by what the consumer bundles is OPTIONAL, because the caller
 * inspects the single result. `deriveFallbackMap` is the map a renderer wires wholesale into its
 * resolver, so `hasFamily` is REQUIRED: a batch map must never silently include a substitute whose font
 * the consumer cannot load. That asymmetry is the whole safety contract - docfonts knows more
 * substitutes than any one renderer ships, and the render map only carries the ones it can actually use.
 *
 * Face-level routing (a Regular-only substitute like Baskerville -> Bacasime) is deliberately NOT here:
 * the consumer already owns face-aware absence handling and applies its own `hasFace` after the family
 * is chosen. The structured row (faces / faceVerdicts / glyphExceptions) is on SUBSTITUTION_EVIDENCE.
 */
import { SUBSTITUTION_EVIDENCE } from "./data";
import type {
  FontFallback,
  PolicyAction,
  SubstitutionEvidence,
  Verdict,
} from "./types";

/** Reports whether the consumer can actually render (i.e. bundles the asset for) a physical family. */
export type HasFamily = (family: string) => boolean;

/** Options for {@link getFallback}. `hasFamily` is OPTIONAL here - omit it to get the raw recommendation. */
export interface FallbackOptions {
  /**
   * When given, a row whose `physicalFamily` is not available resolves to null - the row stays inert
   * until the consumer bundles it. When omitted, every row with a physical family is considered present.
   */
  hasFamily?: HasFamily;
}

/** Options for {@link deriveFallbackMap}. `hasFamily` is REQUIRED - a render map must be asset-safe. */
export interface FallbackMapOptions {
  hasFamily: HasFamily;
}

/** The two metric-grade bands. A substitution in either is line-break faithful; everything else is not. */
const FAITHFUL_VERDICTS: ReadonlySet<Verdict> = new Set<Verdict>([
  "metric_safe",
  "near_metric",
]);

/** Actions that mean "render this physical family". preserve_only / customer_supplied deliberately do
 *  NOT substitute, so they never yield a fallback even if a row carried a physical family. */
const RENDERABLE_ACTIONS: ReadonlySet<PolicyAction> = new Set<PolicyAction>([
  "substitute",
  "category_fallback",
]);

/** Normalize a family name to a lookup key: trim, strip surrounding quotes, lowercase (CSS-name safe). */
function normalizeFamily(name: string): string {
  return name
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim()
    .toLowerCase();
}

/** Evidence rows indexed by normalized logical family, built once. */
const BY_LOGICAL: ReadonlyMap<string, SubstitutionEvidence> = new Map(
  SUBSTITUTION_EVIDENCE.map((row) => [normalizeFamily(row.logicalFamily), row]),
);

/** Project a row to a FontFallback, or null when it offers nothing the consumer can render. */
function toFallback(
  row: SubstitutionEvidence,
  hasFamily: HasFamily | undefined,
): FontFallback | null {
  // No recommended physical family (no_substitute / a candidate-less category row): nothing to render.
  if (row.physicalFamily === null) return null;
  // preserve_only / customer_supplied mean "do not substitute" - never render their family.
  if (!RENDERABLE_ACTIONS.has(row.policyAction)) return null;
  // The consumer does not ship this family: keep the row inert rather than route to an unloadable font.
  if (hasFamily && !hasFamily(row.physicalFamily)) return null;
  return {
    family: row.physicalFamily,
    action: row.policyAction,
    verdict: row.verdict,
    faithful: FAITHFUL_VERDICTS.has(row.verdict),
    evidenceId: row.evidenceId,
  };
}

/**
 * The open fallback for a requested font family, or null when docfonts has no row, the row recommends
 * no substitute, or the consumer does not ship the physical family. Case- and quote-insensitive.
 */
export function getFallback(
  logicalFamily: string,
  options: FallbackOptions = {},
): FontFallback | null {
  const row = BY_LOGICAL.get(normalizeFamily(logicalFamily));
  return row ? toFallback(row, options.hasFamily) : null;
}

/**
 * The renderer's substitute map: every fallback the consumer can actually render, keyed by the
 * normalized (lowercased) logical family. `hasFamily` is REQUIRED - rows whose physical family the
 * consumer does not bundle are excluded, so the map is safe to wire straight into a resolver. The keys
 * are exactly the families it should remap. For the un-gated single recommendation, use {@link getFallback}.
 */
export function deriveFallbackMap(
  options: FallbackMapOptions,
): Record<string, FontFallback> {
  const out: Record<string, FontFallback> = {};
  for (const [key, row] of BY_LOGICAL) {
    const fallback = toFallback(row, options.hasFamily);
    if (fallback) out[key] = fallback;
  }
  return out;
}

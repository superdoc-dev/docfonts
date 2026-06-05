/**
 * The V1 ergonomic surface over {@link SUBSTITUTION_EVIDENCE}: one lookup, `getFallback`, plus a
 * batch `deriveFallbackMap`. Both are asset-aware - a consumer passes `hasFamily` so a row is only
 * activated when the consumer actually bundles the physical font. This is what lets a renderer import
 * the full docfonts evidence (which knows more substitutes than any one renderer ships) without
 * routing to a font it cannot load: un-bundled rows resolve to null and stay inert.
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

/** Options shared by the lookup helpers. */
export interface FallbackOptions {
  /**
   * Reports whether the consumer can actually render a physical family (i.e. it ships the asset). When
   * given, a row whose `physicalFamily` is not available resolves to null - the row stays inert until
   * the consumer bundles it. When omitted, every row with a physical family is considered available.
   */
  hasFamily?: (family: string) => boolean;
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
  hasFamily: FallbackOptions["hasFamily"],
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
 * Every active fallback, keyed by the normalized (lowercased) logical family. Excludes rows that
 * {@link getFallback} would resolve to null, so a consumer can build its substitute map in one call:
 * the keys are exactly the families it should remap.
 */
export function deriveFallbackMap(
  options: FallbackOptions = {},
): Record<string, FontFallback> {
  const out: Record<string, FontFallback> = {};
  for (const [key, row] of BY_LOGICAL) {
    const fallback = toFallback(row, options.hasFamily);
    if (fallback) out[key] = fallback;
  }
  return out;
}

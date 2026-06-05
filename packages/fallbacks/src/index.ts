/**
 * Runtime fallback evidence and asset-aware lookup helpers. No font parser, research data, or runtime
 * dependency.
 */
export { SUBSTITUTION_EVIDENCE } from "./data";
export {
  deriveFallbackMap,
  type FallbackMapOptions,
  type FallbackOptions,
  getFallback,
  type HasFamily,
} from "./fallbacks";
export type {
  AdvanceDelta,
  FaceCoverage,
  FaceSlot,
  FontFallback,
  GlyphException,
  PolicyAction,
  SubstituteGates,
  SubstitutionEvidence,
  Verdict,
} from "./types";

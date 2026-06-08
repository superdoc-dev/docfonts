/**
 * Runtime fallback evidence and asset-aware lookup helpers. No font parser, research data, or runtime
 * dependency.
 */
export { SUBSTITUTION_EVIDENCE } from "./data.js";
export {
  type CanRenderFamily,
  createFallbackMap,
  type FallbackDecisionOptions,
  getFallbackDecision,
  getFallbackDecisionForFace,
  getRenderableFallback,
  getRenderableFallbackForFace,
  normalizeFamilyName,
  type RenderableFallbackOptions,
} from "./fallbacks.js";
export type {
  AdvanceBasis,
  AdvanceDelta,
  CssGeneric,
  FaceCoverage,
  FaceSlot,
  FallbackDecision,
  FontFallback,
  GlyphException,
  PolicyAction,
  SubstituteGates,
  SubstitutionEvidence,
  Verdict,
} from "./types.js";

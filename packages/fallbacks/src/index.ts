/**
 * `@docfonts/fallbacks` - the small runtime data package a document renderer imports to map a
 * proprietary font to its measured open fallback, without hand-copying docfonts tables.
 *
 * V1 surface: the structured evidence ({@link SUBSTITUTION_EVIDENCE}) plus one ergonomic, asset-aware
 * lookup ({@link getFallback}) and its batch form ({@link deriveFallbackMap}). The data is generated
 * from the docfonts registry's reviewed artifact; this package carries no research data, no font
 * parser, and no runtime dependency.
 */
export { SUBSTITUTION_EVIDENCE } from "./data";
export {
  deriveFallbackMap,
  type FallbackOptions,
  getFallback,
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

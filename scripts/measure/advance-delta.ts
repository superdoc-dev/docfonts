/**
 * Analytic advance-delta measurement (the "analytic-hmtx" method). PURE: given two parsed faces - a
 * proprietary ORACLE and an open CANDIDATE - it computes how far the candidate's advances diverge
 * from the oracle's, which is what drives line/word/page-break fidelity. No font binaries, no oracle
 * tables are emitted by callers; only the resulting deltas + method + date + an oracle-env label.
 *
 * Two numbers, matching AdvanceDelta and the research scorecard thresholds:
 *   meanDelta = weighted-mean over test STRINGS (prose weighted over synthetic runs) - typical drift.
 *   maxDelta  = worst-case over single GLYPHS (Latin core) - the break-fidelity risk.
 * Both are fractions of the oracle advance (0 = identical).
 */
import type { AdvanceDelta } from "@docfonts/core";
import {
  advanceOfString,
  LATIN_CORE,
  type ParsedFace,
} from "@docfonts/font-metadata";

/** A weighted test string. Prose carries more weight than synthetic glyph runs (scorecard rule). */
export interface WeightedString {
  text: string;
  weight: number;
}

/** Named, versioned default test set. Referenced by id (testStringsRef) so a result is reproducible. */
export const LATIN_PROSE_V1: { id: string; strings: WeightedString[] } = {
  id: "latin-prose-v1",
  strings: [
    { text: "The quick brown fox jumps over the lazy dog.", weight: 3 },
    { text: "Pack my box with five dozen liquor jugs.", weight: 3 },
    { text: "Sphinx of black quartz, judge my vow.", weight: 3 },
    {
      text: "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789",
      weight: 1,
    },
    { text: ".,;:!?()[]{}\"'-", weight: 1 },
  ],
};

const SIZE = 1000; // arbitrary; deltas are ratios, so the px size cancels.

/**
 * Compute the advance delta of `candidate` against `oracle`. Returns null when the comparison can't
 * be made on any string (e.g. a face lacks an hmtx advance table), so callers never publish a fake 0.
 */
export function advanceDelta(
  oracle: ParsedFace,
  candidate: ParsedFace,
  strings: WeightedString[] = LATIN_PROSE_V1.strings,
): AdvanceDelta | null {
  // meanDelta: per-string advance divergence, prose-weighted.
  let weighted = 0;
  let weightSum = 0;
  for (const { text, weight } of strings) {
    const o = advanceOfString(oracle, text, SIZE);
    const c = advanceOfString(candidate, text, SIZE);
    if (o === null || c === null || o === 0) continue;
    weighted += weight * (Math.abs(c - o) / o);
    weightSum += weight;
  }
  if (weightSum === 0) return null;
  const meanDelta = weighted / weightSum;

  // maxDelta: worst single-glyph advance divergence across the Latin core.
  let maxDelta = 0;
  for (const cp of LATIN_CORE) {
    const og = oracle.gidForCodepoint(cp);
    const cg = candidate.gidForCodepoint(cp);
    if (og === 0 || cg === 0) continue; // skip glyphs a face does not cover
    const o = oracle.advanceWidth(og);
    const c = candidate.advanceWidth(cg);
    if (o === 0) continue;
    const d = Math.abs(c - o) / o;
    if (d > maxDelta) maxDelta = d;
  }

  return { meanDelta, maxDelta };
}

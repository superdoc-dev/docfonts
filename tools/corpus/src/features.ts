import { openFont, type Sfnt, type SfntTable } from "./font";

/**
 * Typographic features read from OS/2 and post. Every field is optional: an absent field means the
 * data was missing or not trustworthy (see the rules in `parseFeatures`), never a real zero. This is
 * the reliability flag - a value is present only when the font actually declared it.
 */
export interface FontFeatures {
  /** OS/2 usWeightClass (roughly 1..1000), present when non-zero. */
  weightClass?: number;
  /** OS/2 usWidthClass (1..9), present when non-zero. */
  widthClass?: number;
  /** OS/2 sxHeight as a fraction of the em, present when the field exists and is positive. */
  xHeight?: number;
  /** OS/2 sCapHeight as a fraction of the em, present when the field exists and is positive. */
  capHeight?: number;
  /** post italicAngle in degrees (0 for upright), present when the post table exists. */
  italicAngle?: number;
  /** OS/2 PANOSE 10 digits, present only when more than the family byte is filled in. */
  panose?: readonly number[];
}

/** A PANOSE that carries no style data: all zero, or only the family byte set (e.g. [2,0,...]). */
function panoseIsUnset(panose: readonly number[]): boolean {
  // The family byte (index 0) alone does not describe the face, so treat it like no data.
  return panose.slice(1).every((digit) => digit === 0);
}

/** Read OS/2 weight, width, PANOSE, and (version >= 2) the em-normalized x-height and cap-height. */
function parseOs2(
  view: DataView,
  table: SfntTable,
  unitsPerEm: number,
  out: FontFeatures,
): void {
  const { offset, length } = table;
  const version = view.getUint16(offset);

  if (length >= 8) {
    const weight = view.getUint16(offset + 4);
    if (weight > 0) out.weightClass = weight;
    const width = view.getUint16(offset + 6);
    if (width > 0) out.widthClass = width;
  }

  // PANOSE is 10 bytes at offset 32 in every OS/2 version.
  if (length >= 42) {
    const panose: number[] = [];
    for (let i = 0; i < 10; i++) panose.push(view.getUint8(offset + 32 + i));
    if (!panoseIsUnset(panose)) out.panose = panose;
  }

  // sxHeight and sCapHeight only exist from OS/2 version 2 onward (fields at 86 and 88).
  if (version >= 2 && length >= 90) {
    const sx = view.getInt16(offset + 86);
    if (sx > 0) out.xHeight = sx / unitsPerEm;
    const cap = view.getInt16(offset + 88);
    if (cap > 0) out.capHeight = cap / unitsPerEm;
  }
}

/** Read the post table's italicAngle, stored as a 16.16 fixed-point number of degrees. */
function parsePost(view: DataView, table: SfntTable, out: FontFeatures): void {
  const { offset, length } = table;
  if (length < 8) return;
  out.italicAngle = view.getInt32(offset + 4) / 0x10000;
}

/**
 * Parse the typographic features the compare tool ranks on. Builds on `openFont`, so it shares the
 * same SFNT validation. OS/2 and post are optional tables: when they are absent, or too short for a
 * field, that feature is simply left unset rather than guessed.
 */
export function parseFeatures(bytes: Uint8Array): FontFeatures {
  const sfnt: Sfnt = openFont(bytes);
  const out: FontFeatures = {};
  const os2 = sfnt.tables.get("OS/2");
  if (os2) parseOs2(sfnt.view, os2, sfnt.unitsPerEm, out);
  const post = sfnt.tables.get("post");
  if (post) parsePost(sfnt.view, post, out);
  return out;
}

/** Named, tunable weights for the feature-distance blend. Higher means the feature matters more. */
export interface FeatureWeights {
  xHeight: number;
  capHeight: number;
  weight: number;
  width: number;
  italic: number;
  panose: number;
}

/**
 * Default feature weights. X-height carries the most visual signal for a fallback, so it leads; width
 * class is the noisiest, so it trails. Kept as plain numbers so they are easy to retune.
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureWeights = {
  xHeight: 1.5,
  capHeight: 1.0,
  weight: 1.0,
  width: 0.75,
  italic: 1.0,
  panose: 1.0,
};

/** The number of features the distance can compare when both fonts declare everything. */
export const FEATURE_COUNT = 6;

export type FeatureName = keyof FeatureWeights;

export interface FeatureGap {
  feature: FeatureName;
  distance: number;
}

/** A feature-distance result: the blended score plus how many features actually overlapped. */
export interface FeatureDistance {
  /** Weighted mean of the per-feature distances, 0 = identical. NaN when nothing overlapped. */
  score: number;
  /** Features both fonts declared and that were compared. */
  compared: number;
  /** Features skipped because one or both fonts did not declare them. */
  missing: number;
  /** Total comparable features (compared + missing). */
  total: number;
  /** Compared features whose normalized distance is large enough to deserve manual review. */
  gaps: readonly FeatureGap[];
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// Each helper maps a raw difference onto roughly [0, 1] so the weights, not the units, set the blend.
const heightDistance = (a: number, b: number): number =>
  clamp01(Math.abs(a - b) / 0.5); // half an em apart is already as different as it gets
const weightDistance = (a: number, b: number): number =>
  clamp01(Math.abs(a - b) / 1000); // usWeightClass spans ~1..1000
const widthDistance = (a: number, b: number): number =>
  clamp01(Math.abs(a - b) / 8); // usWidthClass spans 1..9
const italicDistance = (a: number, b: number): number =>
  clamp01(Math.abs(a - b) / 90); // degrees; past a quarter turn it is just "slanted"
const panoseDistance = (a: readonly number[], b: readonly number[]): number => {
  // PANOSE digits are categorical, so count how many of the 10 classifications disagree.
  let differing = 0;
  for (let i = 0; i < 10; i++) if (a[i] !== b[i]) differing++;
  return differing / 10;
};

const REVIEW_GAP_THRESHOLDS: Record<FeatureName, number> = {
  xHeight: 0.12,
  capHeight: 0.12,
  weight: 0.1,
  width: 0.125,
  italic: 0.05,
  panose: 0.3,
};

/**
 * Deterministic feature distance between a reference and a candidate. Only features both fonts declare
 * are compared; missing features are skipped, never treated as zero, and counted separately so a thin
 * match is visible. The result is a weighted mean in [0, 1] where lower is more similar.
 */
export function featureDistance(
  reference: FontFeatures,
  candidate: FontFeatures,
  weights: FeatureWeights = DEFAULT_FEATURE_WEIGHTS,
): FeatureDistance {
  let weightedSum = 0;
  let weightTotal = 0;
  let compared = 0;
  const gaps: FeatureGap[] = [];
  const add = (
    feature: FeatureName,
    weight: number,
    distance: number,
  ): void => {
    weightedSum += weight * distance;
    weightTotal += weight;
    compared++;
    if (distance >= REVIEW_GAP_THRESHOLDS[feature])
      gaps.push({ feature, distance });
  };

  if (reference.xHeight !== undefined && candidate.xHeight !== undefined)
    add(
      "xHeight",
      weights.xHeight,
      heightDistance(reference.xHeight, candidate.xHeight),
    );
  if (reference.capHeight !== undefined && candidate.capHeight !== undefined)
    add(
      "capHeight",
      weights.capHeight,
      heightDistance(reference.capHeight, candidate.capHeight),
    );
  if (
    reference.weightClass !== undefined &&
    candidate.weightClass !== undefined
  )
    add(
      "weight",
      weights.weight,
      weightDistance(reference.weightClass, candidate.weightClass),
    );
  if (reference.widthClass !== undefined && candidate.widthClass !== undefined)
    add(
      "width",
      weights.width,
      widthDistance(reference.widthClass, candidate.widthClass),
    );
  if (
    reference.italicAngle !== undefined &&
    candidate.italicAngle !== undefined
  )
    add(
      "italic",
      weights.italic,
      italicDistance(reference.italicAngle, candidate.italicAngle),
    );
  if (reference.panose !== undefined && candidate.panose !== undefined)
    add(
      "panose",
      weights.panose,
      panoseDistance(reference.panose, candidate.panose),
    );

  return {
    score: compared === 0 ? Number.NaN : weightedSum / weightTotal,
    compared,
    missing: FEATURE_COUNT - compared,
    total: FEATURE_COUNT,
    gaps,
  };
}

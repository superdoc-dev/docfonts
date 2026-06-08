import { LATIN_SAMPLE } from "./samples";
import { type CompareModel, type CompareTier, classifyTier } from "./tiers";

/** One codepoint whose advance diverges, for the "worst glyphs" column. */
export interface GlyphDelta {
  codepoint: number;
  delta: number;
}

/** The advance-parity score of one candidate font against the reference, over a fixed sample. */
export interface CompareScore {
  /** codepoints in the tier sample that both fonts map. */
  compared: number;
  /** tier sample size. */
  total: number;
  /** tier sample codepoints not mapped by both fonts. */
  missing: number;
  meanDelta: number;
  maxDelta: number;
  /** shared report-sample codepoints whose advance delta exceeds the metric_safe max threshold. */
  over1Percent: number;
  /** shared report-sample codepoints whose advance delta exceeds the near_metric max threshold. */
  over2_5Percent: number;
  tier: CompareTier;
  worstGlyphs: GlyphDelta[];
}

export interface ScoreOptions {
  /** Sample used for outlier reporting and worst-glyph display. */
  reportSample?: readonly number[];
  /** Sample used for tier classification and mean/max columns. Defaults to `reportSample`. */
  tierSample?: readonly number[];
  worstCount?: number;
  model?: CompareModel;
}

interface MeasuredDeltas {
  compared: number;
  total: number;
  missing: number;
  meanDelta: number;
  maxDelta: number;
  over1Percent: number;
  over2_5Percent: number;
  worstGlyphs: GlyphDelta[];
}

function measureDeltas(
  reference: ReadonlyMap<number, number>,
  candidate: ReadonlyMap<number, number>,
  sample: readonly number[],
  worstCount: number,
): MeasuredDeltas {
  const deltas: GlyphDelta[] = [];
  let sum = 0;
  let max = 0;
  let over1Percent = 0;
  let over2_5Percent = 0;
  for (const cp of sample) {
    const a = reference.get(cp);
    const b = candidate.get(cp);
    if (a === undefined || b === undefined) continue;
    const delta = Math.abs(a - b);
    deltas.push({ codepoint: cp, delta });
    sum += delta;
    if (delta > max) max = delta;
    if (delta > 0.01) over1Percent++;
    if (delta > 0.025) over2_5Percent++;
  }

  const compared = deltas.length;
  const meanDelta = compared === 0 ? Number.NaN : sum / compared;
  const maxDelta = compared === 0 ? Number.NaN : max;
  const worstGlyphs = [...deltas]
    .sort((x, y) => y.delta - x.delta)
    .slice(0, worstCount)
    .filter((g) => g.delta > 0);

  return {
    compared,
    total: sample.length,
    missing: sample.length - compared,
    meanDelta,
    maxDelta,
    over1Percent,
    over2_5Percent,
    worstGlyphs,
  };
}

function normalizeScoreOptions(
  optionsOrSample: ScoreOptions | readonly number[] | undefined,
  worstCount: number | undefined,
  model: CompareModel | undefined,
): Required<ScoreOptions> {
  if (!optionsOrSample || Array.isArray(optionsOrSample)) {
    const reportSample = optionsOrSample ?? LATIN_SAMPLE;
    return {
      reportSample,
      tierSample: reportSample,
      worstCount: worstCount ?? 3,
      model: model ?? "latin",
    };
  }

  const options = optionsOrSample as ScoreOptions;
  const reportSample = options.reportSample ?? LATIN_SAMPLE;
  return {
    reportSample,
    tierSample: options.tierSample ?? reportSample,
    worstCount: options.worstCount ?? 3,
    model: options.model ?? "latin",
  };
}

/**
 * Score one candidate against the reference. The tier can use a narrower text sample while the report
 * still surfaces full-sample outliers. Both inputs are normalized advance maps (codepoint ->
 * advance/unitsPerEm); only codepoints present in both are compared.
 */
export function scoreAdvances(
  reference: ReadonlyMap<number, number>,
  candidate: ReadonlyMap<number, number>,
  optionsOrSample?: ScoreOptions | readonly number[],
  worstCount?: number,
  model?: CompareModel,
): CompareScore {
  const options = normalizeScoreOptions(optionsOrSample, worstCount, model);
  const report = measureDeltas(
    reference,
    candidate,
    options.reportSample,
    options.worstCount,
  );
  const tierMetrics =
    options.tierSample === options.reportSample
      ? report
      : measureDeltas(reference, candidate, options.tierSample, 0);
  return {
    compared: tierMetrics.compared,
    total: tierMetrics.total,
    missing: tierMetrics.missing,
    meanDelta: tierMetrics.meanDelta,
    maxDelta: tierMetrics.maxDelta,
    over1Percent: report.over1Percent,
    over2_5Percent: report.over2_5Percent,
    tier:
      tierMetrics.compared === 0
        ? "visual_only"
        : classifyTier(
            tierMetrics.meanDelta,
            tierMetrics.maxDelta,
            options.model,
          ),
    worstGlyphs: report.worstGlyphs,
  };
}

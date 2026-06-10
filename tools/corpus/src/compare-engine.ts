import { readFileSync } from "node:fs";
import {
  archiveFormatOf,
  collectCandidates,
  listCandidateFiles,
  loadSnapshot,
  requireArchiveTool,
  type SnapshotSource,
} from "./cache";
import {
  type FeatureDistance,
  type FontFeatures,
  featureDistance,
  parseFeatures,
} from "./features";
import { parseFont, sampleMetrics } from "./font";
import { rankRows } from "./report";
import { CJK_JP_TEXT_SAMPLE, LATIN_SAMPLE, LATIN_TEXT_SAMPLE } from "./samples";
import { type CompareScore, scoreAdvances } from "./score";
import type { CompareModel } from "./tiers";

export interface ScoredCandidate {
  sourceId: string;
  file: string;
  score: CompareScore;
  feature: FeatureDistance;
  bytes: Uint8Array;
}

export interface CompareCorpusOptions {
  cacheDir: string;
  sources?: string[];
  model?: CompareModel;
  limit?: number | null;
}

export interface CompareCorpusResult {
  rows: ScoredCandidate[];
  totalRows: number;
  skipped: number;
}

function samplesForModel(model: CompareModel): {
  reportSample: readonly number[];
  tierSample: readonly number[];
} {
  if (model === "cjk-jp")
    return {
      reportSample: CJK_JP_TEXT_SAMPLE,
      tierSample: CJK_JP_TEXT_SAMPLE,
    };
  if (model === "latin")
    return { reportSample: LATIN_SAMPLE, tierSample: LATIN_TEXT_SAMPLE };
  return { reportSample: LATIN_SAMPLE, tierSample: LATIN_SAMPLE };
}

export function selectSources(
  snapshot: SnapshotSource[],
  requestedIds: string[] = [],
): SnapshotSource[] {
  if (requestedIds.length === 0) return snapshot;

  const byId = new Map(snapshot.map((source) => [source.sourceId, source]));
  const unknown = requestedIds.filter((id) => !byId.has(id));
  if (unknown.length > 0)
    throw new Error(
      `source(s) not in cache: ${unknown.join(", ")}. Acquired: ${[...byId.keys()].join(", ")}`,
    );
  return requestedIds.map((id) => byId.get(id) as SnapshotSource);
}

export function requireArchiveTools(selected: SnapshotSource[]): void {
  const archiveSources = selected.filter(
    (source) => source.kind !== "github-tree",
  );
  for (const format of new Set(archiveSources.map(archiveFormatOf)))
    requireArchiveTool(format);
}

export function scoreCandidateBytes(
  reference: ReadonlyMap<number, number>,
  referenceFeatures: FontFeatures,
  bytes: Uint8Array,
  model: CompareModel,
): { score: CompareScore; feature: FeatureDistance } {
  const font = parseFont(bytes);
  const { reportSample, tierSample } = samplesForModel(model);
  return {
    score: scoreAdvances(reference, sampleMetrics(font, reportSample), {
      reportSample,
      tierSample,
      model,
    }),
    feature: featureDistance(referenceFeatures, parseFeatures(bytes)),
  };
}

export function compareReferenceToSources(
  referenceBytes: Uint8Array,
  selected: SnapshotSource[],
  cacheDir: string,
  model: CompareModel,
): { rows: ScoredCandidate[]; skipped: number } {
  const { reportSample } = samplesForModel(model);
  const reference = sampleMetrics(parseFont(referenceBytes), reportSample);
  const referenceFeatures = parseFeatures(referenceBytes);
  const rows: ScoredCandidate[] = [];
  let skipped = 0;

  for (const source of selected) {
    for (const candidate of collectCandidates(source, cacheDir)) {
      try {
        const { score, feature } = scoreCandidateBytes(
          reference,
          referenceFeatures,
          candidate.bytes,
          model,
        );
        rows.push({
          sourceId: source.sourceId,
          file: candidate.file,
          score,
          feature,
          bytes: candidate.bytes,
        });
      } catch {
        skipped++;
      }
    }
  }

  return { rows, skipped };
}

export function compareReferenceToCorpus(
  referenceBytes: Uint8Array,
  options: CompareCorpusOptions,
): CompareCorpusResult {
  const model = options.model ?? "latin";
  const selected = selectSources(
    loadSnapshot(options.cacheDir),
    options.sources ?? [],
  );
  requireArchiveTools(selected);

  const { rows, skipped } = compareReferenceToSources(
    referenceBytes,
    selected,
    options.cacheDir,
    model,
  );
  const ranked = rankRows(rows);
  const visible =
    options.limit === null ? ranked : ranked.slice(0, options.limit ?? 50);
  return { rows: visible, totalRows: rows.length, skipped };
}

export function compareReferenceFileToCorpus(
  referencePath: string,
  options: CompareCorpusOptions,
): CompareCorpusResult {
  return compareReferenceToCorpus(readFileSync(referencePath), options);
}

export interface CorpusFont {
  sourceId: string;
  file: string;
}

/**
 * A flat catalog of every corpus font by source and display name. Reads no font bytes, so it is cheap enough
 * to power a typeahead. Sources whose cache files are missing are skipped rather than failing the whole list.
 */
export function listCorpusFonts(cacheDir: string): CorpusFont[] {
  const fonts: CorpusFont[] = [];
  for (const source of loadSnapshot(cacheDir)) {
    let files: string[];
    try {
      files = listCandidateFiles(source, cacheDir);
    } catch {
      continue;
    }
    for (const file of files) fonts.push({ sourceId: source.sourceId, file });
  }
  return fonts;
}

export interface CompareTargetOptions {
  cacheDir: string;
  sourceId: string;
  file: string;
  model?: CompareModel;
}

/**
 * Score the reference against one specific corpus font, identified by source and display name. Lets a caller
 * compare against any font in the corpus, not just the ranked top of {@link compareReferenceToCorpus}.
 */
export function compareReferenceToTarget(
  referenceBytes: Uint8Array,
  options: CompareTargetOptions,
): ScoredCandidate {
  const model = options.model ?? "latin";
  const source = loadSnapshot(options.cacheDir).find(
    (entry) => entry.sourceId === options.sourceId,
  );
  if (!source) throw new Error(`source not in cache: ${options.sourceId}`);
  requireArchiveTools([source]);
  const candidate = collectCandidates(source, options.cacheDir).find(
    (entry) => entry.file === options.file,
  );
  if (!candidate)
    throw new Error(`font not found in ${options.sourceId}: ${options.file}`);

  const { reportSample } = samplesForModel(model);
  const reference = sampleMetrics(parseFont(referenceBytes), reportSample);
  const referenceFeatures = parseFeatures(referenceBytes);
  const { score, feature } = scoreCandidateBytes(
    reference,
    referenceFeatures,
    candidate.bytes,
    model,
  );
  return {
    sourceId: source.sourceId,
    file: candidate.file,
    score,
    feature,
    bytes: candidate.bytes,
  };
}

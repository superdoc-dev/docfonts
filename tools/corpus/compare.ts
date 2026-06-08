/**
 * Local maintainer tool: compare a licensed reference font with acquired open-font archives.
 * Reads ignored cache files, prints to stdout, and writes nothing to the tree.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  archiveFormatOf,
  collectCandidates,
  loadSnapshot,
  requireArchiveTool,
  type SnapshotSource,
} from "./src/cache";
import {
  type FeatureDistance,
  type FontFeatures,
  featureDistance,
  parseFeatures,
} from "./src/features";
import { parseFont, sampleMetrics } from "./src/font";
import { renderReport } from "./src/report";
import { LATIN_SAMPLE, LATIN_TEXT_SAMPLE } from "./src/samples";
import { type CompareScore, scoreAdvances } from "./src/score";
import type { CompareModel } from "./src/tiers";

export {
  archiveFormatOf,
  collectCandidates,
  loadSnapshot,
  requireArchiveTool,
  type SnapshotSource,
} from "./src/cache";
export {
  DEFAULT_FEATURE_WEIGHTS,
  FEATURE_COUNT,
  type FeatureDistance,
  type FeatureWeights,
  type FontFeatures,
  featureDistance,
  parseFeatures,
} from "./src/features";
export { type FontMetrics, parseFont, sampleMetrics } from "./src/font";
export { renderReport } from "./src/report";
export { LATIN_SAMPLE, LATIN_TEXT_SAMPLE } from "./src/samples";
export {
  type CompareScore,
  type GlyphDelta,
  type ScoreOptions,
  scoreAdvances,
} from "./src/score";
export {
  type CompareModel,
  type CompareTier,
  classifyTier,
} from "./src/tiers";

const REPO_DIR = join(import.meta.dir, "..", "..");
const DEFAULT_CACHE_DIR = join(REPO_DIR, ".cache", "corpus");

interface CompareRow {
  sourceId: string;
  file: string;
  score: CompareScore;
  feature: FeatureDistance;
}

export interface ParsedArgs {
  reference?: string;
  family?: string;
  limit: number | null;
  sources: string[];
  model: CompareModel;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { limit: 50, sources: [], model: "latin" };
  const readValue = (flag: string, index: number): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${flag} requires a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--reference":
        args.reference = readValue(flag, i);
        i++;
        break;
      case "--family":
        args.family = readValue(flag, i);
        i++;
        break;
      case "--source":
        for (const id of readValue(flag, i)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean))
          args.sources.push(id);
        i++;
        break;
      case "--model": {
        const value = readValue(flag, i);
        if (value !== "latin" && value !== "monospace")
          throw new Error("--model requires 'latin' or 'monospace'");
        args.model = value;
        i++;
        break;
      }
      case "--limit": {
        const value = readValue(flag, i);
        if (value === "all") {
          args.limit = null;
        } else {
          const limit = Number(value);
          if (!Number.isInteger(limit) || limit <= 0)
            throw new Error("--limit requires a positive integer or 'all'");
          args.limit = limit;
        }
        i++;
        break;
      }
      default:
        throw new Error(`unknown argument: ${flag}`);
    }
  }
  return args;
}

function selectSources(
  snapshot: SnapshotSource[],
  requestedIds: string[],
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

function scoreSources(
  reference: ReadonlyMap<number, number>,
  referenceFeatures: FontFeatures,
  selected: SnapshotSource[],
  cacheDir: string,
  model: CompareModel,
): { rows: CompareRow[]; skipped: number } {
  const rows: CompareRow[] = [];
  let skipped = 0;
  for (const source of selected) {
    for (const candidate of collectCandidates(source, cacheDir)) {
      try {
        const font = parseFont(candidate.bytes);
        const score = scoreAdvances(reference, sampleMetrics(font), {
          reportSample: LATIN_SAMPLE,
          tierSample: model === "latin" ? LATIN_TEXT_SAMPLE : LATIN_SAMPLE,
          model,
        });
        const feature = featureDistance(
          referenceFeatures,
          parseFeatures(candidate.bytes),
        );
        rows.push({
          sourceId: source.sourceId,
          file: candidate.file,
          score,
          feature,
        });
      } catch {
        skipped++;
      }
    }
  }
  return { rows, skipped };
}

function requireArchiveTools(selected: SnapshotSource[]): void {
  const archiveSources = selected.filter(
    (source) => source.kind !== "github-tree",
  );
  for (const format of new Set(archiveSources.map(archiveFormatOf)))
    requireArchiveTool(format);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.reference)
    throw new Error(
      "missing --reference: pass the path to the reference font file.",
    );
  if (!existsSync(args.reference))
    throw new Error(`reference font not found: ${args.reference}`);

  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
  const selected = selectSources(loadSnapshot(cacheDir), args.sources);
  requireArchiveTools(selected);

  const referenceBytes = readFileSync(args.reference);
  const reference = sampleMetrics(parseFont(referenceBytes));
  const referenceFeatures = parseFeatures(referenceBytes);
  const { rows, skipped } = scoreSources(
    reference,
    referenceFeatures,
    selected,
    cacheDir,
    args.model,
  );

  const label = args.family ?? "(family not specified)";
  const shown =
    args.limit === null ? rows.length : Math.min(args.limit, rows.length);
  const skippedText = skipped === 0 ? "" : `; skipped ${skipped} unsupported`;
  const modelText =
    args.model === "latin"
      ? `; tier/mean/max ${LATIN_TEXT_SAMPLE.length} text codepoints`
      : `; model ${args.model}`;
  console.log(
    `reference ${basename(args.reference)} as "${label}" vs ${rows.length} candidate(s) over ${LATIN_SAMPLE.length} Latin codepoints${modelText}; showing ${shown}${skippedText}\n`,
  );
  console.log(renderReport(rows, { limit: args.limit }));
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

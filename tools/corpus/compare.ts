/**
 * Local maintainer tool: compare a licensed reference font with acquired open-font archives.
 * Reads ignored cache files, prints to stdout, and writes nothing to the tree.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { compareReferenceToCorpus } from "./src/compare-engine";
import { renderReport } from "./src/report";
import { LATIN_SAMPLE, LATIN_TEXT_SAMPLE } from "./src/samples";
import type { CompareModel } from "./src/tiers";

export {
  collectCandidates,
  listCandidateFiles,
  loadSnapshot,
  requireArchiveTool,
  type SnapshotSource,
} from "./src/cache";
export {
  type CorpusFont,
  compareReferenceToCorpus,
  compareReferenceToTarget,
  listCorpusFonts,
  requireArchiveTools,
  scoreCandidateBytes,
  selectSources,
} from "./src/compare-engine";
export {
  DEFAULT_FEATURE_WEIGHTS,
  FEATURE_COUNT,
  type FeatureDistance,
  type FeatureWeights,
  type FontFeatures,
  featureDistance,
  parseFeatures,
} from "./src/features";
export {
  extractFont,
  type FontMetrics,
  parseFont,
  sampleMetrics,
} from "./src/font";
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

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.reference)
    throw new Error(
      "missing --reference: pass the path to the reference font file.",
    );
  if (!existsSync(args.reference))
    throw new Error(`reference font not found: ${args.reference}`);

  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
  const referenceBytes = readFileSync(args.reference);
  const { rows, totalRows, skipped } = compareReferenceToCorpus(
    referenceBytes,
    {
      cacheDir,
      sources: args.sources,
      model: args.model,
      limit: args.limit,
    },
  );

  const label = args.family ?? "(family not specified)";
  const shown = rows.length;
  const skippedText = skipped === 0 ? "" : `; skipped ${skipped} unsupported`;
  const modelText =
    args.model === "latin"
      ? `; tier/mean/max ${LATIN_TEXT_SAMPLE.length} text codepoints`
      : `; model ${args.model}`;
  console.log(
    `reference ${basename(args.reference)} as "${label}" vs ${totalRows} candidate(s) over ${LATIN_SAMPLE.length} Latin codepoints${modelText}; showing ${shown}${skippedText}\n`,
  );
  console.log(renderReport(rows, { limit: null }));
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

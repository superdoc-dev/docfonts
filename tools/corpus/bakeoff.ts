/**
 * Local maintainer tool: compare a licensed reference font against a manually chosen candidate set.
 * Prints calibration evidence only; it never publishes fallback decisions.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  type FeatureDistance,
  type FontFeatures,
  featureDistance,
  parseFeatures,
} from "./src/features";
import { parseFont, sampleMetrics } from "./src/font";
import {
  formatDelta,
  formatFeatureCoverage,
  formatFeatureScore,
  formatFlags,
  formatTable,
} from "./src/report";
import { LATIN_SAMPLE, LATIN_TEXT_SAMPLE } from "./src/samples";
import { type CompareScore, scoreAdvances } from "./src/score";
import type { CompareModel } from "./src/tiers";
import {
  compareImages,
  formatVisualDiff,
  renderGlyphGrid,
  requireMagick,
} from "./src/visual";

export {
  compareImages,
  formatVisualDiff,
  magickAvailable,
  parseCompareMetric,
  renderGlyphGrid,
  requireMagick,
  VISUAL_GLYPH_GRID,
} from "./src/visual";

const REPO_DIR = join(import.meta.dir, "..", "..");
const DEFAULT_PROBE_DIR = join(REPO_DIR, ".cache", "corpus-bakeoff");

export interface BakeoffCandidate {
  label: string;
  path: string;
}

export interface ParsedArgs {
  reference?: string;
  family?: string;
  candidates: BakeoffCandidate[];
  ranks: Map<string, string>;
  model: CompareModel;
  visual: boolean;
}

function parseLabeledValue(flag: string, raw: string): [string, string] {
  const eq = raw.indexOf("=");
  if (eq <= 0) throw new Error(`${flag} expects "Label=value", got "${raw}"`);
  const label = raw.slice(0, eq).trim();
  const value = raw.slice(eq + 1).trim();
  if (!label || !value)
    throw new Error(`${flag} expects "Label=value", got "${raw}"`);
  return [label, value];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    candidates: [],
    ranks: new Map(),
    model: "latin",
    visual: false,
  };
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
      case "--candidate": {
        const [label, path] = parseLabeledValue(flag, readValue(flag, i));
        if (args.candidates.some((c) => c.label === label))
          throw new Error(`duplicate candidate label: ${label}`);
        args.candidates.push({ label, path });
        i++;
        break;
      }
      case "--rank": {
        const [label, note] = parseLabeledValue(flag, readValue(flag, i));
        args.ranks.set(label, note);
        i++;
        break;
      }
      case "--model": {
        const value = readValue(flag, i);
        if (value !== "latin" && value !== "monospace")
          throw new Error("--model requires 'latin' or 'monospace'");
        args.model = value;
        i++;
        break;
      }
      case "--visual":
        args.visual = true;
        break;
      default:
        throw new Error(`unknown argument: ${flag}`);
    }
  }
  return args;
}

export interface BakeoffRow {
  label: string;
  score: CompareScore;
  feature: FeatureDistance;
  visual?: number;
  rank?: string;
}

export function scoreCandidate(
  reference: ReadonlyMap<number, number>,
  referenceFeatures: FontFeatures,
  bytes: Uint8Array,
  model: CompareModel,
): { score: CompareScore; feature: FeatureDistance } {
  const score = scoreAdvances(reference, sampleMetrics(parseFont(bytes)), {
    reportSample: LATIN_SAMPLE,
    tierSample: model === "latin" ? LATIN_TEXT_SAMPLE : LATIN_SAMPLE,
    model,
  });
  const feature = featureDistance(referenceFeatures, parseFeatures(bytes));
  return { score, feature };
}

/**
 * Render candidates in caller order. The maintainer chooses this set, often with an eye ranking.
 */
export function renderBakeoff(
  rows: BakeoffRow[],
  options: { visual: boolean },
): string {
  const hasRanks = rows.some((row) => row.rank !== undefined);
  const header = [
    "candidate",
    "tier",
    "mean",
    "max",
    "coverage",
    "fscore",
    "fcov",
    "flags",
  ];
  if (options.visual) header.push("vdiff");
  if (hasRanks) header.push("rank");

  const body = rows.map((row) => {
    const cells = [
      row.label,
      row.score.tier,
      formatDelta(row.score.meanDelta),
      formatDelta(row.score.maxDelta),
      `${row.score.compared}/${row.score.total}`,
      formatFeatureScore(row.feature),
      formatFeatureCoverage(row.feature),
      formatFlags(row.score.tier, row.feature),
    ];
    if (options.visual) cells.push(formatVisualDiff(row.visual));
    if (hasRanks) cells.push(row.rank ?? "-");
    return cells;
  });

  return formatTable(header, body);
}

function attachRanks(rows: BakeoffRow[], ranks: Map<string, string>): void {
  const labels = new Set(rows.map((row) => row.label));
  for (const label of ranks.keys())
    if (!labels.has(label))
      throw new Error(
        `--rank label "${label}" does not match any --candidate label`,
      );
  for (const row of rows) {
    const note = ranks.get(row.label);
    if (note !== undefined) row.rank = note;
  }
}

/**
 * Run the visual probe for every row, filling in `row.visual`. Renders into a unique child directory of
 * the cache root and removes only that child, so a misconfigured `DOCFONTS_BAKEOFF_CACHE` can never make
 * cleanup delete unrelated files: the root is left untouched.
 */
function runVisualProbe(
  referencePath: string,
  candidates: BakeoffCandidate[],
  rows: BakeoffRow[],
): void {
  const cacheRoot = process.env.DOCFONTS_BAKEOFF_CACHE ?? DEFAULT_PROBE_DIR;
  mkdirSync(cacheRoot, { recursive: true });
  const probeDir = mkdtempSync(join(cacheRoot, "probe-"));
  try {
    const referencePng = join(probeDir, "reference.png");
    renderGlyphGrid(referencePath, referencePng);
    candidates.forEach((candidate, index) => {
      const candidatePng = join(probeDir, `candidate-${index}.png`);
      renderGlyphGrid(candidate.path, candidatePng);
      rows[index].visual = compareImages(referencePng, candidatePng);
    });
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.reference)
    throw new Error(
      "missing --reference: pass the path to the reference font file.",
    );
  if (!existsSync(args.reference))
    throw new Error(`reference font not found: ${args.reference}`);
  if (args.candidates.length === 0)
    throw new Error(
      'missing --candidate: pass at least one "Label=/path/to/font.ttf".',
    );
  for (const candidate of args.candidates)
    if (!existsSync(candidate.path))
      throw new Error(
        `candidate font not found for "${candidate.label}": ${candidate.path}`,
      );
  if (args.visual) requireMagick();

  const referenceBytes = readFileSync(args.reference);
  const reference = sampleMetrics(parseFont(referenceBytes));
  const referenceFeatures = parseFeatures(referenceBytes);

  const rows: BakeoffRow[] = args.candidates.map((candidate) => {
    const { score, feature } = scoreCandidate(
      reference,
      referenceFeatures,
      readFileSync(candidate.path),
      args.model,
    );
    return { label: candidate.label, score, feature };
  });
  attachRanks(rows, args.ranks);
  if (args.visual) runVisualProbe(args.reference, args.candidates, rows);

  const label = args.family ?? "(family not specified)";
  console.log(
    `reference ${basename(args.reference)} as "${label}" vs ${rows.length} candidate(s); model ${args.model}; visual ${args.visual ? "on" : "off"}\n`,
  );
  console.log(renderBakeoff(rows, { visual: args.visual }));
  if (args.visual)
    console.log(
      "\nvdiff is an experimental rendered-glyph difference (0 = identical), not a verdict. Advance tier and fscore stay the primary signals.",
    );
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

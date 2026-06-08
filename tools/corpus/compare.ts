/**
 * Local maintainer tool: compare a private reference font with acquired open-font archives.
 * Reads ignored cache files, prints to stdout, and writes nothing to the tree.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const REPO_DIR = join(import.meta.dir, "..", "..");
const DEFAULT_CACHE_DIR = join(REPO_DIR, ".cache", "corpus");
const SNAPSHOT_FILE = "source-snapshot.json";
const RAW_SFNT_EXTENSIONS = [".otf", ".ttf"];

// --- Latin sample -----------------------------------------------------------

/** Inclusive codepoint range helper for building the sample. */
function codepointRange(start: number, end: number): number[] {
  const out: number[] = [];
  for (let cp = start; cp <= end; cp++) out.push(cp);
  return out;
}

/**
 * Fixed Latin sample for advance comparison: every printable ASCII codepoint (U+0020 space through
 * U+007E tilde), Latin-1 letters with diacritics, and common punctuation/symbols a document is likely
 * to use. Named and tested so the metric is reproducible. Stored as numeric codepoints, sorted and
 * unique.
 */
export const LATIN_SAMPLE: readonly number[] = (() => {
  const latin1 = codepointRange(0x00a0, 0x00ff).filter((cp) => cp !== 0x00ad);
  const generalPunctuation = [
    0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2020, 0x2021, 0x2022,
    0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
  ];
  const all = [...codepointRange(0x20, 0x7e), ...latin1, ...generalPunctuation];
  return [...new Set(all)].sort((a, b) => a - b);
})();

const TEXT_PUNCTUATION = new Set([
  0x20, // space
  0x21, // !
  0x22, // "
  0x23, // #
  0x26, // &
  0x27, // '
  0x28, // (
  0x29, // )
  0x2c, // ,
  0x2d, // -
  0x2e, // .
  0x2f, // /
  0x3a, // :
  0x3b, // ;
  0x3f, // ?
  0x40, // @
  0x5b, // [
  0x5d, // ]
  0x7b, // {
  0x7d, // }
  0x00a0, // no-break space
  0x2013, // en dash
  0x2014, // em dash
  0x2018, // left single quote
  0x2019, // right single quote
  0x201c, // left double quote
  0x201d, // right double quote
  0x2026, // ellipsis
]);

const EXCLUDED_TEXT_LETTERS = new Set([
  0x00b5, // micro sign: Unicode treats it as a letter, but it behaves like a symbol here.
]);

function isTextLetterOrDigit(codepoint: number): boolean {
  if (EXCLUDED_TEXT_LETTERS.has(codepoint)) return false;
  return /^[\p{L}\p{N}]$/u.test(String.fromCodePoint(codepoint));
}

/**
 * Text-carrying Latin sample used to rank proportional-font candidates. The full sample still reports
 * outliers, but rare symbols should not hide a strong body-text lead.
 */
export const LATIN_TEXT_SAMPLE: readonly number[] = LATIN_SAMPLE.filter(
  (cp) => TEXT_PUNCTUATION.has(cp) || isTextLetterOrDigit(cp),
);

// --- Tiers ------------------------------------------------------------------

/**
 * Advance-fidelity tier. Thresholds mirror the package's verdict language (see `src/types.ts`):
 * metric_safe is the DIRECT band, near_metric the LIKELY band, everything else visual_only.
 * cell_width_only is the monospace model's verdict for a matching cell: it proves line width, not
 * glyph-shape fidelity.
 */
export type CompareTier =
  | "metric_safe"
  | "near_metric"
  | "cell_width_only"
  | "visual_only";

/**
 * Classification model. `latin` is the default proportional comparison. `monospace` treats a matching
 * advance as proof of cell width only, since every glyph in a monospace cell shares one advance.
 */
export type CompareModel = "latin" | "monospace";

const TIER_RANK: Record<CompareTier, number> = {
  metric_safe: 0,
  near_metric: 1,
  cell_width_only: 2,
  visual_only: 3,
};

/**
 * Classify a (mean, max) advance-delta pair into a fidelity tier. Deltas are fractions of the em. Under
 * the monospace model a matching cell only vouches for line width, so the metric bands collapse to
 * cell_width_only while non-matching candidates stay visual_only.
 */
export function classifyTier(
  meanDelta: number,
  maxDelta: number,
  model: CompareModel = "latin",
): CompareTier {
  let tier: CompareTier = "visual_only";
  if (meanDelta <= 0.005 && maxDelta <= 0.01) tier = "metric_safe";
  else if (meanDelta <= 0.01 && maxDelta <= 0.025) tier = "near_metric";
  if (model === "monospace" && tier !== "visual_only") return "cell_width_only";
  return tier;
}

// --- SFNT parsing -----------------------------------------------------------

const REQUIRED_TABLES = ["head", "maxp", "hhea", "hmtx", "cmap"] as const;

/** A parsed font's em size plus a normalized advance lookup over its Unicode `cmap`. */
export interface FontMetrics {
  unitsPerEm: number;
  /** Advance width of a codepoint as a fraction of the em, or undefined when the font does not map it. */
  normalizedAdvance(codepoint: number): number | undefined;
}

function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/** Resolve a codepoint to a glyph id within one `cmap` subtable, for the formats we support (4, 6, 12). */
function makeCmapLookup(
  view: DataView,
  subOffset: number,
): (codepoint: number) => number | undefined {
  const format = view.getUint16(subOffset);

  if (format === 4) {
    const segX2 = view.getUint16(subOffset + 6);
    const segCount = segX2 / 2;
    const endOffset = subOffset + 14;
    const startOffset = endOffset + segX2 + 2; // skip reservedPad
    const deltaOffset = startOffset + segX2;
    const rangeOffsetBase = deltaOffset + segX2;
    return (cp) => {
      if (cp > 0xffff) return undefined;
      for (let i = 0; i < segCount; i++) {
        const end = view.getUint16(endOffset + i * 2);
        if (cp > end) continue;
        const start = view.getUint16(startOffset + i * 2);
        if (cp < start) return undefined;
        const delta = view.getInt16(deltaOffset + i * 2);
        const rangeOffset = view.getUint16(rangeOffsetBase + i * 2);
        if (rangeOffset === 0) {
          const gid = (cp + delta) & 0xffff;
          return gid === 0 ? undefined : gid;
        }
        const glyphOffset =
          rangeOffsetBase + i * 2 + rangeOffset + (cp - start) * 2;
        const raw = view.getUint16(glyphOffset);
        if (raw === 0) return undefined;
        const gid = (raw + delta) & 0xffff;
        return gid === 0 ? undefined : gid;
      }
      return undefined;
    };
  }

  if (format === 6) {
    const firstCode = view.getUint16(subOffset + 6);
    const entryCount = view.getUint16(subOffset + 8);
    return (cp) => {
      if (cp < firstCode || cp >= firstCode + entryCount) return undefined;
      const gid = view.getUint16(subOffset + 10 + (cp - firstCode) * 2);
      return gid === 0 ? undefined : gid;
    };
  }

  if (format === 12) {
    const numGroups = view.getUint32(subOffset + 12);
    const groupsOffset = subOffset + 16;
    return (cp) => {
      let lo = 0;
      let hi = numGroups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const g = groupsOffset + mid * 12;
        const start = view.getUint32(g);
        const end = view.getUint32(g + 4);
        if (cp < start) hi = mid - 1;
        else if (cp > end) lo = mid + 1;
        else {
          const gid = view.getUint32(g + 8) + (cp - start);
          return gid === 0 ? undefined : gid;
        }
      }
      return undefined;
    };
  }

  throw new Error(`unsupported cmap subtable format: ${format}`);
}

/** Pick the best Unicode `cmap` subtable and return its glyph lookup. */
function readCmap(
  view: DataView,
  cmapOffset: number,
): (codepoint: number) => number | undefined {
  const numSubtables = view.getUint16(cmapOffset + 2);
  const candidates: { score: number; offset: number }[] = [];
  for (let i = 0; i < numSubtables; i++) {
    const recordOffset = cmapOffset + 4 + i * 8;
    const platformId = view.getUint16(recordOffset);
    const encodingId = view.getUint16(recordOffset + 2);
    const score = cmapPreference(platformId, encodingId);
    // Skip non-Unicode subtables (Macintosh, Windows symbol, ...): their codepoints are not Unicode,
    // so reading Latin advances through them would be wrong. We never fall back to one.
    if (score === null) continue;
    candidates.push({
      score,
      offset: cmapOffset + view.getUint32(recordOffset + 4),
    });
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    const format = view.getUint16(candidate.offset);
    if (format === 4 || format === 6 || format === 12)
      return makeCmapLookup(view, candidate.offset);
  }
  throw new Error("unsupported font: no readable Unicode cmap subtable");
}

/** Rank Unicode `cmap` subtables (full Unicode first, then BMP); null for non-Unicode subtables. */
function cmapPreference(platformId: number, encodingId: number): number | null {
  if (platformId === 3 && encodingId === 10) return 4; // Windows Unicode UCS-4
  if (platformId === 0 && (encodingId === 4 || encodingId === 6)) return 3; // Unicode full
  if (platformId === 3 && encodingId === 1) return 2; // Windows Unicode BMP
  if (platformId === 0) return 1; // Unicode BMP and earlier
  return null; // Macintosh, Windows symbol, and anything else: not a Unicode cmap
}

/**
 * Parse just enough of an SFNT font (TrueType or CFF/OTF) to read normalized advance widths by
 * codepoint. Throws an explicit error when the container is a collection or a required table is missing.
 */
export function parseFont(bytes: Uint8Array): FontMetrics {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12)
    throw new Error("unsupported font: file is too small to be an SFNT");

  const sfntVersion = view.getUint32(0);
  if (sfntVersion === 0x74746366)
    throw new Error("unsupported font: TrueType/OpenType collections (ttcf)");
  const isSfnt =
    sfntVersion === 0x00010000 || // TrueType outlines
    sfntVersion === 0x4f54544f || // 'OTTO' - CFF outlines
    sfntVersion === 0x74727565; // 'true'
  if (!isSfnt)
    throw new Error(
      `unsupported font: not an SFNT (sfntVersion 0x${sfntVersion.toString(16)})`,
    );

  const numTables = view.getUint16(4);
  const tables = new Map<string, number>();
  for (let i = 0; i < numTables; i++) {
    const recordOffset = 12 + i * 16;
    tables.set(tagAt(view, recordOffset), view.getUint32(recordOffset + 8));
  }

  const missing = REQUIRED_TABLES.filter((tag) => !tables.has(tag));
  if (missing.length > 0)
    throw new Error(
      `unsupported font: missing required table(s): ${missing.join(", ")}`,
    );

  const headOffset = tables.get("head") as number;
  const unitsPerEm = view.getUint16(headOffset + 18);
  if (unitsPerEm === 0)
    throw new Error("unsupported font: head.unitsPerEm is zero");

  const numberOfHMetrics = view.getUint16((tables.get("hhea") as number) + 34);
  if (numberOfHMetrics === 0)
    throw new Error("unsupported font: hhea.numberOfHMetrics is zero");

  const hmtxOffset = tables.get("hmtx") as number;
  const advanceOfGlyph = (glyphId: number): number => {
    const index = glyphId < numberOfHMetrics ? glyphId : numberOfHMetrics - 1;
    return view.getUint16(hmtxOffset + index * 4);
  };

  const lookup = readCmap(view, tables.get("cmap") as number);

  return {
    unitsPerEm,
    normalizedAdvance(codepoint: number): number | undefined {
      const glyphId = lookup(codepoint);
      if (glyphId === undefined) return undefined;
      return advanceOfGlyph(glyphId) / unitsPerEm;
    },
  };
}

// --- Scoring ----------------------------------------------------------------

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

/** Build a font's normalized-advance map over the sample (only codepoints it maps are included). */
export function sampleMetrics(
  font: FontMetrics,
  sample: readonly number[] = LATIN_SAMPLE,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const cp of sample) {
    const advance = font.normalizedAdvance(cp);
    if (advance !== undefined) map.set(cp, advance);
  }
  return map;
}

// --- Source cache + candidates ---------------------------------------------

/** One snapshot file entry: a font member by path, with its display name. */
interface SnapshotFile {
  name: string;
  path: string;
}

type ArchiveFormat = "zip" | "tar.gz";

/**
 * A source as recorded in `source-snapshot.json`. Archive sources extract their candidate fonts from a
 * cached release archive; GitHub tree sources read each `files[].path` directly from the cache. `kind` is
 * optional so older snapshots (archive-only) still load and default to archive behavior.
 */
export interface SnapshotSource {
  sourceId: string;
  family: string;
  targetFamilies: string[];
  kind?: "archive" | "github-tree";
  archiveFormat?: ArchiveFormat;
  files?: SnapshotFile[];
}

/** A candidate font ready to score: its display name and raw bytes. */
export interface CandidateFile {
  file: string;
  bytes: Uint8Array;
}

const archiveFormatOf = (source: SnapshotSource): ArchiveFormat =>
  source.archiveFormat ?? "zip";

const archiveExtensions: Record<ArchiveFormat, string> = {
  zip: "zip",
  "tar.gz": "tar.gz",
};

function requireArchiveTool(format: ArchiveFormat): void {
  const tool = format === "tar.gz" ? "tar" : "unzip";
  const probe = format === "tar.gz" ? "--version" : "-v";
  try {
    execFileSync(tool, [probe], { stdio: "ignore" });
  } catch {
    throw new Error(`\`${tool}\` is required on PATH.`);
  }
}

function isFontFile(path: string): boolean {
  return RAW_SFNT_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
}

/** Font members inside a source archive, by their in-archive path. */
function listFontMembers(archivePath: string, format: ArchiveFormat): string[] {
  const out =
    format === "tar.gz"
      ? execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
      : execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isFontFile);
}

// `unzip -p` matches its member argument as a glob, so members with literal glob
// metacharacters (e.g. variable-font names like `NotoSans-Italic[wdth,wght].ttf`)
// must be escaped to extract by exact name.
const escapeArchiveMember = (name: string): string =>
  name.replace(/[\\*?[\]]/g, "\\$&");

function readArchiveMember(
  archivePath: string,
  member: string,
  format: ArchiveFormat,
): Uint8Array {
  const opts = { maxBuffer: 256 * 1024 * 1024 };
  return new Uint8Array(
    format === "tar.gz"
      ? execFileSync("tar", ["-xzOf", archivePath, "--", member], opts)
      : execFileSync(
          "unzip",
          ["-p", archivePath, escapeArchiveMember(member)],
          opts,
        ),
  );
}

/** Load the acquire snapshot, failing explicitly when the cache or snapshot is absent. */
function loadSnapshot(cacheDir: string): SnapshotSource[] {
  if (!existsSync(cacheDir))
    throw new Error(
      `source cache not found at ${cacheDir}. Run \`bun run corpus:acquire\` first.`,
    );
  const snapshotPath = join(cacheDir, SNAPSHOT_FILE);
  if (!existsSync(snapshotPath))
    throw new Error(
      `${SNAPSHOT_FILE} not found in ${cacheDir}. Run \`bun run corpus:acquire\` first.`,
    );
  const parsed = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
    snapshots?: SnapshotSource[];
  };
  const snapshots = parsed.snapshots ?? [];
  if (snapshots.length === 0)
    throw new Error(`${SNAPSHOT_FILE} lists no acquired sources.`);
  return snapshots;
}

/**
 * Collect the candidate fonts for one source from the cache. GitHub tree sources read each snapshot file
 * entry directly; archive sources list and extract font members from the cached release archive. Throws
 * when an expected cache file is absent so the caller can point the user back at `bun run corpus:acquire`.
 */
export function collectCandidates(
  source: SnapshotSource,
  cacheDir: string,
): CandidateFile[] {
  if (source.kind === "github-tree") {
    const files = source.files ?? [];
    if (files.length === 0)
      throw new Error(`no candidate files listed for ${source.sourceId}`);
    return files.map((entry) => {
      const filePath = join(cacheDir, entry.path);
      if (!existsSync(filePath))
        throw new Error(
          `candidate file missing for ${source.sourceId}: ${filePath}. Run \`bun run corpus:acquire\` first.`,
        );
      return { file: entry.name, bytes: readFileSync(filePath) };
    });
  }

  const format = archiveFormatOf(source);
  const archivePath = join(
    cacheDir,
    `${source.sourceId}.${archiveExtensions[format]}`,
  );
  if (!existsSync(archivePath))
    throw new Error(
      `candidate archive missing for ${source.sourceId}: ${archivePath}. Run \`bun run corpus:acquire\` first.`,
    );
  const members = listFontMembers(archivePath, format);
  if (members.length === 0)
    throw new Error(`no candidate font files in ${archivePath}`);

  const basenameCounts = new Map<string, number>();
  for (const member of members) {
    const file = basename(member);
    basenameCounts.set(file, (basenameCounts.get(file) ?? 0) + 1);
  }
  const duplicateBasenames = new Set(
    [...basenameCounts].filter(([, count]) => count > 1).map(([file]) => file),
  );

  return members.map((member) => ({
    file: displayNameForMember(member, duplicateBasenames),
    bytes: readArchiveMember(archivePath, member, format),
  }));
}

// --- CLI --------------------------------------------------------------------

interface CompareRow {
  sourceId: string;
  file: string;
  score: CompareScore;
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

function formatCodepoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function formatDelta(value: number): string {
  return Number.isNaN(value) ? "n/a" : value.toFixed(4);
}

function formatWorst(worst: GlyphDelta[]): string {
  if (worst.length === 0) return "-";
  return worst
    .map((g) => `${formatCodepoint(g.codepoint)} ${g.delta.toFixed(4)}`)
    .join("; ");
}

interface RenderOptions {
  limit?: number | null;
}

/** Render the ranked table. Returned as a string so it can be tested without capturing stdout. */
export function renderReport(
  rows: CompareRow[],
  options: RenderOptions = {},
): string {
  const ranked = [...rows].sort((a, b) => {
    const tierDiff = TIER_RANK[a.score.tier] - TIER_RANK[b.score.tier];
    if (tierDiff !== 0) return tierDiff;
    const aMean = Number.isNaN(a.score.meanDelta)
      ? Infinity
      : a.score.meanDelta;
    const bMean = Number.isNaN(b.score.meanDelta)
      ? Infinity
      : b.score.meanDelta;
    return aMean - bMean;
  });

  const visible =
    options.limit === null ? ranked : ranked.slice(0, options.limit);

  const header = [
    "source",
    "file",
    "mean",
    "max",
    "tier",
    "coverage",
    "missing",
    "over1",
    "over2.5",
    "worst",
  ];
  const body = visible.map((row) => [
    row.sourceId,
    row.file,
    formatDelta(row.score.meanDelta),
    formatDelta(row.score.maxDelta),
    row.score.tier,
    `${row.score.compared}/${row.score.total}`,
    String(row.score.missing),
    String(row.score.over1Percent),
    String(row.score.over2_5Percent),
    formatWorst(row.score.worstGlyphs),
  ]);

  const widths = header.map((h, col) =>
    Math.max(h.length, ...body.map((r) => r[col].length)),
  );
  const line = (cells: string[]) =>
    cells
      .map((cell, col) => cell.padEnd(widths[col]))
      .join("  ")
      .trimEnd();
  return [line(header), ...body.map(line)].join("\n");
}

function displayNameForMember(
  member: string,
  duplicateBasenames: Set<string>,
): string {
  const file = basename(member);
  return duplicateBasenames.has(file) ? member : file;
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
  const snapshot = loadSnapshot(cacheDir);
  const byId = new Map(snapshot.map((source) => [source.sourceId, source]));

  let selected: SnapshotSource[];
  if (args.sources.length > 0) {
    const unknown = args.sources.filter((id) => !byId.has(id));
    if (unknown.length > 0)
      throw new Error(
        `source(s) not in cache: ${unknown.join(", ")}. Acquired: ${[...byId.keys()].join(", ")}`,
      );
    selected = args.sources.map((id) => byId.get(id) as SnapshotSource);
  } else {
    selected = snapshot;
  }

  const archiveSources = selected.filter(
    (source) => source.kind !== "github-tree",
  );
  for (const format of new Set(archiveSources.map(archiveFormatOf)))
    requireArchiveTool(format);

  const reference = sampleMetrics(parseFont(readFileSync(args.reference)));

  const rows: CompareRow[] = [];
  let skipped = 0;
  for (const source of selected) {
    for (const candidate of collectCandidates(source, cacheDir)) {
      try {
        const font = parseFont(candidate.bytes);
        const score = scoreAdvances(reference, sampleMetrics(font), {
          reportSample: LATIN_SAMPLE,
          tierSample: args.model === "latin" ? LATIN_TEXT_SAMPLE : LATIN_SAMPLE,
          model: args.model,
        });
        rows.push({ sourceId: source.sourceId, file: candidate.file, score });
      } catch {
        skipped++;
      }
    }
  }

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

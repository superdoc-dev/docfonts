/**
 * Local maintainer tool: compare a private reference font with acquired open-font archives.
 * Reads ignored cache files, prints to stdout, and writes nothing to the tree.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PKG_DIR = join(import.meta.dir, "..");
const DEFAULT_CACHE_DIR = join(PKG_DIR, ".cache", "sources");
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

// --- Tiers ------------------------------------------------------------------

/**
 * Advance-fidelity tier. Thresholds mirror the package's verdict language (see `src/types.ts`):
 * metric_safe is the DIRECT band, near_metric the LIKELY band, everything else visual_only.
 */
export type CompareTier = "metric_safe" | "near_metric" | "visual_only";

const TIER_RANK: Record<CompareTier, number> = {
  metric_safe: 0,
  near_metric: 1,
  visual_only: 2,
};

/** Classify a (mean, max) advance-delta pair into a fidelity tier. Deltas are fractions of the em. */
export function classifyTier(meanDelta: number, maxDelta: number): CompareTier {
  if (meanDelta <= 0.005 && maxDelta <= 0.01) return "metric_safe";
  if (meanDelta <= 0.01 && maxDelta <= 0.025) return "near_metric";
  return "visual_only";
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
  /** codepoints in the sample that both fonts map. */
  compared: number;
  /** sample size. */
  total: number;
  /** sample codepoints not mapped by both fonts. */
  missing: number;
  meanDelta: number;
  maxDelta: number;
  /** shared sample codepoints whose advance delta exceeds the metric_safe max threshold. */
  over1Percent: number;
  /** shared sample codepoints whose advance delta exceeds the near_metric max threshold. */
  over2_5Percent: number;
  tier: CompareTier;
  worstGlyphs: GlyphDelta[];
}

/**
 * Score one candidate against the reference over the sample. Both inputs are normalized advance maps
 * (codepoint -> advance/unitsPerEm); only codepoints present in both are compared. Pure, so it can be
 * tested with mocked metric maps and never needs a real font.
 */
export function scoreAdvances(
  reference: ReadonlyMap<number, number>,
  candidate: ReadonlyMap<number, number>,
  sample: readonly number[] = LATIN_SAMPLE,
  worstCount = 3,
): CompareScore {
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
    // With no shared codepoints there is nothing to vouch for: report the floor tier.
    tier: compared === 0 ? "visual_only" : classifyTier(meanDelta, maxDelta),
    worstGlyphs,
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

/**
 * A source as recorded in `source-snapshot.json`. Archive sources extract their candidate fonts from a
 * cached zip; GitHub tree sources read each `files[].path` directly from the cache. `kind` is optional so
 * older snapshots (archive-only) still load and default to archive behavior.
 */
export interface SnapshotSource {
  sourceId: string;
  family: string;
  targetFamilies: string[];
  kind?: "archive" | "github-tree";
  files?: SnapshotFile[];
}

/** A candidate font ready to score: its display name and raw bytes. */
export interface CandidateFile {
  file: string;
  bytes: Uint8Array;
}

function requireUnzip(): void {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
  } catch {
    throw new Error("`unzip` is required on PATH.");
  }
}

function isFontFile(path: string): boolean {
  return RAW_SFNT_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
}

/** Font members inside a source archive, by their in-archive path. */
function listFontMembers(zipPath: string): string[] {
  return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
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

function readArchiveMember(zipPath: string, member: string): Uint8Array {
  return new Uint8Array(
    execFileSync("unzip", ["-p", zipPath, escapeArchiveMember(member)], {
      maxBuffer: 256 * 1024 * 1024,
    }),
  );
}

/** Load the acquire snapshot, failing explicitly when the cache or snapshot is absent. */
function loadSnapshot(cacheDir: string): SnapshotSource[] {
  if (!existsSync(cacheDir))
    throw new Error(
      `source cache not found at ${cacheDir}. Run \`bun run acquire\` first.`,
    );
  const snapshotPath = join(cacheDir, SNAPSHOT_FILE);
  if (!existsSync(snapshotPath))
    throw new Error(
      `${SNAPSHOT_FILE} not found in ${cacheDir}. Run \`bun run acquire\` first.`,
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
 * entry directly; archive sources list and extract font members from the cached zip. Throws when an
 * expected cache file is absent so the caller can point the user back at `bun run acquire`.
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
          `candidate file missing for ${source.sourceId}: ${filePath}. Run \`bun run acquire\` first.`,
        );
      return { file: entry.name, bytes: readFileSync(filePath) };
    });
  }

  const zipPath = join(cacheDir, `${source.sourceId}.zip`);
  if (!existsSync(zipPath))
    throw new Error(
      `candidate archive missing for ${source.sourceId}: ${zipPath}. Run \`bun run acquire\` first.`,
    );
  const members = listFontMembers(zipPath);
  if (members.length === 0)
    throw new Error(`no candidate font files in ${zipPath}`);

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
    bytes: readArchiveMember(zipPath, member),
  }));
}

// --- CLI --------------------------------------------------------------------

interface CompareRow {
  sourceId: string;
  file: string;
  score: CompareScore;
}

interface ParsedArgs {
  reference?: string;
  family?: string;
  limit: number | null;
  sources: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { limit: 50, sources: [] };
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

  // Only archive sources need `unzip`; a GitHub-tree-only run does not.
  if (selected.some((source) => source.kind !== "github-tree")) requireUnzip();

  const reference = sampleMetrics(parseFont(readFileSync(args.reference)));

  const rows: CompareRow[] = [];
  let skipped = 0;
  for (const source of selected) {
    for (const candidate of collectCandidates(source, cacheDir)) {
      try {
        const font = parseFont(candidate.bytes);
        const score = scoreAdvances(reference, sampleMetrics(font));
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
  console.log(
    `reference ${basename(args.reference)} as "${label}" vs ${rows.length} candidate(s) over ${LATIN_SAMPLE.length} Latin codepoints; showing ${shown}${skippedText}\n`,
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

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const RAW_SFNT_EXTENSIONS = [".otf", ".ttf"];
const SNAPSHOT_FILE = "source-snapshot.json";

/** One snapshot file entry: a font member by path, with its display name. */
interface SnapshotFile {
  name: string;
  path: string;
}

export type ArchiveFormat = "zip" | "tar.gz";

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

export const archiveFormatOf = (source: SnapshotSource): ArchiveFormat =>
  source.archiveFormat ?? "zip";

const archiveExtensions: Record<ArchiveFormat, string> = {
  zip: "zip",
  "tar.gz": "tar.gz",
};

export function requireArchiveTool(format: ArchiveFormat): void {
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
export function loadSnapshot(cacheDir: string): SnapshotSource[] {
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

function displayNameForMember(
  member: string,
  duplicateBasenames: Set<string>,
): string {
  const file = basename(member);
  return duplicateBasenames.has(file) ? member : file;
}

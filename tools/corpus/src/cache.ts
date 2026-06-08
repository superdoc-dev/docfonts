import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  type ArchiveFormat,
  archiveFormatOf,
  archivePathFor,
  hasFontExtension,
  listArchiveMembers,
  RAW_SFNT_EXTENSIONS,
  readArchiveMember,
  requireArchiveTool,
} from "./archive";

const SNAPSHOT_FILE = "source-snapshot.json";

/** One snapshot file entry: a font member by path, with its display name. */
interface SnapshotFile {
  name: string;
  path: string;
}

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

export { type ArchiveFormat, archiveFormatOf, requireArchiveTool };

/** Font members inside a source archive, by their in-archive path. */
function listFontMembers(archivePath: string, format: ArchiveFormat): string[] {
  return listArchiveMembers(archivePath, format).filter((member) =>
    hasFontExtension(member, RAW_SFNT_EXTENSIONS),
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
  const archivePath = archivePathFor(cacheDir, source.sourceId, format);
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

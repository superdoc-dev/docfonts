import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type ArchiveSource,
  type GitHubTreeSource,
  type LicenseFamily,
  SOURCE_RELEASES,
} from "./sources";
import { LICENSE_FILE_NAMES } from "./sources/licenses";
import {
  ACQUIRE_FONT_EXTENSIONS,
  type ArchiveFormat,
  archiveFormatOf,
  archivePathFor,
  hasFontExtension,
  listArchiveMembers,
  readArchiveMember,
  requireArchiveTool,
} from "./src/archive";

export type {
  ArchiveSource,
  GitHubTreeSource,
  LicenseFamily,
  SourceRelease,
} from "./sources";
export { SOURCE_RELEASES } from "./sources";

const githubRawUrl = (repo: string, commit: string, path: string): string =>
  `https://raw.githubusercontent.com/${repo}/${commit}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const githubTreeUrl = (repo: string, commit: string): string =>
  `https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`;

interface FileSnapshot {
  name: string;
  /** For archives: the in-archive member path. For cached files: the cache-relative path. */
  path: string;
  sha256: string;
  sourcePath?: string;
  licenseFamily?: LicenseFamily;
  licensePath?: string;
  licenseSha256?: string;
}

/** Snapshot fields common to both source kinds. */
interface BaseSnapshot {
  sourceId: string;
  family: string;
  project: string;
  files: FileSnapshot[];
  targetFamilies: string[];
}

interface ArchiveSnapshot extends BaseSnapshot {
  kind: "archive";
  archiveFormat: ArchiveFormat;
  licenseFamily: string;
  licenseUrl: string;
  licenseSha256: string;
  downloadUrl: string;
  archiveSha256: string;
}

interface GitHubTreeSnapshot extends BaseSnapshot {
  kind: "github-tree";
  repo: string;
  commit: string;
}

type SourceSnapshot = ArchiveSnapshot | GitHubTreeSnapshot;

const REPO_DIR = join(import.meta.dir, "..", "..");
const DEFAULT_CACHE_DIR = join(REPO_DIR, ".cache", "corpus");

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const basename = (path: string): string => path.split("/").pop() ?? path;

const isFontFile = (path: string): boolean =>
  hasFontExtension(path, ACQUIRE_FONT_EXTENSIONS);

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export interface GitHubTreeEntry {
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated?: boolean;
}

interface GitHubFontEntry {
  name: string;
  sourcePath: string;
  licenseFamily: LicenseFamily;
  licenseSourcePath: string;
}

const familyRootOf = (path: string): string | null => {
  const parts = path.split("/");
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
};

const licenseFileNameOf = (path: string): string => path.split("/").pop() ?? "";

/**
 * Select every font file under the source's approved license directories and
 * attach the matching family license. Pure so catalog behavior is testable
 * without network access.
 */
export function collectGitHubTreeFonts(
  source: GitHubTreeSource,
  entries: readonly GitHubTreeEntry[],
): GitHubFontEntry[] {
  const licensedRoots = new Map<
    string,
    { licenseFamily: LicenseFamily; licenseSourcePath: string }
  >();

  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    const root = familyRootOf(entry.path);
    if (!root) continue;
    const [licenseDir] = root.split("/");
    const licenseFamily = source.licenseDirs[licenseDir];
    if (!licenseFamily) continue;
    if (!LICENSE_FILE_NAMES.has(licenseFileNameOf(entry.path))) continue;
    licensedRoots.set(root, {
      licenseFamily,
      licenseSourcePath: entry.path,
    });
  }

  const fonts: GitHubFontEntry[] = [];
  for (const entry of entries) {
    if (entry.type !== "blob" || !isFontFile(entry.path)) continue;
    const root = familyRootOf(entry.path);
    if (!root) continue;
    const [licenseDir] = root.split("/");
    if (!source.licenseDirs[licenseDir]) continue;
    const license = licensedRoots.get(root);
    if (!license) continue;
    fonts.push({
      name: basename(entry.path),
      sourcePath: entry.path,
      licenseFamily: license.licenseFamily,
      licenseSourcePath: license.licenseSourcePath,
    });
  }

  return fonts.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

async function mapLimit<T, U>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function acquireArchive(
  source: ArchiveSource,
  cacheDir: string,
): Promise<ArchiveSnapshot> {
  const format = archiveFormatOf(source);
  const archive = await fetchBytes(source.downloadUrl);
  const archivePath = archivePathFor(cacheDir, source.sourceId, format);
  writeFileSync(archivePath, archive);

  const members = listArchiveMembers(archivePath, format).filter(isFontFile);
  if (members.length === 0)
    throw new Error(`${source.sourceId}: archive has no font files`);

  const files = members
    .map((member) => ({
      name: basename(member),
      path: member,
      sha256: sha256(readArchiveMember(archivePath, member, format)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const fileNames = new Set(files.map((file) => file.name));
  const missing = source.expectedFiles.filter((name) => !fileNames.has(name));
  if (missing.length > 0)
    throw new Error(
      `${source.sourceId}: missing expected files: ${missing.join(", ")}`,
    );

  const license = await fetchBytes(source.licenseUrl);
  writeFileSync(join(cacheDir, `${source.sourceId}.license.txt`), license);

  return {
    kind: "archive",
    archiveFormat: format,
    sourceId: source.sourceId,
    family: source.family,
    project: source.project,
    licenseFamily: source.licenseFamily,
    downloadUrl: source.downloadUrl,
    archiveSha256: sha256(archive),
    licenseUrl: source.licenseUrl,
    licenseSha256: sha256(license),
    files,
    targetFamilies: source.targetFamilies,
  };
}

async function acquireGitHubTree(
  source: GitHubTreeSource,
  cacheDir: string,
): Promise<GitHubTreeSnapshot> {
  const tree = await fetchJson<GitHubTreeResponse>(
    githubTreeUrl(source.repo, source.commit),
  );
  if (tree.truncated)
    throw new Error(`${source.sourceId}: GitHub tree response was truncated`);

  const fontEntries = collectGitHubTreeFonts(source, tree.tree);
  if (fontEntries.length === 0)
    throw new Error(`${source.sourceId}: tree has no font files`);

  const sourceDir = join(cacheDir, source.sourceId);
  mkdirSync(sourceDir, { recursive: true });

  const licenseCache = new Map<
    string,
    Promise<{ path: string; sha256: string }>
  >();
  const acquireLicense = (
    licenseSourcePath: string,
  ): Promise<{ path: string; sha256: string }> => {
    const cached = licenseCache.get(licenseSourcePath);
    if (cached) return cached;

    const promise = (async () => {
      const bytes = await fetchBytes(
        githubRawUrl(source.repo, source.commit, licenseSourcePath),
      );
      const path = `${source.sourceId}/licenses/${licenseSourcePath}`;
      const outPath = join(cacheDir, path);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, bytes);
      return { path, sha256: sha256(bytes) };
    })();
    licenseCache.set(licenseSourcePath, promise);
    return promise;
  };

  const files = await mapLimit(fontEntries, 12, async (entry) => {
    const [fontBytes, license] = await Promise.all([
      fetchBytes(githubRawUrl(source.repo, source.commit, entry.sourcePath)),
      acquireLicense(entry.licenseSourcePath),
    ]);
    const path = `${source.sourceId}/${entry.sourcePath}`;
    const outPath = join(cacheDir, path);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, fontBytes);

    return {
      name: entry.name,
      path,
      sha256: sha256(fontBytes),
      sourcePath: entry.sourcePath,
      licenseFamily: entry.licenseFamily,
      licensePath: license.path,
      licenseSha256: license.sha256,
    };
  });

  return {
    kind: "github-tree",
    sourceId: source.sourceId,
    family: source.family,
    project: source.project,
    repo: source.repo,
    commit: source.commit,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    targetFamilies: source.targetFamilies,
  };
}

interface AcquireArgs {
  sources: string[];
}

function parseArgs(argv: string[]): AcquireArgs {
  const args: AcquireArgs = { sources: [] };
  const readValue = (flag: string, index: number): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${flag} requires a value`);
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--source":
        for (const id of readValue(flag, i)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean))
          args.sources.push(id);
        i++;
        break;
      default:
        throw new Error(`unknown argument: ${flag}`);
    }
  }

  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const byId = new Map(
    SOURCE_RELEASES.map((source) => [source.sourceId, source]),
  );
  const sources =
    args.sources.length === 0
      ? SOURCE_RELEASES
      : args.sources.map((id) => {
          const source = byId.get(id);
          if (!source)
            throw new Error(
              `unknown source: ${id}. Available: ${[...byId.keys()].join(", ")}`,
            );
          return source;
        });

  const archiveSources = sources.filter(
    (source): source is ArchiveSource => source.kind !== "github-tree",
  );
  for (const format of new Set(archiveSources.map(archiveFormatOf)))
    requireArchiveTool(format);

  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
  mkdirSync(cacheDir, { recursive: true });

  const snapshots: SourceSnapshot[] = [];
  for (const source of sources) {
    console.log(`acquiring ${source.sourceId}`);
    snapshots.push(
      source.kind === "github-tree"
        ? await acquireGitHubTree(source, cacheDir)
        : await acquireArchive(source, cacheDir),
    );
  }

  snapshots.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const outPath = join(cacheDir, "source-snapshot.json");
  writeFileSync(
    outPath,
    `${JSON.stringify({ generatedBy: "tools/corpus/acquire.ts", snapshots }, null, 2)}\n`,
  );
  console.log(`wrote ${outPath}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const GUST_LICENSE_URL =
  "https://www.gust.org.pl/projects/e-foundry/licenses/GUST-FONT-LICENSE.txt/at_download/file";

// Pinned google/fonts commit. The Google tree source resolves against this SHA
// so acquisitions stay reproducible even as the upstream branch moves.
const GOOGLE_FONTS_COMMIT = "c89741abbf4eeabce432c3ed2fd7dc28b022701e";

const githubRawUrl = (repo: string, commit: string, path: string): string =>
  `https://raw.githubusercontent.com/${repo}/${commit}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const githubTreeUrl = (repo: string, commit: string): string =>
  `https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`;

const LICENSE_FILE_NAMES = new Set([
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE.txt",
  "OFL.txt",
  "UFL.txt",
]);

export type LicenseFamily =
  | "GUST-FL"
  | "OFL-1.1"
  | "AGPL-3.0-FE"
  | "Apache-2.0"
  | "UFL-1.0";

/** Fields shared by every acquisition source, regardless of how it is fetched. */
interface BaseSource {
  sourceId: string;
  family: string;
  project: string;
  targetFamilies: string[];
}

interface LicensedSource extends BaseSource {
  licenseFamily: LicenseFamily;
  licenseUrl: string;
}

/** A source delivered as a single zip archive containing many font members. */
export interface ArchiveSource extends LicensedSource {
  /** Optional for archive sources: an absent `kind` is treated as "archive". */
  kind?: "archive";
  downloadUrl: string;
  expectedFiles: string[];
}

/** A source discovered from a pinned GitHub tree, then downloaded as raw files. */
export interface GitHubTreeSource extends BaseSource {
  kind: "github-tree";
  repo: string;
  commit: string;
  licenseDirs: Record<string, LicenseFamily>;
}

export type SourceRelease = ArchiveSource | GitHubTreeSource;

export const SOURCE_RELEASES: SourceRelease[] = [
  {
    sourceId: "tex-gyre-adventor",
    family: "TeX Gyre Adventor",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/adventor/tg_adventor-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreadventor-regular.otf",
      "texgyreadventor-bold.otf",
      "texgyreadventor-italic.otf",
      "texgyreadventor-bolditalic.otf",
    ],
    targetFamilies: ["Century Gothic", "ITC Avant Garde Gothic"],
  },
  {
    sourceId: "tex-gyre-bonum",
    family: "TeX Gyre Bonum",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/bonum/tg_bonum-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrebonum-regular.otf",
      "texgyrebonum-bold.otf",
      "texgyrebonum-italic.otf",
      "texgyrebonum-bolditalic.otf",
    ],
    targetFamilies: ["Bookman Old Style", "ITC Bookman"],
  },
  {
    sourceId: "tex-gyre-chorus",
    family: "TeX Gyre Chorus",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/chorus/tg_chorus-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: ["texgyrechorus-mediumitalic.otf"],
    targetFamilies: ["Monotype Corsiva", "ITC Zapf Chancery"],
  },
  {
    sourceId: "tex-gyre-cursor",
    family: "TeX Gyre Cursor",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/cursor/tg_cursor-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrecursor-regular.otf",
      "texgyrecursor-bold.otf",
      "texgyrecursor-italic.otf",
      "texgyrecursor-bolditalic.otf",
    ],
    targetFamilies: ["Courier New", "Courier"],
  },
  {
    sourceId: "tex-gyre-heros",
    family: "TeX Gyre Heros",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros/tg_heros-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreheros-regular.otf",
      "texgyreheros-bold.otf",
      "texgyreheros-italic.otf",
      "texgyreheros-bolditalic.otf",
    ],
    targetFamilies: ["Arial", "Helvetica", "Arial Narrow"],
  },
  {
    sourceId: "tex-gyre-pagella",
    family: "TeX Gyre Pagella",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/pagella/tg_pagella-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrepagella-regular.otf",
      "texgyrepagella-bold.otf",
      "texgyrepagella-italic.otf",
      "texgyrepagella-bolditalic.otf",
    ],
    targetFamilies: ["Palatino Linotype", "Book Antiqua"],
  },
  {
    sourceId: "tex-gyre-schola",
    family: "TeX Gyre Schola",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/schola/tg_schola-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreschola-regular.otf",
      "texgyreschola-bold.otf",
      "texgyreschola-italic.otf",
      "texgyreschola-bolditalic.otf",
    ],
    targetFamilies: ["Century Schoolbook", "New Century Schoolbook"],
  },
  {
    sourceId: "tex-gyre-termes",
    family: "TeX Gyre Termes",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/termes/tg_termes-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyretermes-regular.otf",
      "texgyretermes-bold.otf",
      "texgyretermes-italic.otf",
      "texgyretermes-bolditalic.otf",
    ],
    targetFamilies: ["Times New Roman", "Times"],
  },

  {
    sourceId: "urw-base35",
    family: "URW Base 35",
    project: "URW Base 35",
    licenseFamily: "AGPL-3.0-FE",
    downloadUrl:
      "https://github.com/ArtifexSoftware/urw-base35-fonts/archive/refs/tags/20200910.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/ArtifexSoftware/urw-base35-fonts/20200910/LICENSE",
    expectedFiles: [
      "NimbusRoman-Regular.otf",
      "NimbusSans-Regular.otf",
      "NimbusMonoPS-Regular.otf",
      "URWBookman-Light.otf",
      "P052-Roman.otf",
      "C059-Roman.otf",
    ],
    targetFamilies: [
      "Times New Roman",
      "Arial",
      "Helvetica",
      "Courier New",
      "Bookman Old Style",
      "Palatino Linotype",
      "Century Schoolbook",
    ],
  },

  {
    sourceId: "source-serif-4",
    family: "Source Serif 4",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-serif/releases/download/4.005R/source-serif-4.005_Desktop.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-serif/release/LICENSE.md",
    expectedFiles: [
      "SourceSerif4-Regular.otf",
      "SourceSerif4-Bold.otf",
      "SourceSerif4-It.otf",
      "SourceSerif4-BoldIt.otf",
    ],
    targetFamilies: ["Georgia", "Cambria"],
  },
  {
    sourceId: "source-sans-3",
    family: "Source Sans 3",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-sans/releases/download/3.052R/OTF-source-sans-3.052R.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-sans/release/LICENSE.md",
    expectedFiles: [
      "SourceSans3-Regular.otf",
      "SourceSans3-Bold.otf",
      "SourceSans3-It.otf",
      "SourceSans3-BoldIt.otf",
    ],
    targetFamilies: ["Calibri", "Segoe UI"],
  },
  {
    sourceId: "source-code-pro",
    family: "Source Code Pro",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-code-pro/releases/download/2.042R-u/1.062R-i/1.026R-vf/OTF-source-code-pro-2.042R-u_1.062R-i.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-code-pro/release/LICENSE.md",
    expectedFiles: [
      "SourceCodePro-Regular.otf",
      "SourceCodePro-Bold.otf",
      "SourceCodePro-It.otf",
      "SourceCodePro-BoldIt.otf",
    ],
    targetFamilies: ["Consolas", "Courier New"],
  },

  {
    sourceId: "sil-charis",
    family: "Charis SIL",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-charis/releases/download/v7.000/Charis-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-charis/v7.000/OFL.txt",
    expectedFiles: [
      "Charis-Regular.ttf",
      "Charis-Bold.ttf",
      "Charis-Italic.ttf",
      "Charis-BoldItalic.ttf",
    ],
    targetFamilies: ["Charter", "Bitstream Charter"],
  },
  {
    sourceId: "sil-gentium",
    family: "Gentium Plus",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-gentium/releases/download/v7.000/Gentium-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-gentium/v7.000/OFL.txt",
    expectedFiles: [
      "Gentium-Regular.ttf",
      "Gentium-Bold.ttf",
      "Gentium-Italic.ttf",
      "Gentium-BoldItalic.ttf",
    ],
    targetFamilies: ["Times New Roman"],
  },
  {
    sourceId: "sil-doulos",
    family: "Doulos SIL",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-doulos/releases/download/v7.000/DoulosSIL-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-doulos/v7.000/OFL.txt",
    expectedFiles: ["DoulosSIL-Regular.ttf"],
    targetFamilies: ["Times New Roman"],
  },
  {
    sourceId: "sil-andika",
    family: "Andika",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-andika/releases/download/v7.000/Andika-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-andika/v7.000/OFL.txt",
    expectedFiles: [
      "Andika-Regular.ttf",
      "Andika-Bold.ttf",
      "Andika-Italic.ttf",
      "Andika-BoldItalic.ttf",
    ],
    targetFamilies: ["Verdana", "Tahoma"],
  },

  {
    sourceId: "noto-sans",
    family: "Noto Sans",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSans-v2.015/NotoSans-v2.015.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: [
      "NotoSans-Regular.otf",
      "NotoSans-Bold.otf",
      "NotoSans-Italic.otf",
      "NotoSans-BoldItalic.otf",
    ],
    targetFamilies: ["Calibri", "Segoe UI"],
  },
  {
    sourceId: "noto-serif",
    family: "Noto Serif",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSerif-v2.015/NotoSerif-v2.015.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: [
      "NotoSerif-Regular.otf",
      "NotoSerif-Bold.otf",
      "NotoSerif-Italic.otf",
      "NotoSerif-BoldItalic.otf",
    ],
    targetFamilies: ["Georgia", "Cambria"],
  },
  {
    sourceId: "noto-sans-mono",
    family: "Noto Sans Mono",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSansMono-v2.014/NotoSansMono-v2.014.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: ["NotoSansMono-Regular.otf", "NotoSansMono-Bold.otf"],
    targetFamilies: ["Consolas", "Courier New"],
  },

  {
    kind: "github-tree",
    sourceId: "google-fonts",
    family: "Google Fonts",
    project: "Google Fonts",
    repo: "google/fonts",
    commit: GOOGLE_FONTS_COMMIT,
    licenseDirs: {
      apache: "Apache-2.0",
      ofl: "OFL-1.1",
      ufl: "UFL-1.0",
    },
    targetFamilies: ["Document font discovery"],
  },
];

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

const PKG_DIR = join(import.meta.dir, "..");
const DEFAULT_CACHE_DIR = join(PKG_DIR, ".cache", "sources");
const FONT_EXTENSIONS = [".otf", ".ttf", ".otc", ".ttc", ".woff2", ".woff"];

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const basename = (path: string): string => path.split("/").pop() ?? path;

const isFontFile = (path: string): boolean =>
  FONT_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

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

function requireUnzip(): void {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
  } catch {
    throw new Error("`unzip` is required on PATH.");
  }
}

function listArchive(zipPath: string): string[] {
  return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// `unzip -p` matches its member argument as a glob, so members with literal glob
// metacharacters (e.g. variable-font names like `NotoSans-Italic[wdth,wght].ttf`)
// must be escaped to extract by exact name.
const escapeArchiveMember = (name: string): string =>
  name.replace(/[\\*?[\]]/g, "\\$&");

function readArchiveMember(zipPath: string, name: string): Uint8Array {
  return new Uint8Array(
    execFileSync("unzip", ["-p", zipPath, escapeArchiveMember(name)], {
      maxBuffer: 256 * 1024 * 1024,
    }),
  );
}

async function acquireArchive(
  source: ArchiveSource,
  cacheDir: string,
): Promise<ArchiveSnapshot> {
  const archive = await fetchBytes(source.downloadUrl);
  const zipPath = join(cacheDir, `${source.sourceId}.zip`);
  writeFileSync(zipPath, archive);

  const members = listArchive(zipPath).filter(isFontFile);
  if (members.length === 0)
    throw new Error(`${source.sourceId}: archive has no font files`);

  const files = members
    .map((member) => ({
      name: basename(member),
      path: member,
      sha256: sha256(readArchiveMember(zipPath, member)),
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

  if (sources.some((source) => source.kind !== "github-tree")) requireUnzip();

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
    `${JSON.stringify({ generatedBy: "scripts/acquire.ts", snapshots }, null, 2)}\n`,
  );
  console.log(`wrote ${outPath}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

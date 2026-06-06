import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LICENSE_URL =
  "https://www.gust.org.pl/projects/e-foundry/licenses/GUST-FONT-LICENSE.txt/at_download/file";

export interface SourceRelease {
  sourceId: string;
  family: string;
  project: string;
  licenseFamily: "GUST-FL";
  downloadUrl: string;
  licenseUrl: string;
  expectedFiles: string[];
  targetFamilies: string[];
}

export const SOURCE_RELEASES: SourceRelease[] = [
  {
    sourceId: "tex-gyre-adventor",
    family: "TeX Gyre Adventor",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/adventor/tg_adventor-otf-2_609-31_03_2026.zip",
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
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
    licenseUrl: LICENSE_URL,
    expectedFiles: [
      "texgyretermes-regular.otf",
      "texgyretermes-bold.otf",
      "texgyretermes-italic.otf",
      "texgyretermes-bolditalic.otf",
    ],
    targetFamilies: ["Times New Roman", "Times"],
  },
];

interface FileSnapshot {
  name: string;
  sha256: string;
}

interface SourceSnapshot {
  sourceId: string;
  family: string;
  project: string;
  licenseFamily: string;
  downloadUrl: string;
  archiveSha256: string;
  licenseUrl: string;
  licenseSha256: string;
  files: FileSnapshot[];
  targetFamilies: string[];
}

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

function readArchiveMember(zipPath: string, name: string): Uint8Array {
  return new Uint8Array(
    execFileSync("unzip", ["-p", zipPath, name], {
      maxBuffer: 256 * 1024 * 1024,
    }),
  );
}

async function acquireSource(
  source: SourceRelease,
  cacheDir: string,
): Promise<SourceSnapshot> {
  const archive = await fetchBytes(source.downloadUrl);
  const zipPath = join(cacheDir, `${source.sourceId}.zip`);
  writeFileSync(zipPath, archive);

  const members = listArchive(zipPath).filter(isFontFile);
  if (members.length === 0)
    throw new Error(`${source.sourceId}: archive has no font files`);

  const files = members
    .map((member) => ({
      name: basename(member),
      sha256: sha256(readArchiveMember(zipPath, member)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const fileNames = new Set(files.map((file) => file.name));
  const missing = source.expectedFiles.filter((name) => !fileNames.has(name));
  if (missing.length > 0)
    throw new Error(
      `${source.sourceId}: missing expected files: ${missing.join(", ")}`,
    );

  const license = await fetchBytes(source.licenseUrl);
  writeFileSync(join(cacheDir, `${source.sourceId}.license.txt`), license);

  return {
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

async function main(): Promise<void> {
  requireUnzip();

  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
  mkdirSync(cacheDir, { recursive: true });

  const snapshots: SourceSnapshot[] = [];
  for (const source of SOURCE_RELEASES) {
    console.log(`acquiring ${source.sourceId}`);
    snapshots.push(await acquireSource(source, cacheDir));
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

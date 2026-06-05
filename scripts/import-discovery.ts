#!/usr/bin/env bun
/**
 * import-discovery.ts - GENERATE a DiscoverySnapshot from a vendored research corpus manifest.
 *
 * The discovery layer is the broad SEARCH SPACE (which open fonts exist and can be compared), NOT the
 * reviewed candidate corpus. This importer maps a research-built Google Fonts manifest into the public
 * DiscoverySnapshot shape: it sanitizes (drops the absolute local cache path), keeps only public
 * provenance (repoPath + raw re-fetch URL + inferred license), flags variable fonts explicitly, and
 * reports duplicate hashes rather than hiding them. NO font binaries are read or committed - this maps
 * an existing manifest; the bytes are never touched here.
 *
 * It does NOT promote anything into the reviewed CorpusManifest or records.json - that stays a
 * separate, reviewed step. "In the discovery snapshot" only means "this font exists and is comparable".
 *
 * Source: the research repo's google-fonts-latin-all-files/corpus.json (see data/sources.json ->
 * google-fonts). That repo is not part of this public project; only the sanitized manifest is committed.
 *
 * TWO-STEP, and this is only STEP 1. This writes the BOOTSTRAP snapshot (acquisition: local_bootstrap,
 * mutable /main/ rawUrls). The committed snapshot is the PINNED result, so before committing you MUST
 * then run:  bun run scripts/pin-discovery.ts --commit <sha>  (re-fetches + sha-verifies every face and
 * repins the rawUrls to that commit, acquisition: git_pinned). Running this importer ALONE regenerates
 * an unpinned snapshot that will NOT match the committed pinned one - that divergence is expected.
 *
 * Run:  bun run scripts/import-discovery.ts            write the bootstrap snapshot (step 1 of 2)
 *       bun run scripts/import-discovery.ts --check    compare bootstrap output vs committed. A committed
 *                                                      snapshot that has been pinned (git_pinned)
 *                                                      INTENTIONALLY differs - this --check is only
 *                                                      meaningful before the pin step. CI does not run it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  DiscoveryFace,
  DiscoverySnapshot,
  FontSource,
} from "../packages/registry/src/index";

const SNAPSHOT_ID = "google-fonts-all-files-2026-06-04";
const SOURCE_ID = "google-fonts";
const RETRIEVED_DATE = "2026-06-04";
const RESEARCH_MANIFEST = join(
  import.meta.dir,
  "..",
  "..",
  "font-fidelity-research",
  "harness",
  "corpus",
  "open-fonts",
  "google-fonts-latin-all-files",
  "corpus.json",
);
const OUT = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "discovery",
  `${SNAPSHOT_ID}.json`,
);
const SOURCES = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "sources.json",
);

/** The research manifest entry shape (only the fields we map). */
interface ResearchEntry {
  family: string;
  fileName: string;
  repoPath: string;
  rawUrl: string;
  license: string;
  licenseSource: string;
  latinCoverage: number;
  sha256: string;
  metadata?: { harnessCategory?: string };
  parsed?: {
    weightClass?: number;
    widthClass?: number;
    italic?: boolean;
    bold?: boolean;
  };
}

const CATEGORIES = new Set([
  "sans",
  "serif",
  "mono",
  "script",
  "display",
  "symbol",
]);
const category = (c?: string): DiscoveryFace["category"] =>
  c && CATEGORIES.has(c) ? (c as DiscoveryFace["category"]) : "unknown";

/** Canonical four-face SLOT (same rule the SFNT parser uses): a face claims a RIBBI slot only at its
 *  canonical weight (~400 upright/italic, ~700 bold); other weights are "other". */
function styleKeyOf(
  bold: boolean,
  italic: boolean,
  weight: number,
): DiscoveryFace["styleKey"] {
  const regularWeight = weight >= 350 && weight <= 550;
  const boldWeight = weight >= 600 && weight <= 800;
  if (bold && italic) return boldWeight ? "boldItalic" : "other";
  if (bold) return boldWeight ? "bold" : "other";
  if (italic) return regularWeight ? "italic" : "other";
  return regularWeight ? "regular" : "other";
}

/** Variable axis tags from a Google Fonts filename, e.g. "Roboto[wdth,wght].ttf" -> ["wdth","wght"]. */
function axesOf(fileName: string): string[] | undefined {
  const m = fileName.match(/\[([^\]]+)\]/);
  if (!m) return undefined;
  const tags = m[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

function build(): DiscoverySnapshot {
  const research = JSON.parse(readFileSync(RESEARCH_MANIFEST, "utf8")) as {
    sourceUrl?: string;
    entries: ResearchEntry[];
  };
  // Confirm the snapshot's source is the one declared in the source registry.
  const sources = JSON.parse(readFileSync(SOURCES, "utf8")) as {
    sources: FontSource[];
  };
  const src = sources.sources.find((s) => s.sourceId === SOURCE_ID);
  if (!src)
    throw new Error(
      `[discovery] source ${SOURCE_ID} not found in sources.json`,
    );

  const seen = new Map<string, number>();
  const faces: DiscoveryFace[] = [];
  for (const e of research.entries) {
    const n = (seen.get(e.sha256) ?? 0) + 1;
    seen.set(e.sha256, n);
    if (n > 1) continue; // collapse duplicate files; reported in `duplicates` below
    const weight = e.parsed?.weightClass ?? 400;
    const italic = Boolean(e.parsed?.italic);
    const axes = axesOf(e.fileName);
    faces.push({
      fileSha256: e.sha256,
      family: e.family,
      styleKey: styleKeyOf(Boolean(e.parsed?.bold), italic, weight),
      weight,
      width: e.parsed?.widthClass ?? 5,
      italic,
      isVariable: axes !== undefined,
      ...(axes ? { axes } : {}),
      category: category(e.metadata?.harnessCategory),
      latinCoverage: e.latinCoverage,
      fileName: e.fileName,
      repoPath: e.repoPath,
      rawUrl: e.rawUrl,
      license: e.license,
      licenseBasis: e.licenseSource,
    });
  }
  const duplicates = [...seen.entries()]
    .filter(([, c]) => c > 1)
    .map(([fileSha256, count]) => ({ fileSha256, count }));

  return {
    snapshotId: SNAPSHOT_ID,
    sourceId: SOURCE_ID,
    sourceUrl: src.upstreamUrl,
    // Step 1 (bootstrap): mapped from a pre-downloaded local research corpus, so sourceCommit is absent
    // and rawUrls are on /main/. pin-discovery.ts (step 2) re-fetches + verifies + repins to a commit
    // (acquisition: git_pinned). The COMMITTED snapshot is the pinned result, not this bootstrap one.
    acquisition: "local_bootstrap",
    retrievedDate: RETRIEVED_DATE,
    faceCount: faces.length,
    duplicates,
    faces,
  };
}

function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(RESEARCH_MANIFEST)) {
    console.error(
      `[discovery] source manifest not found: ${RESEARCH_MANIFEST}\n  Needs the sibling font-fidelity-research corpus.`,
    );
    process.exit(1);
  }
  const snapshot = build();
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const summary = `${snapshot.faceCount} faces (${snapshot.duplicates.length} duplicate hashes collapsed)`;

  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (current !== json) {
      console.error(
        "[discovery] --check: bootstrap output differs from the committed snapshot. If the committed one is pinned (git_pinned), this is EXPECTED - re-run import then pin-discovery.ts --commit <sha>. Otherwise regenerate + commit.",
      );
      process.exit(1);
    }
    console.log(`[discovery] --check: snapshot is up to date (${summary}).`);
    return;
  }
  writeFileSync(OUT, json);
  console.log(`[discovery] wrote ${SNAPSHOT_ID}: ${summary}.`);
}

main();

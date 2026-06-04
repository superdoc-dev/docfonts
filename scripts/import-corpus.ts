/**
 * Corpus manifest GENERATOR: turn one normalized open-font source (scripts/corpus-sources/*) into a
 * CorpusManifest under packages/registry/data/corpus/. Source-agnostic - it hashes + verifies bytes,
 * parses facts via @docfonts/font-metadata, hashes license text, dedups, and assembles the manifest.
 * No scoring, no verdicts, no proprietary files, no binaries committed. The packet/input path is a
 * PARAMETER (a source adapter owns it), never baked into the committed manifest.
 *
 * Run:  bun scripts/import-corpus.ts <source-id> [input-path]
 *   e.g. bun scripts/import-corpus.ts current-ship-set ../font-fidelity-research/artifacts/font-ship-set-legal-review-concise-2026-06-03
 *
 * Adding a source = a new adapter in scripts/corpus-sources/ + a line in SOURCES. Google Fonts,
 * direct candidates, bakeoff, and R2 storage are deliberately out of this slice.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFontFace, sha256Hex } from "@docfonts/font-metadata";
import type {
  CorpusFace,
  CorpusFamily,
  CorpusManifest,
} from "@docfonts/registry";
import { futureDirectCandidatesSource } from "./corpus-sources/future-direct-candidates";
import { shipSetSource } from "./corpus-sources/ship-set";
import type { CorpusSource } from "./corpus-sources/types";

/** default input path per source, used when the caller omits it. The future-direct candidates live
 * inside the same dated ship-set packet, so they share the default packet root. */
const DEFAULT_PACKET = join(
  import.meta.dir,
  "..",
  "..",
  "font-fidelity-research",
  "artifacts",
  "font-ship-set-legal-review-concise-2026-06-03",
);

/** registry of source adapters by id. New sources slot in here. */
const SOURCES: Record<string, (inputPath?: string) => CorpusSource> = {
  "current-ship-set": (p) => shipSetSource(p ?? DEFAULT_PACKET),
  // Static four-face future candidates only. Gelasio (variable) is deferred until variable instancing.
  "future-direct-candidates": (p) =>
    futureDirectCandidatesSource(p ?? DEFAULT_PACKET, [
      "Liberation Sans Narrow",
    ]),
};

/** logical-font names we must NEVER ingest as corpus candidates (the corpus is open fonts only). */
const PROPRIETARY = new Set(
  [
    "Calibri",
    "Cambria",
    "Aptos",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
  ].map((s) => s.toLowerCase()),
);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const STYLE_ORDER = ["regular", "bold", "italic", "boldItalic", "other"];

/** Source-agnostic pipeline: normalized faces -> validated CorpusManifest. */
async function buildManifest(src: CorpusSource): Promise<CorpusManifest> {
  const byFamily = new Map<string, CorpusFamily>();
  const seenSha = new Set<string>();

  for (const raw of src.faces()) {
    if (PROPRIETARY.has(raw.family.toLowerCase())) {
      throw new Error(`refusing to ingest proprietary family: ${raw.family}`);
    }
    const sha = await sha256Hex(raw.bytes);
    if (raw.expectedSha256 && sha !== raw.expectedSha256) {
      throw new Error(
        `sha256 mismatch for ${raw.fileName}: source ${raw.expectedSha256}, bytes ${sha}`,
      );
    }
    if (seenSha.has(sha)) continue; // dedup byte-identical redistributions across families
    seenSha.add(sha);

    const parsed = parseFontFace(raw.bytes, { fileSha256: sha });
    if (!parsed.ok)
      throw new Error(`parse failed for ${raw.fileName}: ${parsed.error}`);
    const meta = parsed.face.metadata;
    const weight = meta.face.weightClass ?? 400;

    const face: CorpusFace = {
      // globally stable id: family + style + weight + sha prefix, so multiple weights or builds of
      // the same styleKey never collide. fileSha256 stays the durable join key.
      candidateFaceId: `${slug(raw.family)}#${meta.face.styleKey}#w${weight}#${sha.slice(0, 8)}`,
      family: raw.family,
      styleKey: meta.face.styleKey,
      weight,
      style: meta.face.italic ? "italic" : "normal",
      fileName: raw.fileName,
      fileSha256: sha,
      metadata: meta,
    };

    let fam = byFamily.get(raw.family);
    if (!fam) {
      fam = {
        family: raw.family,
        license: raw.license,
        licenseSource: src.licenseSource,
        // hash THIS family's actual license bytes - never reused by license label, since two OFL
        // families can ship different copyright/license files.
        licenseTextSha256: await sha256Hex(raw.licenseTextBytes),
        licenseUrl: raw.licenseUrl,
        sourceUrl: raw.sourceUrl,
        faces: [],
      };
      byFamily.set(raw.family, fam);
    }
    // dedup on the full stable identity, not just styleKey (multiple weights share a styleKey).
    if (fam.faces.some((f) => f.candidateFaceId === face.candidateFaceId)) {
      throw new Error(`duplicate face identity ${face.candidateFaceId}`);
    }
    fam.faces.push(face);
  }

  const families = [...byFamily.values()].sort((a, b) =>
    a.family.localeCompare(b.family),
  );
  for (const fam of families) {
    fam.faces.sort(
      (a, b) =>
        STYLE_ORDER.indexOf(a.styleKey) - STYLE_ORDER.indexOf(b.styleKey),
    );
  }
  if (!families.length)
    throw new Error(`source "${src.corpusId}" yielded no faces`);

  return {
    corpusId: src.corpusId,
    source: src.source,
    sourceUrl: src.sourceUrl,
    retrievedDate: src.retrievedDate,
    families,
  };
}

async function main() {
  const [, , sourceId, inputPath] = process.argv;
  if (!sourceId || !SOURCES[sourceId]) {
    throw new Error(
      `usage: bun scripts/import-corpus.ts <source-id> [input-path]\n  known sources: ${Object.keys(SOURCES).join(", ")}`,
    );
  }
  const src = SOURCES[sourceId](inputPath);
  const manifest = await buildManifest(src);
  const out = join(
    import.meta.dir,
    "..",
    "packages",
    "registry",
    "data",
    "corpus",
    `${manifest.corpusId}.json`,
  );
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  const faceCount = manifest.families.reduce((n, f) => n + f.faces.length, 0);
  console.log(`wrote ${out}`);
  console.log(
    `source: ${manifest.corpusId} | families: ${manifest.families.length} | faces: ${faceCount}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

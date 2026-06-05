#!/usr/bin/env bun
/**
 * promote-candidates.ts - PROMOTE an allow-listed open font from the discovery snapshot into the
 * REVIEWED corpus (a license-text-hashed CorpusManifest). This is the one path that turns "we know
 * this font exists" (discovery) into "this font has exact, reviewed provenance" - the tier a verdict
 * is allowed to rest on.
 *
 * It does NOT touch records.json. Naming a promoted font as a public substitute is a SEPARATE,
 * editorial step; this only establishes provenance. Allow-list only: nothing is promoted implicitly.
 *
 * For each allow-listed family it: resolves the discovery face, reads the font bytes from the local
 * cache (verifying them against the discovery fileSha256), and fetches + hashes the EXACT upstream
 * license text (e.g. ofl/viga/OFL.txt). No binaries are committed - only the reviewed manifest (sha +
 * license-text hash + public URLs). Reuses scripts/import-corpus.ts buildManifest for the assembly.
 *
 * Run:  bun run scripts/promote-candidates.ts --cache <local-open-font-cache-dir>
 *       (--cache may also come from DOCFONTS_FONT_CACHE; needs network to fetch the license texts)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DiscoverySnapshot } from "@docfonts/registry";
import type { CorpusSource, RawCorpusFace } from "./corpus-sources/types";
import { buildManifest } from "./import-corpus";

// Allow-list: explicit families only. Static, single-source, license-fetchable. (Variable fonts get a
// deliberate instancing pass later - see gelasio-instances.) Add a family here to promote it.
const ALLOW_LIST = ["Viga"];

const CORPUS_ID = "promoted-google-fonts-2026-06-05";
const RETRIEVED_DATE = "2026-06-05";
const RAW_BASE = "https://raw.githubusercontent.com/google/fonts/main";
const TREE_BASE = "https://github.com/google/fonts/tree/main";
const LICENSE_URL: Record<string, string> = {
  "OFL-1.1": "https://openfontlicense.org/open-font-license-official-text/",
  "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "Ubuntu Font License": "https://ubuntu.com/legal/font-licence",
};

const SNAPSHOT = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "discovery",
  "google-fonts-all-files-2026-06-04.json",
);
const OUT = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "corpus",
  `${CORPUS_ID}.json`,
);

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const cache = arg("cache") ?? process.env.DOCFONTS_FONT_CACHE;
  if (!cache) {
    throw new Error(
      "usage: bun run scripts/promote-candidates.ts --cache <font-cache-dir> (or set DOCFONTS_FONT_CACHE)",
    );
  }
  const snapshot = JSON.parse(
    readFileSync(SNAPSHOT, "utf8"),
  ) as DiscoverySnapshot;

  // Pre-fetch everything (bytes + license texts) so the sync CorpusSource the driver consumes is ready.
  const raw: RawCorpusFace[] = [];
  for (const family of ALLOW_LIST) {
    const faces = snapshot.faces.filter((f) => f.family === family);
    if (!faces.length)
      throw new Error(
        `[promote] ${family} not found in the discovery snapshot`,
      );
    // One license text per family (the upstream OFL/LICENSE that sits in the family's source dir).
    const dir = faces[0].repoPath.split("/").slice(0, -1).join("/"); // e.g. "ofl/viga"
    const licenseName =
      faces[0].license === "Apache-2.0" ? "LICENSE.txt" : "OFL.txt";
    const licRes = await fetch(`${RAW_BASE}/${dir}/${licenseName}`);
    if (!licRes.ok)
      throw new Error(
        `[promote] license fetch failed for ${family}: ${licRes.status}`,
      );
    const licenseTextBytes = new Uint8Array(await licRes.arrayBuffer());
    for (const face of faces) {
      const bytes = new Uint8Array(
        readFileSync(join(cache, face.repoPath.replaceAll("/", "__"))),
      );
      raw.push({
        family,
        fileName: face.fileName,
        bytes,
        expectedSha256: face.fileSha256, // driver verifies bytes against the discovery hash
        license: face.license,
        licenseTextBytes,
        licenseUrl: LICENSE_URL[face.license] ?? "",
        sourceUrl: `${TREE_BASE}/${dir}`,
      });
    }
  }

  const src: CorpusSource = {
    corpusId: CORPUS_ID,
    source: "Google Fonts (promoted from discovery, reviewed)",
    sourceUrl: TREE_BASE,
    retrievedDate: RETRIEVED_DATE,
    licenseSource: "google/fonts + fetched upstream license text",
    faces: () => raw,
  };
  const manifest = await buildManifest(src);
  writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  const faceCount = manifest.families.reduce((n, f) => n + f.faces.length, 0);
  console.log(
    `[promote] wrote ${CORPUS_ID}: ${manifest.families.length} families, ${faceCount} faces (${ALLOW_LIST.join(", ")}).`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

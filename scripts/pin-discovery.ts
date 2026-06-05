#!/usr/bin/env bun
/**
 * pin-discovery.ts - PIN a discovery snapshot to an exact source commit, proven by re-fetch.
 *
 * The bootstrap snapshot points its rawUrls at the mutable `/main/` branch, so "where did these bytes
 * come from" has no durable answer. This re-fetches EVERY face from the source repo at a specific
 * commit, recomputes sha256, and fails on ANY mismatch. Only if all 3k+ faces match does it rewrite
 * the snapshot: rawUrls -> /<commit>/, set sourceCommit, set acquisition: "git_pinned". After that the
 * snapshot is reproducible from the commit, and `sourceCommit: X` is a verified claim, not a guess.
 *
 * Operator-run (heavy network: one fetch per face). NOT a CI step - CI validates the committed result
 * (sourceCommit present, no /main/ urls) via the discovery tests instead.
 *
 * Run:  bun run scripts/pin-discovery.ts --commit <full-40-char-sha> [--concurrency 25]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "@docfonts/font-metadata";
import type { DiscoverySnapshot } from "@docfonts/registry";

const SNAPSHOT = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "discovery",
  "google-fonts-all-files-2026-06-04.json",
);

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const commit = arg("commit");
  const concurrency = Number(arg("concurrency") ?? "25");
  if (!commit || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(
      "usage: bun run scripts/pin-discovery.ts --commit <full-40-char-sha> [--concurrency N]",
    );
  }
  const snapshot = JSON.parse(
    readFileSync(SNAPSHOT, "utf8"),
  ) as DiscoverySnapshot;
  if (snapshot.faces.some((f) => !f.rawUrl.includes("/main/"))) {
    throw new Error(
      "[pin] some rawUrls are not on /main/ - already pinned or unexpected; aborting",
    );
  }

  const mismatches: string[] = [];
  let done = 0;
  // Verify in bounded-concurrency batches: re-fetch each face at the commit and check its sha256.
  for (let i = 0; i < snapshot.faces.length; i += concurrency) {
    const batch = snapshot.faces.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (face) => {
        const url = face.rawUrl.replace("/main/", `/${commit}/`);
        const res = await fetch(url);
        if (!res.ok) {
          mismatches.push(`${face.repoPath}: HTTP ${res.status}`);
          return;
        }
        const sha = await sha256Hex(new Uint8Array(await res.arrayBuffer()));
        if (sha !== face.fileSha256)
          mismatches.push(
            `${face.repoPath}: sha ${sha.slice(0, 12)} != snapshot ${face.fileSha256.slice(0, 12)}`,
          );
      }),
    );
    done += batch.length;
    if (done % 500 < concurrency)
      console.log(`[pin] verified ${done}/${snapshot.faces.length}...`);
  }

  if (mismatches.length) {
    console.error(
      `[pin] ABORT: ${mismatches.length} face(s) do not match commit ${commit}:\n  - ${mismatches.slice(0, 20).join("\n  - ")}${mismatches.length > 20 ? "\n  ..." : ""}`,
    );
    process.exit(1);
  }

  // All faces verified at the commit: pin the rawUrls + record the proven provenance.
  for (const face of snapshot.faces)
    face.rawUrl = face.rawUrl.replace("/main/", `/${commit}/`);
  snapshot.sourceCommit = commit;
  snapshot.acquisition = "git_pinned";
  writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `[pin] verified all ${snapshot.faces.length} faces at ${commit}; pinned the snapshot (acquisition: git_pinned).`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

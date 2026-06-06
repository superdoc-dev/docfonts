/**
 * Generate `src/data.ts` from `records.json`, the reviewed source of truth.
 *
 * `records.json` is the only file a reviewer edits to add or change a row; `src/data.ts` is a
 * derived, biome-ignored TypeScript module (a typed re-export of the same rows). Run `bun run gen:data`
 * after editing records.json. The drift test (`data-drift.test.ts`) re-renders in memory and fails if
 * the checked-in module is stale, so the two can never silently diverge.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SubstitutionEvidence } from "../src/types.js";

const PKG_DIR = join(import.meta.dir, "..");
export const RECORDS_PATH = join(PKG_DIR, "records.json");
export const DATA_PATH = join(PKG_DIR, "src", "data.ts");

/** Load the reviewed rows from records.json. */
export function loadRecords(): SubstitutionEvidence[] {
  return JSON.parse(
    readFileSync(RECORDS_PATH, "utf8"),
  ) as SubstitutionEvidence[];
}

/** Render the `src/data.ts` module text for a set of reviewed rows. Pure, so the drift test can diff it. */
export function renderDataModule(
  records: readonly SubstitutionEvidence[],
): string {
  const rows = JSON.stringify(records, null, 2);
  return `// Generated from records.json by scripts/generate-data.ts. Do not edit by hand.
import type { SubstitutionEvidence } from "./types.js";

export const SUBSTITUTION_EVIDENCE: readonly SubstitutionEvidence[] = ${rows};
`;
}

if (import.meta.main) {
  writeFileSync(DATA_PATH, renderDataModule(loadRecords()));
  console.log(`Wrote ${DATA_PATH}`);
}

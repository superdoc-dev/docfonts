/**
 * `src/data.ts` is generated from `records.json` by `scripts/generate-data.ts`; records.json is the only
 * file a reviewer hand-edits. This guards the two against drift: a hand-edit to data.ts, or an edit to
 * records.json without re-running `bun run gen:data`, fails here. The generator is pure, so the test
 * re-renders the module in memory and byte-compares it to the checked-in file.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  DATA_PATH,
  loadRecords,
  renderDataModule,
} from "./scripts/generate-data";
import { SUBSTITUTION_EVIDENCE } from "./src/index";

describe("data.ts is generated from records.json", () => {
  test("checked-in src/data.ts matches the generator output (run `bun run gen:data` if this fails)", () => {
    const onDisk = readFileSync(DATA_PATH, "utf8");
    expect(onDisk).toBe(renderDataModule(loadRecords()));
  });

  test("the exported rows deep-equal records.json", () => {
    expect(SUBSTITUTION_EVIDENCE).toEqual(loadRecords());
  });
});

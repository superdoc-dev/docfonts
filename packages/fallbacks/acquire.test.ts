import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCE_RELEASES } from "./scripts/acquire";

const joined = (...parts: string[]) => parts.join("");

describe("source acquisition catalog", () => {
  test("has unique source ids and https release URLs", () => {
    expect(SOURCE_RELEASES.length).toBeGreaterThan(0);
    expect(new Set(SOURCE_RELEASES.map((source) => source.sourceId)).size).toBe(
      SOURCE_RELEASES.length,
    );

    for (const source of SOURCE_RELEASES) {
      expect(source.sourceId).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(source.downloadUrl.startsWith("https://")).toBe(true);
      expect(source.licenseUrl.startsWith("https://")).toBe(true);
      expect(source.expectedFiles.length).toBeGreaterThan(0);
      expect(source.targetFamilies.length).toBeGreaterThan(0);
    }
  });

  test("is source metadata only, not fallback evidence", () => {
    const forbidden = [
      "verdict",
      "policyAction",
      "physicalFamily",
      "measurementRefs",
      "gates",
      "advance",
      "faceVerdicts",
      "glyphExceptions",
    ];
    for (const source of SOURCE_RELEASES)
      for (const field of forbidden)
        expect(field in (source as unknown as Record<string, unknown>)).toBe(
          false,
        );
  });

  test("does not include private paths or measurement environment details", () => {
    const script = readFileSync(
      join(import.meta.dir, "scripts", "acquire.ts"),
      "utf8",
    );
    for (const needle of [
      joined("/", "Users", "/"),
      joined("/", "Applications", "/"),
      joined("Microsoft ", "Word"),
      joined("or", "acle"),
      "macOS",
    ])
      expect(script.includes(needle), `script contains "${needle}"`).toBe(
        false,
      );
  });
});

import { describe, expect, test } from "bun:test";
import {
  ACQUIRE_FONT_EXTENSIONS,
  archiveFormatOf,
  archivePathFor,
  hasFontExtension,
  RAW_SFNT_EXTENSIONS,
} from "./src/archive";

describe("archive helpers", () => {
  test("defaults archive sources to zip and names tar.gz cache files", () => {
    expect(archiveFormatOf({})).toBe("zip");
    expect(archiveFormatOf({ archiveFormat: "tar.gz" })).toBe("tar.gz");
    expect(archivePathFor("/cache", "liberation", "tar.gz")).toBe(
      "/cache/liberation.tar.gz",
    );
    expect(archivePathFor("/cache", "selawik", "zip")).toBe(
      "/cache/selawik.zip",
    );
  });

  test("keeps acquire and compare font extension policies explicit", () => {
    expect(hasFontExtension("Example-Regular.ttf", RAW_SFNT_EXTENSIONS)).toBe(
      true,
    );
    expect(hasFontExtension("Example-Regular.woff2", RAW_SFNT_EXTENSIONS)).toBe(
      false,
    );
    expect(
      hasFontExtension("Example-Regular.woff2", ACQUIRE_FONT_EXTENSIONS),
    ).toBe(true);
    expect(
      hasFontExtension("ExampleCollection.ttc", ACQUIRE_FONT_EXTENSIONS),
    ).toBe(true);
  });
});

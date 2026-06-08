import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectGitHubTreeFonts,
  type GitHubTreeEntry,
  SOURCE_RELEASES,
} from "./acquire";

const joined = (...parts: string[]) => parts.join("");

describe("source acquisition catalog", () => {
  test("has unique source ids and https release URLs", () => {
    expect(SOURCE_RELEASES.length).toBeGreaterThan(0);
    expect(new Set(SOURCE_RELEASES.map((source) => source.sourceId)).size).toBe(
      SOURCE_RELEASES.length,
    );

    const allowedLicenses = new Set([
      "GUST-FL",
      "OFL-1.1",
      "AGPL-3.0-FE",
      "Apache-2.0",
      "UFL-1.0",
      "GPL-2.0-FE",
      "Bitstream-Vera-DejaVu",
    ]);
    for (const source of SOURCE_RELEASES) {
      expect(source.sourceId).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(source.family.length).toBeGreaterThan(0);
      expect(source.project.length).toBeGreaterThan(0);
      expect(source.targetFamilies.length).toBeGreaterThan(0);
      if (source.kind === "github-tree") {
        expect(source.repo).toMatch(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/);
        expect(source.commit).toMatch(/^[a-f0-9]{40}$/);
        for (const license of Object.values(source.licenseDirs))
          expect(allowedLicenses.has(license)).toBe(true);
      } else {
        expect(source.licenseUrl.startsWith("https://")).toBe(true);
        expect(allowedLicenses.has(source.licenseFamily)).toBe(true);
        expect(source.downloadUrl.startsWith("https://")).toBe(true);
        expect(source.expectedFiles.length).toBeGreaterThan(0);
        if (source.archiveFormat !== undefined)
          expect(["zip", "tar.gz"]).toContain(source.archiveFormat);
      }
    }
  });

  test("Google Fonts is a pinned full-tree source, not a family allow-list", () => {
    const google = SOURCE_RELEASES.filter(
      (source) => source.kind === "github-tree",
    );
    expect(google.length).toBe(1);

    const commit = "c89741abbf4eeabce432c3ed2fd7dc28b022701e";
    const source = google[0];
    expect(source.kind).toBe("github-tree");
    if (source.kind !== "github-tree") return;
    expect(source.sourceId).toBe("google-fonts");
    expect(source.project).toBe("Google Fonts");
    expect(source.repo).toBe("google/fonts");
    expect(source.commit).toBe(commit);
    expect(source.licenseDirs).toEqual({
      apache: "Apache-2.0",
      ofl: "OFL-1.1",
      ufl: "UFL-1.0",
    });
  });

  test("Google tree discovery includes licensed fonts under approved license dirs", () => {
    const source = SOURCE_RELEASES.find(
      (candidate) => candidate.sourceId === "google-fonts",
    );
    expect(source?.kind).toBe("github-tree");
    if (source?.kind !== "github-tree") return;

    const entries: GitHubTreeEntry[] = [
      { type: "blob", path: "ofl/viga/OFL.txt" },
      { type: "blob", path: "ofl/viga/Viga-Regular.ttf" },
      { type: "blob", path: "ofl/ruda/OFL.txt" },
      { type: "blob", path: "ofl/ruda/Ruda[wght].ttf" },
      { type: "blob", path: "apache/ultra/LICENSE.txt" },
      { type: "blob", path: "apache/ultra/Ultra-Regular.ttf" },
      { type: "blob", path: "ufl/ubuntu/UFL.txt" },
      { type: "blob", path: "ufl/ubuntu/Ubuntu-Regular.ttf" },
      { type: "blob", path: "axisregistry/unsupported.ttf" },
      { type: "blob", path: "apache/unlicensed/Unlicensed-Regular.ttf" },
    ];

    expect(collectGitHubTreeFonts(source, entries)).toEqual([
      {
        name: "Ultra-Regular.ttf",
        sourcePath: "apache/ultra/Ultra-Regular.ttf",
        licenseFamily: "Apache-2.0",
        licenseSourcePath: "apache/ultra/LICENSE.txt",
      },
      {
        name: "Ruda[wght].ttf",
        sourcePath: "ofl/ruda/Ruda[wght].ttf",
        licenseFamily: "OFL-1.1",
        licenseSourcePath: "ofl/ruda/OFL.txt",
      },
      {
        name: "Viga-Regular.ttf",
        sourcePath: "ofl/viga/Viga-Regular.ttf",
        licenseFamily: "OFL-1.1",
        licenseSourcePath: "ofl/viga/OFL.txt",
      },
      {
        name: "Ubuntu-Regular.ttf",
        sourcePath: "ufl/ubuntu/Ubuntu-Regular.ttf",
        licenseFamily: "UFL-1.0",
        licenseSourcePath: "ufl/ubuntu/UFL.txt",
      },
    ]);
  });

  test("carries the priority Liberation, Selawik, and DejaVu sources", () => {
    const byId = new Map(
      SOURCE_RELEASES.map((source) => [source.sourceId, source]),
    );
    for (const id of [
      "liberation-fonts",
      "liberation-sans-narrow",
      "selawik",
      "dejavu",
    ])
      expect(byId.has(id)).toBe(true);
  });

  test("declares tar.gz sources and defaults the rest to zip", () => {
    const byId = new Map(
      SOURCE_RELEASES.map((source) => [source.sourceId, source]),
    );
    const archiveFormatOf = (id: string) => {
      const source = byId.get(id);
      if (!source || source.kind === "github-tree") return undefined;
      return source.archiveFormat ?? "zip";
    };

    expect(archiveFormatOf("liberation-fonts")).toBe("tar.gz");
    expect(archiveFormatOf("liberation-sans-narrow")).toBe("tar.gz");
    expect(archiveFormatOf("selawik")).toBe("zip");
    expect(archiveFormatOf("dejavu")).toBe("zip");
    // Pre-existing sources never set the field, so they keep extracting as zip.
    expect(archiveFormatOf("urw-base35")).toBe("zip");
    expect(byId.get("urw-base35")).not.toHaveProperty("archiveFormat");
  });

  test("anchors every Selawik 1.01 TTF, WOFF, and WOFF2 member", () => {
    const source = SOURCE_RELEASES.find(
      (candidate) => candidate.sourceId === "selawik",
    );
    expect(source?.kind !== "github-tree").toBe(true);
    if (!source || source.kind === "github-tree") return;

    // Selawik 1.01 ships five weights, each as .ttf, .woff, and .woff2.
    const weights = ["selawk", "selawkb", "selawkl", "selawksb", "selawksl"];
    const expected = weights.flatMap((stem) => [
      `${stem}.ttf`,
      `${stem}.woff`,
      `${stem}.woff2`,
    ]);
    expect([...source.expectedFiles].sort()).toEqual([...expected].sort());
  });

  test("uses the GPL font exception and DejaVu license families", () => {
    const byId = new Map(
      SOURCE_RELEASES.map((source) => [source.sourceId, source]),
    );
    const narrow = byId.get("liberation-sans-narrow");
    const dejavu = byId.get("dejavu");
    expect(narrow?.kind !== "github-tree" && narrow?.licenseFamily).toBe(
      "GPL-2.0-FE",
    );
    expect(dejavu?.kind !== "github-tree" && dejavu?.licenseFamily).toBe(
      "Bitstream-Vera-DejaVu",
    );
  });

  test("spans more than one project and license family", () => {
    expect(
      new Set(SOURCE_RELEASES.map((source) => source.project)).size,
    ).toBeGreaterThan(1);
    const licenseFamilies = new Set<string>();
    for (const source of SOURCE_RELEASES) {
      if (source.kind === "github-tree") {
        for (const license of Object.values(source.licenseDirs))
          licenseFamilies.add(license);
      } else {
        licenseFamilies.add(source.licenseFamily);
      }
    }
    expect(licenseFamilies.size).toBeGreaterThan(1);
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
    const script = readFileSync(join(import.meta.dir, "acquire.ts"), "utf8");
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

/**
 * Publish-safety: prove the npm tarball ships ONLY the built runtime artifact and nothing private.
 * This package is meant to be published, so the tarball must never carry source, the generator script,
 * tests, or - most importantly - any of the docfonts research data (discovery / bakeoffs / measurements
 * / corpus) or local paths / oracle-environment labels. We build, then `bun pm pack --dry-run`, and
 * assert the file list and the shipped bytes.
 */
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PKG_DIR = import.meta.dir;

/** Build dist, then list what `bun pm pack` would ship. */
function packedFiles(): string[] {
  execSync("bun run build", { cwd: PKG_DIR, stdio: "pipe" });
  const out = execSync("bun pm pack --dry-run", {
    cwd: PKG_DIR,
    encoding: "utf8",
    stdio: "pipe",
  });
  // Lines look like: "packed 1.2KB dist/index.js". Pull the path token off each.
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("packed "))
    .map((l) => l.split(/\s+/).slice(2).join(" "))
    .filter(Boolean);
}

describe("publish tarball hygiene", () => {
  const files = packedFiles();

  test("ships only package.json, README, and built dist/ files", () => {
    expect(files.length).toBeGreaterThan(0);
    const ALLOWED_TOP = new Set(["package.json", "README.md", "LICENSE"]);
    for (const f of files) {
      const ok = ALLOWED_TOP.has(f) || f.startsWith("dist/");
      expect(ok, `unexpected packed file: ${f}`).toBe(true);
    }
    // and it really did ship the built entry + its types.
    expect(files).toContain("dist/index.js");
    expect(files).toContain("dist/index.d.ts");
  });

  test("ships no source, generator, tests, or research data", () => {
    const FORBIDDEN = [
      /^src\//,
      /scripts\//,
      /\.test\./,
      /data\/discovery/,
      /data\/bakeoffs/,
      /data\/measurements/,
      /data\/corpus/,
      /records\.json/,
      /tsconfig/,
    ];
    for (const f of files)
      for (const pat of FORBIDDEN)
        expect(pat.test(f), `forbidden file packed: ${f}`).toBe(false);
  });

  test("the shipped bytes carry no local path or oracle-environment leak", () => {
    const distDir = join(PKG_DIR, "dist");
    expect(existsSync(distDir)).toBe(true);
    const bytes = readdirSync(distDir)
      .map((f) => readFileSync(join(distDir, f), "utf8"))
      .join("\n");
    for (const needle of [
      "/Users/",
      "/Applications/",
      "/System/",
      "DFonts",
      "Microsoft Word",
      "macOS",
      "originalOracleEnv",
      "candidateLicenseSource",
    ]) {
      expect(bytes.includes(needle), `shipped bytes contain "${needle}"`).toBe(
        false,
      );
    }
  });
});

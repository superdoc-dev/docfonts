/**
 * Regression guard for the v0.1 bug where the published ESM had extensionless relative imports
 * (`from "./data"`), which works in bundlers but throws ERR_MODULE_NOT_FOUND in plain Node ESM. The
 * build emits NodeNext `.js` specifiers; these tests prove the SHIPPED artifact loads in real Node.
 *
 * The package is ESM-only (package.json `"type": "module"`, no `require` export). CommonJS `require()`
 * is intentionally unsupported - consumers import it, or their bundler does.
 */
import { describe, expect, test } from "bun:test";
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PKG_DIR = import.meta.dir;
const DIST = join(PKG_DIR, "dist");

describe("Node ESM loadability", () => {
  // Build once for this file.
  execSync("bun run build", { cwd: PKG_DIR, stdio: "pipe" });

  test("emitted relative imports carry explicit .js extensions (NodeNext)", () => {
    for (const file of ["index.js", "fallbacks.js", "data.js"]) {
      const code = readFileSync(join(DIST, file), "utf8");
      // any `from "./x"` or `from "../x"` must end in .js - no extensionless relative specifiers.
      const bad = [...code.matchAll(/from\s+"(\.[^"]*)"/g)].filter(
        (m) => !m[1].endsWith(".js"),
      );
      expect(
        bad.map((m) => m[1]),
        `extensionless imports in ${file}`,
      ).toEqual([]);
    }
  });

  test("the built artifact imports + runs under plain Node ESM", () => {
    const url = pathToFileURL(join(DIST, "index.js")).href;
    const script = `
      const m = await import(${JSON.stringify(url)});
      const d = m.getFallbackDecision("Helvetica", { canRenderFamily: () => true });
      process.stdout.write(JSON.stringify({ kind: d.kind, fam: d.fallback?.substituteFamily, has: typeof m.getFallbackDecision }));
    `;
    const out = execFileSync("node", ["--input-type=module", "-e", script], {
      encoding: "utf8",
    });
    expect(JSON.parse(out)).toEqual({
      kind: "fallback",
      fam: "Liberation Sans",
      has: "function",
    });
  });
});

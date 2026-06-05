/**
 * Public-repo hygiene gate. This project ships to public GitHub, so the vendored research snapshots
 * and committed registry must not leak internal-only references. For this public evidence repo, even
 * internal ticket IDs stay out. This test catches the unambiguous leaks; customer names and free-form
 * internal prose still need human review.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SOURCES = import.meta.dir;
const MEAS = join(ROOT, "packages", "registry", "data", "measurements");
const RECORDS = join(
  ROOT,
  "packages",
  "registry",
  "data",
  "registry",
  "records.json",
);

const DISALLOWED: { name: string; re: RegExp }[] = [
  { name: "Slack link", re: /slack\.com|slack:\/\//i },
  { name: "URL in public evidence", re: /https?:\/\//i },
  { name: "cross-repo PR reference", re: /\bPR #\d+/ },
  { name: "internal ticket ID", re: /\b(SD|IT)-\d+/ },
  { name: "internal test-tier jargon (T4)", re: /\bT4\b/ },
  { name: "internal artifact filename", re: /family-status|\.internal\b/i },
];

function violations(label: string, text: string): string[] {
  return DISALLOWED.filter(({ re }) => re.test(text)).map(
    ({ name, re }) => `${label}: ${name} -> "${text.match(re)?.[0]}"`,
  );
}

describe("public-repo hygiene (no internal markers in sources or committed registry)", () => {
  it("vendored research CSV sources are clean", () => {
    const v: string[] = [];
    for (const f of readdirSync(SOURCES).filter((f) => f.endsWith(".csv")))
      v.push(
        ...violations(
          `research-sources/${f}`,
          readFileSync(join(SOURCES, f), "utf8"),
        ),
      );
    expect(v).toEqual([]);
  });

  it("committed registry record notes are clean", () => {
    const v: string[] = [];
    for (const r of JSON.parse(readFileSync(RECORDS, "utf8")) as {
      evidenceId: string;
      notes?: string;
    }[])
      if (r.notes) v.push(...violations(`record ${r.evidenceId}`, r.notes));
    expect(v).toEqual([]);
  });

  it("measurement notes and oracle envs are clean", () => {
    const v: string[] = [];
    for (const f of readdirSync(MEAS).filter((f) => f.endsWith(".json"))) {
      const arr = JSON.parse(readFileSync(join(MEAS, f), "utf8")) as {
        notes?: string;
        originalOracleEnv?: string;
      }[];
      for (const m of arr) {
        if (m.notes) v.push(...violations(`${f} note`, m.notes));
        if (m.originalOracleEnv)
          v.push(...violations(`${f} oracleEnv`, m.originalOracleEnv));
      }
    }
    expect(v).toEqual([]);
  });
});

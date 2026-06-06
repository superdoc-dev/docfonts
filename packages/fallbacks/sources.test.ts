/**
 * Guards for the source backlog. It records open-font candidates, not fallback recommendations.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  LICENSE_FAMILIES,
  loadSources,
  SOURCES_PATH,
  type SourceCandidate,
} from "./sources";

const joined = (...parts: string[]) => parts.join("");

const ALLOWED_KEYS = new Set<keyof SourceCandidate>([
  "sourceId",
  "family",
  "project",
  "licenseFamily",
  "upstream",
  "retrieval",
  "targetFamilies",
  "status",
]);

// Fields that mark a row as a measured verdict. The backlog must never carry them: a font earns these
// only after a bakeoff, by moving to records.json.
const VERDICT_FIELDS = [
  "verdict",
  "faceVerdicts",
  "physicalFamily",
  "policyAction",
  "measurementRefs",
  "gates",
  "advance",
  "exportRule",
  "candidateLicense",
  "faces",
  "evidenceId",
  "logicalFamily",
  "lineBreakSafe",
];

const STATUSES = new Set(["backlog", "evaluating"]);
const sources = loadSources();

describe("source backlog schema", () => {
  test("the backlog is a non-empty array", () => {
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
  });

  test("every entry has exactly the public-safe fields, well-formed", () => {
    for (const s of sources) {
      const keys = Object.keys(s);
      for (const k of keys)
        expect(
          ALLOWED_KEYS.has(k as keyof SourceCandidate),
          `${s.sourceId}: unexpected field "${k}"`,
        ).toBe(true);
      for (const k of ALLOWED_KEYS)
        expect(keys.includes(k), `${s.sourceId}: missing field "${k}"`).toBe(
          true,
        );

      expect(
        /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.sourceId),
        `bad sourceId: ${s.sourceId}`,
      ).toBe(true);
      expect(s.family.length, `${s.sourceId}: empty family`).toBeGreaterThan(0);
      expect(s.project.length, `${s.sourceId}: empty project`).toBeGreaterThan(
        0,
      );
      expect(
        s.retrieval.length,
        `${s.sourceId}: empty retrieval`,
      ).toBeGreaterThan(0);
      expect(
        LICENSE_FAMILIES.includes(s.licenseFamily),
        `${s.sourceId}: license ${s.licenseFamily}`,
      ).toBe(true);
      expect(
        s.upstream.startsWith("https://"),
        `${s.sourceId}: upstream not https`,
      ).toBe(true);
      expect(STATUSES.has(s.status), `${s.sourceId}: status ${s.status}`).toBe(
        true,
      );

      expect(
        Array.isArray(s.targetFamilies),
        `${s.sourceId}: targetFamilies`,
      ).toBe(true);
      expect(
        s.targetFamilies.length,
        `${s.sourceId}: no targetFamilies`,
      ).toBeGreaterThan(0);
      for (const c of s.targetFamilies)
        expect(
          typeof c === "string" && c.length > 0,
          `${s.sourceId}: bad cluster`,
        ).toBe(true);
    }
  });

  test("sourceIds are unique", () => {
    const ids = sources.map((s) => s.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("source backlog non-promotion", () => {
  test("no entry carries a verdict-shaped field (a backlog is not a recommendation)", () => {
    for (const s of sources)
      for (const field of VERDICT_FIELDS)
        expect(
          field in (s as unknown as Record<string, unknown>),
          `${s.sourceId}: backlog entry must not carry verdict field "${field}"`,
        ).toBe(false);
  });

  test("every entry is in a pre-verdict status", () => {
    for (const s of sources) expect(STATUSES.has(s.status)).toBe(true);
  });
});

describe("source backlog hygiene", () => {
  const raw = readFileSync(SOURCES_PATH, "utf8");

  test("the backlog text carries no private paths, binaries, or measurement internals", () => {
    const FORBIDDEN = [
      joined("/", "Users", "/"),
      joined("/", "Applications", "/"),
      joined("/", "System", "/"),
      joined("C", ":", "\\"),
      joined("D", ":", "\\"),
      joined("D", "Fonts"),
      joined("Microsoft ", "Word"),
      "macOS",
      joined("or", "acle"),
      ".ttf",
      ".otf",
      ".woff",
      ".pfb",
      ".pfa",
    ];
    for (const needle of FORBIDDEN)
      expect(raw.includes(needle), `backlog text contains "${needle}"`).toBe(
        false,
      );
  });
});

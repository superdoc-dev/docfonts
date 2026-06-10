import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type BakeoffRow,
  formatVisualDiff,
  parseArgs,
  parseCompareMetric,
  renderBakeoff,
} from "./bakeoff";
import { featureDistance } from "./src/features";
import { scoreAdvances } from "./src/score";

const BAKEOFF_CLI = join(import.meta.dir, "bakeoff.ts");

/** Build a row from real scoring helpers so the table reflects genuine non-visual output. */
function rowFor(
  label: string,
  referenceAdvance: number,
  candidateAdvance: number,
  extra: Partial<BakeoffRow> = {},
): BakeoffRow {
  const sample = [0x41, 0x42, 0x43];
  const reference = new Map(
    sample.map((cp) => [cp, referenceAdvance] as const),
  );
  const candidate = new Map(
    sample.map((cp) => [cp, candidateAdvance] as const),
  );
  return {
    label,
    score: scoreAdvances(reference, candidate, sample),
    feature: featureDistance(
      { weightClass: 400, widthClass: 5 },
      { weightClass: 400, widthClass: 5 },
    ),
    ...extra,
  };
}

// --- Argument parsing -------------------------------------------------------

describe("parseArgs", () => {
  test("collects repeated labeled candidates in order", () => {
    const args = parseArgs([
      "--reference",
      "ref.ttf",
      "--candidate",
      "Inter=/fonts/inter.ttf",
      "--candidate",
      "Roboto=/fonts/roboto.ttf",
    ]);
    expect(args.reference).toBe("ref.ttf");
    expect(args.candidates).toEqual([
      { label: "Inter", path: "/fonts/inter.ttf" },
      { label: "Roboto", path: "/fonts/roboto.ttf" },
    ]);
  });

  test("defaults to the latin model, no ranks, no visual", () => {
    const args = parseArgs(["--reference", "ref.ttf"]);
    expect(args.model).toBe("latin");
    expect(args.visual).toBe(false);
    expect(args.ranks.size).toBe(0);
    expect(args.candidates).toEqual([]);
  });

  test("accepts supported models and the --visual flag", () => {
    const args = parseArgs(["--model", "monospace", "--visual"]);
    expect(args.model).toBe("monospace");
    expect(args.visual).toBe(true);
    expect(parseArgs(["--model", "cjk-jp"]).model).toBe("cjk-jp");
  });

  test("parses ranks keyed by label and keeps the note verbatim", () => {
    const args = parseArgs([
      "--candidate",
      "A=/a.ttf",
      "--rank",
      "A=good|review",
    ]);
    expect(args.ranks.get("A")).toBe("good|review");
  });

  test("splits a labeled value at the first '=' only", () => {
    const args = parseArgs(["--candidate", "A=/path/with=equals.ttf"]);
    expect(args.candidates[0]).toEqual({
      label: "A",
      path: "/path/with=equals.ttf",
    });
  });

  test("rejects a candidate without a Label=value shape", () => {
    expect(() => parseArgs(["--candidate", "/no/label.ttf"])).toThrow(
      /Label=value/,
    );
    expect(() => parseArgs(["--candidate", "OnlyLabel="])).toThrow(
      /Label=value/,
    );
  });

  test("rejects duplicate candidate labels", () => {
    expect(() =>
      parseArgs(["--candidate", "A=/a.ttf", "--candidate", "A=/b.ttf"]),
    ).toThrow(/duplicate candidate label/);
  });

  test("rejects an unknown model and a missing value", () => {
    expect(() => parseArgs(["--model", "serif"])).toThrow(/--model requires/);
    expect(() => parseArgs(["--reference"])).toThrow(/requires a value/);
  });

  test("rejects unknown arguments", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/unknown argument/);
  });
});

// --- Non-visual table output ------------------------------------------------

describe("renderBakeoff", () => {
  test("prints the metric columns and preserves candidate order", () => {
    const report = renderBakeoff(
      [rowFor("Match", 0.5, 0.5), rowFor("Off", 0.5, 0.9)],
      { visual: false },
    );
    const lines = report.split("\n");
    expect(lines[0]).toContain("candidate");
    expect(lines[0]).toContain("tier");
    expect(lines[0]).toContain("mean");
    expect(lines[0]).toContain("fscore");
    expect(lines[0]).toContain("fcov");
    expect(lines[0]).toContain("flags");
    // Input order is preserved; the bake-off does not re-rank the chosen set.
    expect(lines[1]).toContain("Match");
    expect(lines[1]).toContain("metric_safe");
    expect(lines[2]).toContain("Off");
    expect(lines[2]).toContain("visual_only");
  });

  test("omits the vdiff column unless the visual probe ran", () => {
    const rows = [rowFor("Match", 0.5, 0.5)];
    expect(renderBakeoff(rows, { visual: false })).not.toContain("vdiff");
    const withVisual = renderBakeoff(
      [rowFor("Match", 0.5, 0.5, { visual: 0 })],
      {
        visual: true,
      },
    );
    expect(withVisual.split("\n")[0]).toContain("vdiff");
    expect(withVisual.split("\n")[1]).toContain("0.0000");
  });

  test("shows the rank column only when a note is present", () => {
    expect(
      renderBakeoff([rowFor("A", 0.5, 0.5)], { visual: false }),
    ).not.toContain("rank");
    const ranked = renderBakeoff(
      [rowFor("A", 0.5, 0.5, { rank: "good" }), rowFor("B", 0.5, 0.5)],
      { visual: false },
    );
    expect(ranked.split("\n")[0]).toContain("rank");
    expect(ranked.split("\n")[1]).toContain("good");
    // A candidate without a note fills the column with a placeholder.
    expect(ranked.split("\n")[2]).toMatch(/\bB\b.*-\s*$/);
  });
});

// --- Visual probe pure helpers ----------------------------------------------

describe("parseCompareMetric", () => {
  test("reads the normalized value from parentheses", () => {
    expect(parseCompareMetric("1234.5 (0.0188324)")).toBeCloseTo(0.0188324, 10);
    expect(parseCompareMetric("0 (0)")).toBe(0);
  });

  test("falls back to a bare leading number", () => {
    expect(parseCompareMetric("0.5")).toBe(0.5);
  });

  test("throws when no metric is present", () => {
    expect(() => parseCompareMetric("magick: not found")).toThrow(
      /could not read a metric/,
    );
  });
});

describe("formatVisualDiff", () => {
  test("formats a value and degrades to n/a", () => {
    expect(formatVisualDiff(0.1234)).toBe("0.1234");
    expect(formatVisualDiff(undefined)).toBe("n/a");
    expect(formatVisualDiff(Number.NaN)).toBe("n/a");
  });
});

// --- CLI validation ---------------------------------------------------------

describe("bakeoff CLI", () => {
  /** Run the CLI and return its exit code and combined stderr. */
  function run(argv: string[]): { status: number; stderr: string } {
    try {
      execFileSync("bun", ["run", BAKEOFF_CLI, ...argv], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, stderr: "" };
    } catch (err) {
      const e = err as { status?: number; stderr?: Buffer | string };
      return {
        status: e.status ?? 1,
        stderr: (e.stderr ?? "").toString(),
      };
    }
  }

  test("fails when no reference is given", () => {
    const result = run(["--candidate", "A=/a.ttf"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("missing --reference");
  });

  test("fails when no candidate is given", () => {
    const dir = mkdtempSync(join(tmpdir(), "docfonts-bakeoff-"));
    try {
      const ref = join(dir, "ref.ttf");
      writeFileSync(ref, new Uint8Array([0, 1, 0, 0]));
      const result = run(["--reference", ref]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("missing --candidate");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails when a candidate path does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "docfonts-bakeoff-"));
    try {
      const ref = join(dir, "ref.ttf");
      writeFileSync(ref, new Uint8Array([0, 1, 0, 0]));
      const result = run([
        "--reference",
        ref,
        "--candidate",
        "A=/does/not/exist.ttf",
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("candidate font not found");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

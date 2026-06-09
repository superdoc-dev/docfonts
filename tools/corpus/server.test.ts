import { describe, expect, test } from "bun:test";
import {
  completeSyntheticFaces,
  type FontFamily,
  parseArgs,
  resolveLocalFont,
  runDirFor,
  summarizeCandidate,
} from "./server";
import { featureDistance } from "./src/features";
import { scoreAdvances } from "./src/score";

describe("parseArgs", () => {
  test("defaults to the local app port", () => {
    expect(parseArgs([])).toEqual({ port: 5177 });
  });

  test("accepts --port", () => {
    expect(parseArgs(["--port", "5180"])).toEqual({ port: 5180 });
  });

  test("rejects invalid input", () => {
    expect(() => parseArgs(["--port", "0"])).toThrow(
      "--port requires a positive integer",
    );
    expect(() => parseArgs(["--bogus"])).toThrow("unknown argument: --bogus");
  });
});

describe("resolveLocalFont", () => {
  test("rejects paths outside known font directories", () => {
    expect(() => resolveLocalFont("/etc/hosts")).toThrow(
      "reference path is outside the known font directories",
    );
  });
});

describe("completeSyntheticFaces", () => {
  test("fills missing styles from a regular face", () => {
    const family: FontFamily = {
      family: "Demo",
      faces: {
        regular: {
          name: "Demo.ttf",
          path: "/fonts/Demo.ttf",
          style: "normal",
          weight: "400",
        },
      },
    };

    completeSyntheticFaces(family);

    expect(family.faces.bold).toMatchObject({
      path: "/fonts/Demo.ttf",
      synthetic: true,
      weight: "700",
      style: "normal",
    });
    expect(family.faces.italic).toMatchObject({
      path: "/fonts/Demo.ttf",
      synthetic: true,
      weight: "400",
      style: "italic",
    });
    expect(family.faces.boldItalic).toMatchObject({
      path: "/fonts/Demo.ttf",
      synthetic: true,
      weight: "700",
      style: "italic",
    });
  });

  test("keeps a real bold face and derives bold italic from it", () => {
    const family: FontFamily = {
      family: "Demo",
      faces: {
        regular: {
          name: "Demo.ttf",
          path: "/fonts/Demo.ttf",
          style: "normal",
          weight: "400",
        },
        bold: {
          name: "Demo Bold.ttf",
          path: "/fonts/Demo Bold.ttf",
          style: "normal",
          weight: "700",
        },
      },
    };

    completeSyntheticFaces(family);

    expect(family.faces.bold?.name).toBe("Demo Bold.ttf");
    expect(family.faces.bold?.synthetic).toBeUndefined();
    expect(family.faces.boldItalic).toMatchObject({
      path: "/fonts/Demo Bold.ttf",
      synthetic: true,
      weight: "700",
      style: "italic",
    });
  });
});

describe("runDirFor", () => {
  test("accepts a server-minted run id", () => {
    expect(() => runDirFor("mq6no3ov-4srqme")).not.toThrow();
  });

  test("rejects ids that could escape the cache dir", () => {
    for (const bad of ["../etc", "a/b", "..", "abc", "A-B", "a-b-c", "a_b", ""])
      expect(() => runDirFor(bad)).toThrow("invalid run id");
  });
});

describe("summarizeCandidate", () => {
  test("serializes scores and feature flags for the app", () => {
    const sample = [0x41, 0x42, 0x43];
    const reference = new Map(sample.map((cp) => [cp, 0.5] as const));
    const candidate = new Map(sample.map((cp) => [cp, 0.5] as const));
    const summary = summarizeCandidate(
      {
        sourceId: "test-source",
        file: "Candidate.ttf",
        bytes: new Uint8Array(),
        score: scoreAdvances(reference, candidate, sample),
        feature: featureDistance(
          { weightClass: 400, widthClass: 5 },
          { weightClass: 700, widthClass: 5 },
        ),
      },
      2,
      "/runs/r/candidate.ttf",
    );

    expect(summary.index).toBe(2);
    expect(summary.sourceId).toBe("test-source");
    expect(summary.file).toBe("Candidate.ttf");
    expect(summary.url).toBe("/runs/r/candidate.ttf");
    expect(summary.tier).toBe("metric_safe");
    expect(summary.coverage).toBe("3/3");
    expect(summary.flags).toEqual(["weight_gap"]);
  });
});

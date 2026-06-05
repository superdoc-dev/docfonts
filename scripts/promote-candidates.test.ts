/**
 * Promotion guard tests. The allow-list promotes EXACT faces only; this proves the guards that keep a
 * future "add a family" edit safe: a variable font is rejected (it needs an instancing plan, not direct
 * promotion), and a missing/ambiguous face throws rather than silently promoting the wrong bytes.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiscoverySnapshot } from "@docfonts/registry";
import { selectPromotionFaces } from "./promote-candidates";

const snapshot = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "..",
      "packages",
      "registry",
      "data",
      "discovery",
      "google-fonts-all-files-2026-06-04.json",
    ),
    "utf8",
  ),
) as DiscoverySnapshot;

describe("selectPromotionFaces (promotion guard)", () => {
  it("resolves the exact listed static face (Viga regular)", () => {
    const faces = selectPromotionFaces(snapshot, {
      family: "Viga",
      faces: ["regular"],
    });
    expect(faces).toHaveLength(1);
    expect(faces[0].family).toBe("Viga");
    expect(faces[0].styleKey).toBe("regular");
    expect(faces[0].isVariable).toBe(false);
  });

  it("REJECTS a variable font (needs an instancing plan, not direct promotion)", () => {
    // Roboto Regular is a variable font in the snapshot.
    expect(() =>
      selectPromotionFaces(snapshot, { family: "Roboto", faces: ["regular"] }),
    ).toThrow(/VARIABLE/);
  });

  it("throws on a face the family does not have (no silent skip)", () => {
    expect(() =>
      selectPromotionFaces(snapshot, { family: "Viga", faces: ["bold"] }),
    ).toThrow(/no bold face/);
  });

  it("throws on an unknown family", () => {
    expect(() =>
      selectPromotionFaces(snapshot, {
        family: "NotARealFamily",
        faces: ["regular"],
      }),
    ).toThrow();
  });
});

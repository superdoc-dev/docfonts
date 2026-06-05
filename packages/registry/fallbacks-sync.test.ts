/**
 * Producer-side drift guard: the data shipped by @docfonts/fallbacks (its generated SUBSTITUTION_EVIDENCE)
 * MUST equal this registry's exported substitution-evidence artifact. The fallbacks package is the
 * runtime copy a renderer imports; the registry is the source of truth. If they diverge - someone edits
 * the registry export and forgets to regenerate the package - this fails, so the published package can
 * never silently fall behind the reviewed registry. (Imported by relative path, not the published entry,
 * so no build is required to run this in-repo.)
 */
import { describe, expect, test } from "bun:test";
import { SUBSTITUTION_EVIDENCE as FALLBACKS_DATA } from "../fallbacks/src/data";
import { loadSubstitutionEvidence } from "./src/index";

describe("@docfonts/fallbacks data stays in sync with the registry export", () => {
  test("the shipped fallbacks data equals the registry substitution-evidence artifact", () => {
    expect(FALLBACKS_DATA).toEqual(loadSubstitutionEvidence());
  });

  test("the fallbacks copy covers every registry row, by evidenceId, in order", () => {
    expect(FALLBACKS_DATA.map((r) => r.evidenceId)).toEqual(
      loadSubstitutionEvidence().map((r) => r.evidenceId),
    );
  });
});

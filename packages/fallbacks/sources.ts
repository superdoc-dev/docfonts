/**
 * Public source backlog for open-font candidates awaiting measurement.
 * These rows are not fallback decisions and are not published in @docfonts/fallbacks.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SOURCES_PATH = join(import.meta.dir, "sources.json");

/**
 * Pre-verdict lifecycle of a candidate source. Both values are explicitly NOT a recommendation:
 * `backlog` is recorded but untouched; `evaluating` is mid-bakeoff. A promoted candidate leaves this
 * file entirely and becomes a measured row in `records.json`.
 */
export type SourceStatus = "backlog" | "evaluating";

/** License families we accept for an open-font candidate. SPDX ids, plus the GUST Font License (GFL). */
export const LICENSE_FAMILIES = [
  "OFL-1.1",
  "Apache-2.0",
  "GUST-FL",
  "AGPL-3.0",
] as const;
export type LicenseFamily = (typeof LICENSE_FAMILIES)[number];

/**
 * One open-font family recorded as a substitute candidate awaiting measurement.
 */
export interface SourceCandidate {
  /** stable backlog id, e.g. "tex-gyre-bonum". */
  sourceId: string;
  /** the open-font family name as released, e.g. "TeX Gyre Bonum". */
  family: string;
  /** the upstream project the family belongs to, e.g. "TeX Gyre". */
  project: string;
  /** license family of the candidate (see {@link LICENSE_FAMILIES}). */
  licenseFamily: LicenseFamily;
  /** public upstream URL the font is retrieved from (https). */
  upstream: string;
  /** public-safe note on how to obtain the font. No local paths, no binaries. */
  retrieval: string;
  /** document font families this candidate might be measured against. Targets, not verdicts. */
  targetFamilies: string[];
  /** pre-verdict lifecycle state; never a recommendation. */
  status: SourceStatus;
}

/** Load the reviewed source backlog from sources.json. */
export function loadSources(): SourceCandidate[] {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as SourceCandidate[];
}

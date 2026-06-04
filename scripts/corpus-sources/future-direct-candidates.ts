/**
 * Source adapter: the future-direct-candidate fonts in a SuperDoc legal-review packet - open
 * candidates not yet in the shipped set. The packet path is a PARAMETER.
 *
 * Packet layout it expects:
 *   manifests/future-direct-candidate-files.csv  (candidate_family, status, license_or_notice,
 *                                                  relative_path, sha256, ...)
 *   future-direct-candidates/<family>/*.ttf       (the open TTFs the CSV points at)
 *   future-direct-candidates/<family>/<license>    (the accompanying license file)
 *
 * `families` allow-lists which candidate families to ingest. This is deliberate: some candidates are
 * VARIABLE fonts (e.g. Gelasio ships Gelasio[wght].ttf), whose non-default weights are axis instances,
 * not separate faces - the SFNT parser reads only the default instance, so ingesting them as-is would
 * understate face coverage. Only static, four-face families belong here until variable instancing
 * exists. Liberation Sans Narrow (four static TTFs) qualifies; Gelasio does not yet.
 */
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseCsv } from "./csv";
import type { CorpusSource, RawCorpusFace } from "./types";

/** per-family license id, license-text file (relative to the family dir), and license URL. */
const FAMILY_LICENSE: Record<
  string,
  {
    license: string;
    licenseFile: string;
    licenseUrl: string;
    sourceUrl: string;
  }
> = {
  "Liberation Sans Narrow": {
    license: "GPLv2-with-font-exception",
    licenseFile: "License.txt",
    licenseUrl:
      "https://github.com/liberationfonts/liberation-fonts/blob/main/LICENSE",
    sourceUrl: "https://github.com/liberationfonts/liberation-fonts",
  },
};

const familyDir = (relativePath: string) =>
  relativePath.split("/").slice(0, -1).join("/");

/**
 * Build a CorpusSource over the future-direct-candidates of a packet at `packetPath`, restricted to
 * `families`. Only families in FAMILY_LICENSE (static, four-face) can be ingested.
 */
export function futureDirectCandidatesSource(
  packetPath: string,
  families: string[],
  dateStamp = "2026-06-03",
): CorpusSource {
  const csvPath = join(
    packetPath,
    "manifests",
    "future-direct-candidate-files.csv",
  );
  const allow = new Set(families);

  return {
    corpusId: `future-direct-candidates-${dateStamp}`,
    source:
      "SuperDoc future-direct candidates (legal-review packet, open fonts only)",
    sourceUrl: "multiple public upstreams; see families[].sourceUrl",
    retrievedDate: dateStamp,
    licenseSource: `SuperDoc legal-review packet ${dateStamp} (future-direct-candidates)`,
    *faces(): Iterable<RawCorpusFace> {
      for (const r of parseCsv(readFileSync(csvPath, "utf8"))) {
        if (!r.relative_path.endsWith(".ttf")) continue; // skip license/metadata rows
        if (!allow.has(r.candidate_family)) continue;
        const lic = FAMILY_LICENSE[r.candidate_family];
        if (!lic)
          throw new Error(
            `no license mapping for future candidate family: ${r.candidate_family}`,
          );
        yield {
          family: r.candidate_family,
          fileName: basename(r.relative_path),
          bytes: new Uint8Array(
            readFileSync(join(packetPath, r.relative_path)),
          ),
          expectedSha256: r.sha256 || undefined,
          license: lic.license,
          licenseTextBytes: new Uint8Array(
            readFileSync(
              join(packetPath, familyDir(r.relative_path), lic.licenseFile),
            ),
          ),
          licenseUrl: lic.licenseUrl,
          sourceUrl: lic.sourceUrl,
        };
      }
    },
  };
}

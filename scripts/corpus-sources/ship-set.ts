/**
 * Source adapter: a SuperDoc ship-set legal-review packet (the first corpus source). The packet path
 * is a PARAMETER, never baked into committed data; the adapter only describes the source publicly.
 *
 * Packet layout it expects:
 *   manifests/current-ship-set-files.csv   (family, source_ttf, source_ttf_sha256, license, font_license_url, ...)
 *   current-ship-set/source-ttf/*.ttf      (the open TTFs the CSV points at)
 *   current-ship-set/licenses/{OFL.txt,Apache-2.0.txt}
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CorpusSource, RawCorpusFace } from "./types";

/** license id -> license text file inside the packet. */
const LICENSE_FILE: Record<string, string> = {
  "OFL-1.1": "OFL.txt",
  "Apache-2.0": "Apache-2.0.txt",
};

/** Minimal RFC-4180 CSV parser (quoted fields with commas, newlines, and "" escapes). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      }
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) return [];
  return rows.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])),
  );
}

/**
 * Build a CorpusSource over a ship-set packet at `packetPath`. `corpusId`/`retrievedDate` are taken
 * from the packet's date so the adapter stays reusable across dated ship-sets.
 */
export function shipSetSource(
  packetPath: string,
  dateStamp = "2026-06-03",
): CorpusSource {
  const csvPath = join(packetPath, "manifests", "current-ship-set-files.csv");
  const licenseDir = join(packetPath, "current-ship-set", "licenses");
  const licenseCache = new Map<string, Uint8Array>();
  const readLicense = (id: string): Uint8Array => {
    const file = LICENSE_FILE[id];
    if (!file)
      throw new Error(`ship-set: no license text file mapped for "${id}"`);
    let bytes = licenseCache.get(id);
    if (!bytes) {
      bytes = new Uint8Array(readFileSync(join(licenseDir, file)));
      licenseCache.set(id, bytes);
    }
    return bytes;
  };

  return {
    corpusId: `current-ship-set-${dateStamp}`,
    source:
      "SuperDoc current ship-set (LibreOffice app font resources + upstream, open fonts only)",
    sourceUrl:
      "https://www.libreoffice.org/ (app font resources); per-family license URL on each family",
    retrievedDate: dateStamp,
    licenseSource: `SuperDoc ship-set legal-review packet ${dateStamp}`,
    *faces(): Iterable<RawCorpusFace> {
      for (const r of parseCsv(readFileSync(csvPath, "utf8"))) {
        if (!r.source_ttf) continue;
        yield {
          family: r.family,
          fileName: r.source_ttf.split("/").pop() ?? r.source_ttf,
          bytes: new Uint8Array(readFileSync(join(packetPath, r.source_ttf))),
          expectedSha256: r.source_ttf_sha256 || undefined,
          license: r.license,
          licenseTextBytes: readLicense(r.license),
          licenseUrl: r.font_license_url || "",
          // The CSV records these as "LibreOffice app font resource" but carries no precise per-family
          // upstream URL, so the font source is recorded at the granularity actually known - not a
          // guessed repo path. A future adapter with real per-family upstreams can set this precisely.
          sourceUrl:
            "LibreOffice app font resources (https://www.libreoffice.org/)",
        };
      }
    },
  };
}

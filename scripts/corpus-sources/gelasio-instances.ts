/**
 * Source adapter: Gelasio static instances generated from the upstream variable fonts. Gelasio ships
 * as variable fonts (Gelasio[wght].ttf, Gelasio-Italic[wght].ttf) whose advances vary by weight
 * (HVAR), so the default instance is NOT bold. docfonts does not instance variable fonts itself;
 * scripts/gen-variable-instances.sh produces deterministic statics (fonttools, SOURCE_DATE_EPOCH=0,
 * --update-name-table) into <packet>/future-direct-candidates/gelasio/generated-instances/, and this
 * adapter records the instancedFrom provenance (source VF sha + axis + tool) so each face is
 * reproducible. Run the generator before this adapter; it throws if the instances are missing.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CorpusSource, RawCorpusFace } from "./types";

const FONTTOOLS_VERSION = "4.63.0";
const REPRO_NOTE =
  "SOURCE_DATE_EPOCH=0 fontTools.varLib.instancer --update-name-table";
const OFL_URL = "https://openfontlicense.org/";
const GELASIO_UPSTREAM = "https://github.com/SorkinType/Gelasio";

/** generated file -> (source variable font, instanced axes). */
const INSTANCES: {
  file: string;
  sourceVf: string;
  axes: Record<string, number>;
}[] = [
  {
    file: "Gelasio-Regular.ttf",
    sourceVf: "Gelasio[wght].ttf",
    axes: { wght: 400 },
  },
  {
    file: "Gelasio-Bold.ttf",
    sourceVf: "Gelasio[wght].ttf",
    axes: { wght: 700 },
  },
  {
    file: "Gelasio-Italic.ttf",
    sourceVf: "Gelasio-Italic[wght].ttf",
    axes: { wght: 400 },
  },
  {
    file: "Gelasio-BoldItalic.ttf",
    sourceVf: "Gelasio-Italic[wght].ttf",
    axes: { wght: 700 },
  },
];

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export function gelasioInstancesSource(
  packetPath: string,
  dateStamp = "2026-06-03",
): CorpusSource {
  const gelasioDir = join(packetPath, "future-direct-candidates", "gelasio");
  const genDir = join(gelasioDir, "generated-instances");

  return {
    corpusId: `generated-instances-${dateStamp}`,
    source:
      "Gelasio static instances generated from the upstream variable fonts (deterministic)",
    sourceUrl: "multiple public upstreams; see families[].sourceUrl",
    retrievedDate: dateStamp,
    licenseSource: `SuperDoc legal-review packet ${dateStamp} (gelasio VF, instanced)`,
    *faces(): Iterable<RawCorpusFace> {
      const licenseTextBytes = new Uint8Array(
        readFileSync(join(gelasioDir, "OFL.txt")),
      );
      for (const inst of INSTANCES) {
        const genPath = join(genDir, inst.file);
        if (!existsSync(genPath)) {
          throw new Error(
            `missing generated instance ${inst.file}; run scripts/gen-variable-instances.sh first`,
          );
        }
        const sourceBytes = new Uint8Array(
          readFileSync(join(gelasioDir, inst.sourceVf)),
        );
        yield {
          family: "Gelasio",
          fileName: inst.file,
          bytes: new Uint8Array(readFileSync(genPath)),
          // no expectedSha256: the file is generated. Reproducibility is the instancedFrom provenance.
          license: "OFL-1.1",
          licenseTextBytes,
          licenseUrl: OFL_URL,
          sourceUrl: GELASIO_UPSTREAM,
          instancedFrom: {
            sourceFamily: "Gelasio",
            sourceFileName: inst.sourceVf,
            sourceFileSha256: sha256(sourceBytes),
            axes: inst.axes,
            tool: "fontTools.varLib.instancer",
            toolVersion: FONTTOOLS_VERSION,
            reproNote: REPRO_NOTE,
          },
        };
      }
    },
  };
}

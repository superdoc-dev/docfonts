import type { ArchiveSource } from "./types";

export const URW_SOURCES: ArchiveSource[] = [
  {
    sourceId: "urw-base35",
    family: "URW Base 35",
    project: "URW Base 35",
    licenseFamily: "AGPL-3.0-FE",
    downloadUrl:
      "https://github.com/ArtifexSoftware/urw-base35-fonts/archive/refs/tags/20200910.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/ArtifexSoftware/urw-base35-fonts/20200910/LICENSE",
    expectedFiles: [
      "NimbusRoman-Regular.otf",
      "NimbusSans-Regular.otf",
      "NimbusMonoPS-Regular.otf",
      "URWBookman-Light.otf",
      "P052-Roman.otf",
      "C059-Roman.otf",
    ],
    targetFamilies: [
      "Times New Roman",
      "Arial",
      "Helvetica",
      "Courier New",
      "Bookman Old Style",
      "Palatino Linotype",
      "Century Schoolbook",
      "Century Gothic",
    ],
  },
];

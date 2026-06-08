import type { ArchiveSource } from "./types";

export const SELAWIK_SOURCES: ArchiveSource[] = [
  {
    sourceId: "selawik",
    family: "Selawik",
    project: "Selawik",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/microsoft/Selawik/1.01/LICENSE.txt",
    expectedFiles: [
      "selawk.ttf",
      "selawk.woff",
      "selawk.woff2",
      "selawkb.ttf",
      "selawkb.woff",
      "selawkb.woff2",
      "selawkl.ttf",
      "selawkl.woff",
      "selawkl.woff2",
      "selawksb.ttf",
      "selawksb.woff",
      "selawksb.woff2",
      "selawksl.ttf",
      "selawksl.woff",
      "selawksl.woff2",
    ],
    targetFamilies: ["Segoe UI"],
  },
];

import type { ArchiveSource } from "./types";

export const LIBERATION_SOURCES: ArchiveSource[] = [
  {
    sourceId: "liberation-fonts",
    family: "Liberation",
    project: "Liberation",
    licenseFamily: "OFL-1.1",
    archiveFormat: "tar.gz",
    downloadUrl:
      "https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz",
    licenseUrl:
      "https://raw.githubusercontent.com/liberationfonts/liberation-fonts/2.1.5/LICENSE",
    expectedFiles: [
      "LiberationMono-Regular.ttf",
      "LiberationMono-Bold.ttf",
      "LiberationMono-Italic.ttf",
      "LiberationMono-BoldItalic.ttf",
      "LiberationSans-Regular.ttf",
      "LiberationSans-Bold.ttf",
      "LiberationSans-Italic.ttf",
      "LiberationSans-BoldItalic.ttf",
      "LiberationSerif-Regular.ttf",
      "LiberationSerif-Bold.ttf",
      "LiberationSerif-Italic.ttf",
      "LiberationSerif-BoldItalic.ttf",
    ],
    targetFamilies: ["Arial", "Helvetica", "Times New Roman", "Courier New"],
  },
  {
    sourceId: "liberation-sans-narrow",
    family: "Liberation Sans Narrow",
    project: "Liberation",
    licenseFamily: "GPL-2.0-FE",
    archiveFormat: "tar.gz",
    downloadUrl:
      "https://github.com/liberationfonts/liberation-sans-narrow/files/2579431/liberation-narrow-fonts-ttf-1.07.6.tar.gz",
    licenseUrl:
      "https://raw.githubusercontent.com/liberationfonts/liberation-sans-narrow/1.07.6/License.txt",
    expectedFiles: [
      "LiberationSansNarrow-Regular.ttf",
      "LiberationSansNarrow-Bold.ttf",
      "LiberationSansNarrow-Italic.ttf",
      "LiberationSansNarrow-BoldItalic.ttf",
    ],
    targetFamilies: ["Arial Narrow"],
  },
];

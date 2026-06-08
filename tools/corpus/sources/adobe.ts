import type { ArchiveSource } from "./types";

export const ADOBE_SOURCES: ArchiveSource[] = [
  {
    sourceId: "source-serif-4",
    family: "Source Serif 4",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-serif/releases/download/4.005R/source-serif-4.005_Desktop.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-serif/release/LICENSE.md",
    expectedFiles: [
      "SourceSerif4-Regular.otf",
      "SourceSerif4-Bold.otf",
      "SourceSerif4-It.otf",
      "SourceSerif4-BoldIt.otf",
    ],
    targetFamilies: ["Georgia", "Cambria"],
  },
  {
    sourceId: "source-sans-3",
    family: "Source Sans 3",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-sans/releases/download/3.052R/OTF-source-sans-3.052R.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-sans/release/LICENSE.md",
    expectedFiles: [
      "SourceSans3-Regular.otf",
      "SourceSans3-Bold.otf",
      "SourceSans3-It.otf",
      "SourceSans3-BoldIt.otf",
    ],
    targetFamilies: ["Calibri", "Segoe UI"],
  },
  {
    sourceId: "source-code-pro",
    family: "Source Code Pro",
    project: "Adobe Source",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/adobe-fonts/source-code-pro/releases/download/2.042R-u/1.062R-i/1.026R-vf/OTF-source-code-pro-2.042R-u_1.062R-i.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/adobe-fonts/source-code-pro/release/LICENSE.md",
    expectedFiles: [
      "SourceCodePro-Regular.otf",
      "SourceCodePro-Bold.otf",
      "SourceCodePro-It.otf",
      "SourceCodePro-BoldIt.otf",
    ],
    targetFamilies: ["Consolas", "Courier New"],
  },
];

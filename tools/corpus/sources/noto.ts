import type { ArchiveSource } from "./types";

export const NOTO_SOURCES: ArchiveSource[] = [
  {
    sourceId: "noto-sans",
    family: "Noto Sans",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSans-v2.015/NotoSans-v2.015.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: [
      "NotoSans-Regular.otf",
      "NotoSans-Bold.otf",
      "NotoSans-Italic.otf",
      "NotoSans-BoldItalic.otf",
    ],
    targetFamilies: ["Calibri", "Segoe UI"],
  },
  {
    sourceId: "noto-serif",
    family: "Noto Serif",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSerif-v2.015/NotoSerif-v2.015.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: [
      "NotoSerif-Regular.otf",
      "NotoSerif-Bold.otf",
      "NotoSerif-Italic.otf",
      "NotoSerif-BoldItalic.otf",
    ],
    targetFamilies: ["Georgia", "Cambria"],
  },
  {
    sourceId: "noto-sans-mono",
    family: "Noto Sans Mono",
    project: "Noto",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/notofonts/latin-greek-cyrillic/releases/download/NotoSansMono-v2.014/NotoSansMono-v2.014.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt",
    expectedFiles: ["NotoSansMono-Regular.otf", "NotoSansMono-Bold.otf"],
    targetFamilies: ["Consolas", "Courier New"],
  },
];

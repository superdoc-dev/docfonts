import type { ArchiveSource } from "./types";

export const SIL_SOURCES: ArchiveSource[] = [
  {
    sourceId: "sil-charis",
    family: "Charis SIL",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-charis/releases/download/v7.000/Charis-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-charis/v7.000/OFL.txt",
    expectedFiles: [
      "Charis-Regular.ttf",
      "Charis-Bold.ttf",
      "Charis-Italic.ttf",
      "Charis-BoldItalic.ttf",
    ],
    targetFamilies: ["Charter", "Bitstream Charter"],
  },
  {
    sourceId: "sil-gentium",
    family: "Gentium Plus",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-gentium/releases/download/v7.000/Gentium-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-gentium/v7.000/OFL.txt",
    expectedFiles: [
      "Gentium-Regular.ttf",
      "Gentium-Bold.ttf",
      "Gentium-Italic.ttf",
      "Gentium-BoldItalic.ttf",
    ],
    targetFamilies: ["Times New Roman"],
  },
  {
    sourceId: "sil-doulos",
    family: "Doulos SIL",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-doulos/releases/download/v7.000/DoulosSIL-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-doulos/v7.000/OFL.txt",
    expectedFiles: ["DoulosSIL-Regular.ttf"],
    targetFamilies: ["Times New Roman"],
  },
  {
    sourceId: "sil-andika",
    family: "Andika",
    project: "SIL",
    licenseFamily: "OFL-1.1",
    downloadUrl:
      "https://github.com/silnrsi/font-andika/releases/download/v7.000/Andika-7.000.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/silnrsi/font-andika/v7.000/OFL.txt",
    expectedFiles: [
      "Andika-Regular.ttf",
      "Andika-Bold.ttf",
      "Andika-Italic.ttf",
      "Andika-BoldItalic.ttf",
    ],
    targetFamilies: ["Verdana", "Tahoma"],
  },
];

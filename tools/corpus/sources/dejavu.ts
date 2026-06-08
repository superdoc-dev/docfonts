import type { ArchiveSource } from "./types";

export const DEJAVU_SOURCES: ArchiveSource[] = [
  {
    sourceId: "dejavu",
    family: "DejaVu",
    project: "DejaVu",
    licenseFamily: "Bitstream-Vera-DejaVu",
    downloadUrl:
      "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.zip",
    licenseUrl:
      "https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/version_2_37/LICENSE",
    expectedFiles: [
      "DejaVuMathTeXGyre.ttf",
      "DejaVuSans.ttf",
      "DejaVuSans-Bold.ttf",
      "DejaVuSans-BoldOblique.ttf",
      "DejaVuSans-ExtraLight.ttf",
      "DejaVuSans-Oblique.ttf",
      "DejaVuSansCondensed.ttf",
      "DejaVuSansCondensed-Bold.ttf",
      "DejaVuSansCondensed-BoldOblique.ttf",
      "DejaVuSansCondensed-Oblique.ttf",
      "DejaVuSansMono.ttf",
      "DejaVuSansMono-Bold.ttf",
      "DejaVuSansMono-BoldOblique.ttf",
      "DejaVuSansMono-Oblique.ttf",
      "DejaVuSerif.ttf",
      "DejaVuSerif-Bold.ttf",
      "DejaVuSerif-BoldItalic.ttf",
      "DejaVuSerif-Italic.ttf",
      "DejaVuSerifCondensed.ttf",
      "DejaVuSerifCondensed-Bold.ttf",
      "DejaVuSerifCondensed-BoldItalic.ttf",
      "DejaVuSerifCondensed-Italic.ttf",
    ],
    targetFamilies: ["Verdana", "Tahoma"],
  },
];

import { GUST_LICENSE_URL } from "./licenses";
import type { ArchiveSource } from "./types";

export const TEX_GYRE_SOURCES: ArchiveSource[] = [
  {
    sourceId: "tex-gyre-adventor",
    family: "TeX Gyre Adventor",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/adventor/tg_adventor-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreadventor-regular.otf",
      "texgyreadventor-bold.otf",
      "texgyreadventor-italic.otf",
      "texgyreadventor-bolditalic.otf",
    ],
    targetFamilies: ["Century Gothic", "ITC Avant Garde Gothic"],
  },
  {
    sourceId: "tex-gyre-bonum",
    family: "TeX Gyre Bonum",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/bonum/tg_bonum-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrebonum-regular.otf",
      "texgyrebonum-bold.otf",
      "texgyrebonum-italic.otf",
      "texgyrebonum-bolditalic.otf",
    ],
    targetFamilies: ["Bookman Old Style", "ITC Bookman"],
  },
  {
    sourceId: "tex-gyre-chorus",
    family: "TeX Gyre Chorus",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/chorus/tg_chorus-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: ["texgyrechorus-mediumitalic.otf"],
    targetFamilies: ["Monotype Corsiva", "ITC Zapf Chancery"],
  },
  {
    sourceId: "tex-gyre-cursor",
    family: "TeX Gyre Cursor",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/cursor/tg_cursor-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrecursor-regular.otf",
      "texgyrecursor-bold.otf",
      "texgyrecursor-italic.otf",
      "texgyrecursor-bolditalic.otf",
    ],
    targetFamilies: ["Courier New", "Courier"],
  },
  {
    sourceId: "tex-gyre-heros",
    family: "TeX Gyre Heros",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros/tg_heros-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreheros-regular.otf",
      "texgyreheros-bold.otf",
      "texgyreheros-italic.otf",
      "texgyreheros-bolditalic.otf",
    ],
    targetFamilies: ["Arial", "Helvetica", "Arial Narrow"],
  },
  {
    sourceId: "tex-gyre-pagella",
    family: "TeX Gyre Pagella",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/pagella/tg_pagella-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyrepagella-regular.otf",
      "texgyrepagella-bold.otf",
      "texgyrepagella-italic.otf",
      "texgyrepagella-bolditalic.otf",
    ],
    targetFamilies: ["Palatino Linotype", "Book Antiqua"],
  },
  {
    sourceId: "tex-gyre-schola",
    family: "TeX Gyre Schola",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/schola/tg_schola-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyreschola-regular.otf",
      "texgyreschola-bold.otf",
      "texgyreschola-italic.otf",
      "texgyreschola-bolditalic.otf",
    ],
    targetFamilies: ["Century Schoolbook", "New Century Schoolbook"],
  },
  {
    sourceId: "tex-gyre-termes",
    family: "TeX Gyre Termes",
    project: "TeX Gyre",
    licenseFamily: "GUST-FL",
    downloadUrl:
      "https://www.gust.org.pl/projects/e-foundry/tex-gyre/termes/tg_termes-otf-2_609-31_03_2026.zip",
    licenseUrl: GUST_LICENSE_URL,
    expectedFiles: [
      "texgyretermes-regular.otf",
      "texgyretermes-bold.otf",
      "texgyretermes-italic.otf",
      "texgyretermes-bolditalic.otf",
    ],
    targetFamilies: ["Times New Roman", "Times"],
  },
];

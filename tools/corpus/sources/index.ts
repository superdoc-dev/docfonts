import { ADOBE_SOURCES } from "./adobe";
import { DEJAVU_SOURCES } from "./dejavu";
import { GOOGLE_FONT_SOURCES } from "./google-fonts";
import { LIBERATION_SOURCES } from "./liberation";
import { NOTO_SOURCES } from "./noto";
import { SELAWIK_SOURCES } from "./selawik";
import { SIL_SOURCES } from "./sil";
import { TEX_GYRE_SOURCES } from "./tex-gyre";
import type { SourceRelease } from "./types";
import { URW_SOURCES } from "./urw";

export type {
  ArchiveSource,
  GitHubTreeSource,
  LicenseFamily,
  SourceRelease,
} from "./types";

export const SOURCE_RELEASES: SourceRelease[] = [
  ...TEX_GYRE_SOURCES,
  ...URW_SOURCES,
  ...ADOBE_SOURCES,
  ...SIL_SOURCES,
  ...NOTO_SOURCES,
  ...LIBERATION_SOURCES,
  ...SELAWIK_SOURCES,
  ...DEJAVU_SOURCES,
  ...GOOGLE_FONT_SOURCES,
];

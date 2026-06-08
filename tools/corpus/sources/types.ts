import type { ArchiveFormat } from "../src/archive";

export type LicenseFamily =
  | "GUST-FL"
  | "OFL-1.1"
  | "AGPL-3.0-FE"
  | "Apache-2.0"
  | "UFL-1.0"
  | "GPL-2.0-FE"
  | "Bitstream-Vera-DejaVu";

interface BaseSource {
  sourceId: string;
  family: string;
  project: string;
  targetFamilies: string[];
}

interface LicensedSource extends BaseSource {
  licenseFamily: LicenseFamily;
  licenseUrl: string;
}

export interface ArchiveSource extends LicensedSource {
  kind?: "archive";
  archiveFormat?: ArchiveFormat;
  downloadUrl: string;
  expectedFiles: string[];
}

export interface GitHubTreeSource extends BaseSource {
  kind: "github-tree";
  repo: string;
  commit: string;
  licenseDirs: Record<string, LicenseFamily>;
}

export type SourceRelease = ArchiveSource | GitHubTreeSource;

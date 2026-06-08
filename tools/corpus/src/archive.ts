import { execFileSync } from "node:child_process";
import { join } from "node:path";

export type ArchiveFormat = "zip" | "tar.gz";

export const RAW_SFNT_EXTENSIONS = [".otf", ".ttf"] as const;
export const ACQUIRE_FONT_EXTENSIONS = [
  ...RAW_SFNT_EXTENSIONS,
  ".otc",
  ".ttc",
  ".woff2",
  ".woff",
] as const;

const ARCHIVE_EXTENSIONS: Record<ArchiveFormat, string> = {
  zip: "zip",
  "tar.gz": "tar.gz",
};

export const archiveFormatOf = <T extends { archiveFormat?: ArchiveFormat }>(
  source: T,
): ArchiveFormat => source.archiveFormat ?? "zip";

export function archivePathFor(
  cacheDir: string,
  sourceId: string,
  format: ArchiveFormat,
): string {
  return join(cacheDir, `${sourceId}.${ARCHIVE_EXTENSIONS[format]}`);
}

export function requireArchiveTool(format: ArchiveFormat): void {
  const tool = format === "tar.gz" ? "tar" : "unzip";
  const probe = format === "tar.gz" ? "--version" : "-v";
  try {
    execFileSync(tool, [probe], { stdio: "ignore" });
  } catch {
    throw new Error(`\`${tool}\` is required on PATH.`);
  }
}

export function hasFontExtension(
  path: string,
  extensions: readonly string[],
): boolean {
  const lower = path.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

export function listArchiveMembers(
  archivePath: string,
  format: ArchiveFormat,
): string[] {
  const out =
    format === "tar.gz"
      ? execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
      : execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// `unzip -p` matches its member argument as a glob, so members with literal glob
// metacharacters must be escaped to extract by exact name.
const escapeArchiveMember = (name: string): string =>
  name.replace(/[\\*?[\]]/g, "\\$&");

export function readArchiveMember(
  archivePath: string,
  member: string,
  format: ArchiveFormat,
): Uint8Array {
  const opts = { maxBuffer: 256 * 1024 * 1024 };
  return new Uint8Array(
    format === "tar.gz"
      ? execFileSync("tar", ["-xzOf", archivePath, "--", member], opts)
      : execFileSync(
          "unzip",
          ["-p", archivePath, escapeArchiveMember(member)],
          opts,
        ),
  );
}

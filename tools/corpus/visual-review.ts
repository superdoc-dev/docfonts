import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  FACE_SLOTS,
  type FaceAssets,
  type FaceSlot,
  FONT_ASSETS_DIR,
  type FontFaceAsset,
  type FontSetView,
  fontAssetName,
  isFaceSlot,
  renderVisualReviewApp,
  resolveOutPath,
  type VisualReviewApp,
} from "./src/contact-sheet";

export type FacePaths = Partial<Record<FaceSlot, string>>;

export interface VisualCandidate {
  label: string;
  faces: FacePaths;
}

export interface ParsedArgs {
  family?: string;
  referenceFaces: FacePaths;
  candidates: VisualCandidate[];
  out?: string;
}

function readValue(flag: string, argv: string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value`);
  return value;
}

export function parseLabeledValue(flag: string, raw: string): [string, string] {
  const eq = raw.indexOf("=");
  if (eq <= 0) throw new Error(`${flag} expects "Label=value", got "${raw}"`);
  const label = raw.slice(0, eq).trim();
  const value = raw.slice(eq + 1).trim();
  if (!label || !value)
    throw new Error(`${flag} expects "Label=value", got "${raw}"`);
  return [label, value];
}

export function parseFaceValue(flag: string, raw: string): [FaceSlot, string] {
  const [face, path] = parseLabeledValue(flag, raw);
  if (!isFaceSlot(face))
    throw new Error(`${flag} face must be one of: ${FACE_SLOTS.join(", ")}`);
  return [face, path];
}

export function parseCandidateFaceValue(
  flag: string,
  raw: string,
): [string, FaceSlot, string] {
  const [left, path] = parseLabeledValue(flag, raw);
  const sep = left.lastIndexOf(":");
  if (sep <= 0 || sep === left.length - 1)
    throw new Error(`${flag} expects "Label:face=value", got "${raw}"`);
  const label = left.slice(0, sep).trim();
  const face = left.slice(sep + 1).trim();
  if (!label) throw new Error(`${flag} expects a non-empty label`);
  if (!isFaceSlot(face))
    throw new Error(`${flag} face must be one of: ${FACE_SLOTS.join(", ")}`);
  return [label, face, path];
}

function setFace(
  faces: FacePaths,
  slot: FaceSlot,
  path: string,
  source: string,
): void {
  if (faces[slot]) throw new Error(`duplicate ${source} face: ${slot}`);
  faces[slot] = path;
}

function candidateFor(
  candidates: VisualCandidate[],
  label: string,
): VisualCandidate {
  const existing = candidates.find((candidate) => candidate.label === label);
  if (existing) return existing;
  const candidate = { label, faces: {} };
  candidates.push(candidate);
  return candidate;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { referenceFaces: {}, candidates: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--reference":
        setFace(
          args.referenceFaces,
          "regular",
          readValue(flag, argv, i),
          "reference",
        );
        i++;
        break;
      case "--reference-face": {
        const [slot, path] = parseFaceValue(flag, readValue(flag, argv, i));
        setFace(args.referenceFaces, slot, path, "reference");
        i++;
        break;
      }
      case "--family":
        args.family = readValue(flag, argv, i);
        i++;
        break;
      case "--candidate": {
        const [label, path] = parseLabeledValue(flag, readValue(flag, argv, i));
        const candidate = candidateFor(args.candidates, label);
        setFace(candidate.faces, "regular", path, `candidate "${label}"`);
        i++;
        break;
      }
      case "--candidate-face": {
        const [label, slot, path] = parseCandidateFaceValue(
          flag,
          readValue(flag, argv, i),
        );
        const candidate = candidateFor(args.candidates, label);
        setFace(candidate.faces, slot, path, `candidate "${label}"`);
        i++;
        break;
      }
      case "--out":
        args.out = readValue(flag, argv, i);
        i++;
        break;
      default:
        throw new Error(`unknown argument: ${flag}`);
    }
  }
  return args;
}

function assertFontPaths(args: ParsedArgs): void {
  if (Object.keys(args.referenceFaces).length === 0)
    throw new Error(
      "missing --reference: pass a regular reference, or use --reference-face face=/path.",
    );
  if (args.candidates.length === 0)
    throw new Error(
      'missing --candidate: pass at least one "Label=/path/to/font.ttf".',
    );
  for (const [slot, path] of Object.entries(args.referenceFaces)) {
    if (!existsSync(path))
      throw new Error(`reference ${slot} font not found: ${path}`);
  }
  for (const candidate of args.candidates) {
    for (const [slot, path] of Object.entries(candidate.faces)) {
      if (!existsSync(path))
        throw new Error(
          `candidate "${candidate.label}" ${slot} font not found: ${path}`,
        );
    }
  }
}

function copyFace(
  sourcePath: string,
  prefix: string,
  slot: FaceSlot,
  fontsDir: string,
): FontFaceAsset {
  const file = fontAssetName(prefix, slot, sourcePath);
  const dest = join(fontsDir, file);
  copyFileSync(sourcePath, dest);
  return {
    asset: `${FONT_ASSETS_DIR}/${file}`,
    sourceName: basename(sourcePath),
  };
}

function copyFaces(
  faces: FacePaths,
  prefix: string,
  fontsDir: string,
): FaceAssets {
  const out: FaceAssets = {};
  for (const slot of FACE_SLOTS) {
    const sourcePath = faces[slot];
    if (!sourcePath) continue;
    out[slot] = copyFace(sourcePath, prefix, slot, fontsDir);
  }
  return out;
}

function fontSet(
  label: string,
  faces: FacePaths,
  prefix: string,
  fontsDir: string,
): FontSetView {
  return {
    label,
    faces: copyFaces(faces, prefix, fontsDir),
  };
}

export function buildVisualReviewApp(
  args: ParsedArgs,
  htmlPath: string,
): VisualReviewApp {
  assertFontPaths(args);
  const outDir = dirname(htmlPath);
  const fontsDir = join(outDir, FONT_ASSETS_DIR);
  rmSync(fontsDir, { recursive: true, force: true });
  mkdirSync(fontsDir, { recursive: true });

  return {
    family: args.family,
    reference: fontSet("Reference", args.referenceFaces, "ref", fontsDir),
    candidates: args.candidates.map((candidate, index) =>
      fontSet(candidate.label, candidate.faces, `c${index}`, fontsDir),
    ),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const htmlPath = resolveOutPath(args.out);
  const app = buildVisualReviewApp(args, htmlPath);
  writeFileSync(htmlPath, renderVisualReviewApp(app));
  console.log(
    `wrote visual review app for ${app.candidates.length} candidate(s) to ${htmlPath}`,
  );
}

if (import.meta.main) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

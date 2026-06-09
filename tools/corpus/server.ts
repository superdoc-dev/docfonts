import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import {
  basename,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import {
  type CorpusFont,
  compareReferenceToCorpus,
  compareReferenceToTarget,
  listCorpusFonts,
  type ScoredCandidate,
} from "./src/compare-engine";
import { extractFont } from "./src/font";
import {
  formatDelta,
  formatFeatureCoverage,
  formatFeatureScore,
} from "./src/report";
import type { CompareModel } from "./src/tiers";

const REPO_DIR = join(import.meta.dir, "..", "..");
const APP_DIR = join(import.meta.dir, "app");
const DEFAULT_CACHE_DIR = join(REPO_DIR, ".cache", "corpus");
const DEFAULT_APP_CACHE_DIR = join(REPO_DIR, ".cache", "corpus-app");
const DEFAULT_REFERENCE_FONT_DIR = join(REPO_DIR, ".cache", "reference-fonts");
const DEFAULT_PORT = 5177;

export interface ServerArgs {
  port: number;
}

export interface CandidateSummary {
  index: number;
  sourceId: string;
  file: string;
  url: string;
  tier: string;
  mean: string;
  max: string;
  coverage: string;
  fscore: string;
  fcov: string;
  flags: string[];
  worst: string[];
}

export function parseArgs(argv: string[]): ServerArgs {
  const args: ServerArgs = { port: DEFAULT_PORT };
  const readValue = (flag: string, index: number): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${flag} requires a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case "--port": {
        const port = Number(readValue(flag, i));
        if (!Number.isInteger(port) || port <= 0)
          throw new Error("--port requires a positive integer");
        args.port = port;
        i++;
        break;
      }
      default:
        throw new Error(`unknown argument: ${flag}`);
    }
  }
  return args;
}

function mimeFor(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".ttf")) return "font/ttf";
  if (path.endsWith(".otf")) return "font/otf";
  if (path.endsWith(".woff")) return "font/woff";
  if (path.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function safeExt(name: string): string {
  const ext = extname(name).toLowerCase();
  return [".ttf", ".otf", ".woff", ".woff2"].includes(ext) ? ext : ".ttf";
}

function safeSourceName(name: string): string {
  return basename(name).replace(/[^\w.-]+/g, "_");
}

/** Known OS font directories. The reference can only be read from inside these. */
function fontDirs(): string[] {
  const home = homedir();
  if (process.platform === "darwin")
    return [
      "/System/Library/Fonts",
      "/Library/Fonts",
      join(home, "Library", "Fonts"),
      "/Applications/Microsoft Word.app/Contents/Resources/DFonts",
      DEFAULT_REFERENCE_FONT_DIR,
    ];
  if (process.platform === "win32")
    return [
      "C:\\Windows\\Fonts",
      join(home, "AppData", "Local", "Microsoft", "Windows", "Fonts"),
      DEFAULT_REFERENCE_FONT_DIR,
    ];
  return [
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    join(home, ".fonts"),
    join(home, ".local", "share", "fonts"),
    DEFAULT_REFERENCE_FONT_DIR,
  ];
}

/** The compare engine can read static TrueType/OpenType and selected TTC members. */
function isLocalFont(name: string): boolean {
  return [".ttf", ".otf", ".ttc", ".otc"].includes(extname(name).toLowerCase());
}

/** Depth-limited, count-capped scan so a huge font tree never stalls the request. */
function walkFonts(
  dir: string,
  depth: number,
  out: string[],
  cap = 4000,
): void {
  if (depth < 0 || out.length >= cap) return;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (out.length >= cap) return;
    const full = join(dir, name);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walkFonts(full, depth - 1, out, cap);
    else if (stat.isFile() && isLocalFont(name)) out.push(full);
  }
}

type FaceKey = "regular" | "bold" | "italic" | "boldItalic";
export interface Face {
  name: string;
  path: string;
  fontIndex?: number;
  weight: string;
  style: string;
  synthetic?: boolean;
}
export interface FontFamily {
  family: string;
  faces: Partial<Record<FaceKey, Face>>;
}

function decodeUtf16BE(buf: Buffer): string {
  let out = "";
  for (let i = 0; i + 1 < buf.length; i += 2)
    out += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
  return out;
}

/** Strip an extension and trailing style words so a filename can stand in for a family name. */
function familyFromFilename(name: string): string {
  const base = name
    .replace(/\.(ttf|otf|ttc|otc)$/i, "")
    .replace(/[-_ ]?(bold ?italic|italic|oblique|bold|regular|book)$/i, "")
    .replace(/[-_ ]+$/, "")
    .trim();
  return base || name;
}

function styleFromFilename(name: string): { bold: boolean; italic: boolean } {
  const lower = name.toLowerCase();
  return {
    bold: /bold/.test(lower),
    italic: /italic|oblique/.test(lower),
  };
}

interface FontIdentity {
  family: string;
  bold: boolean;
  italic: boolean;
  fontIndex?: number;
}

interface NameChoice {
  value: string;
  score: number;
}

const TTCF = 0x74746366;

function englishNameScore(platformID: number, languageID: number): number {
  if (platformID === 3 && languageID === 0x0409) return 5;
  if (platformID === 1 && languageID === 0) return 4;
  if (platformID === 0) return 3;
  if (platformID === 3) return 2;
  return 1;
}

function betterName(
  current: NameChoice | null,
  value: string,
  score: number,
): NameChoice {
  if (!current || score > current.score) return { value, score };
  return current;
}

function styleFromName(value: string): { bold: boolean; italic: boolean } {
  const lower = value.toLowerCase();
  return {
    bold: /bold|black|heavy|semibold|demibold/.test(lower),
    italic: /italic|oblique/.test(lower),
  };
}

/**
 * Read every font identity from a single font or collection. Uses positioned reads so one large TTC
 * does not need to be loaded during the local-family scan.
 */
function readFontIdentities(path: string): FontIdentity[] {
  const fallback = (): FontIdentity[] => [
    {
      family: familyFromFilename(basename(path)),
      ...styleFromFilename(basename(path)),
    },
  ];
  const at = (fd: number, position: number, length: number): Buffer | null => {
    const buf = Buffer.alloc(length);
    try {
      return readSync(fd, buf, 0, length, position) === length ? buf : null;
    } catch {
      return null;
    }
  };
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch {
    return fallback();
  }
  try {
    const header = at(fd, 0, 12);
    if (!header) return fallback();
    const sfntVersion = header.readUInt32BE(0);
    let offsets: number[];
    if (sfntVersion === TTCF) {
      const count = header.readUInt32BE(8);
      const table = at(fd, 12, count * 4);
      if (!table) return fallback();
      offsets = Array.from({ length: count }, (_, i) =>
        table.readUInt32BE(i * 4),
      );
    } else {
      offsets = [0];
    }

    const identities: FontIdentity[] = [];
    offsets.forEach((sfntOffset, fontIndex) => {
      const sfntHeader = at(fd, sfntOffset, 12);
      if (!sfntHeader) return;
      const numTables = sfntHeader.readUInt16BE(4);
      const dir = at(fd, sfntOffset + 12, numTables * 16);
      if (!dir) return;
      let nameOff = 0;
      let nameLen = 0;
      let os2Off = 0;
      for (let i = 0; i < numTables; i++) {
        const rec = i * 16;
        const tag = dir.toString("latin1", rec, rec + 4);
        if (tag === "name") {
          nameOff = dir.readUInt32BE(rec + 8);
          nameLen = dir.readUInt32BE(rec + 12);
        } else if (tag === "OS/2") {
          os2Off = dir.readUInt32BE(rec + 8);
        }
      }

      let bold = false;
      let italic = false;
      let haveStyle = false;
      if (os2Off) {
        const fsSel = at(fd, os2Off + 62, 2);
        if (fsSel) {
          const sel = fsSel.readUInt16BE(0);
          italic = (sel & 0x01) !== 0;
          bold = (sel & 0x20) !== 0;
          haveStyle = true;
        }
      }

      let id1: NameChoice | null = null;
      let id2: NameChoice | null = null;
      let id16: NameChoice | null = null;
      let id17: NameChoice | null = null;
      const table =
        nameOff && nameLen ? at(fd, nameOff, Math.min(nameLen, 65536)) : null;
      if (table && table.length >= 6) {
        const count = table.readUInt16BE(2);
        const storage = table.readUInt16BE(4);
        for (let i = 0; i < count; i++) {
          const rec = 6 + i * 12;
          if (rec + 12 > table.length) break;
          const platformID = table.readUInt16BE(rec);
          const languageID = table.readUInt16BE(rec + 4);
          const nameID = table.readUInt16BE(rec + 6);
          const len = table.readUInt16BE(rec + 8);
          const off = storage + table.readUInt16BE(rec + 10);
          if (
            (nameID !== 1 && nameID !== 2 && nameID !== 16 && nameID !== 17) ||
            off + len > table.length
          )
            continue;
          const raw = table.subarray(off, off + len);
          const value = (
            platformID === 1 ? raw.toString("latin1") : decodeUtf16BE(raw)
          ).trim();
          if (!value) continue;
          const score = englishNameScore(platformID, languageID);
          if (nameID === 1) id1 = betterName(id1, value, score);
          else if (nameID === 2) id2 = betterName(id2, value, score);
          else if (nameID === 16) id16 = betterName(id16, value, score);
          else if (nameID === 17) id17 = betterName(id17, value, score);
        }
      }

      if (!haveStyle) {
        const namedStyle = styleFromName(id17?.value || id2?.value || "");
        const fileStyle = styleFromFilename(basename(path));
        bold = namedStyle.bold || fileStyle.bold;
        italic = namedStyle.italic || fileStyle.italic;
      }

      const family =
        id1?.value || id16?.value || familyFromFilename(basename(path));
      identities.push({
        family,
        bold,
        italic,
        fontIndex: sfntVersion === TTCF ? fontIndex : undefined,
      });
    });
    return identities.length ? identities : fallback();
  } catch {
    return fallback();
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* already closed */
    }
  }
}

function faceKeyOf(id: { bold: boolean; italic: boolean }): FaceKey {
  if (id.bold && id.italic) return "boldItalic";
  if (id.bold) return "bold";
  if (id.italic) return "italic";
  return "regular";
}

function faceStyle(face: FaceKey): Pick<Face, "style" | "weight"> {
  return {
    style: face === "italic" || face === "boldItalic" ? "italic" : "normal",
    weight: face === "bold" || face === "boldItalic" ? "700" : "400",
  };
}

const FACE_LABELS: Record<FaceKey, string> = {
  regular: "Regular",
  bold: "Bold",
  italic: "Italic",
  boldItalic: "Bold Italic",
};

function syntheticFace(source: Face, face: FaceKey): Face {
  const baseName = source.name.replace(/(?: \(synthetic [^)]+\))+$/g, "");
  return {
    ...source,
    ...faceStyle(face),
    name: `${baseName} (synthetic ${FACE_LABELS[face]})`,
    synthetic: true,
  };
}

export function completeSyntheticFaces(family: FontFamily): void {
  const { faces } = family;
  if (!faces.regular) return;
  if (!faces.bold) faces.bold = syntheticFace(faces.regular, "bold");
  if (!faces.italic) faces.italic = syntheticFace(faces.regular, "italic");
  if (!faces.boldItalic)
    faces.boldItalic = syntheticFace(
      faces.bold && !faces.bold.synthetic
        ? faces.bold
        : (faces.italic ?? faces.regular),
      "boldItalic",
    );
}

/** Scan the OS font directories and group the static fonts into families with R/B/I/BI faces. */
function scanLocalFamilies(): FontFamily[] {
  const seenPaths = new Set<string>();
  const families = new Map<string, FontFamily>();
  for (const dir of fontDirs()) {
    if (!existsSync(dir)) continue;
    const found: string[] = [];
    walkFonts(dir, 3, found);
    for (const path of found) {
      if (seenPaths.has(path)) continue;
      seenPaths.add(path);
      for (const id of readFontIdentities(path)) {
        const key = id.family || basename(path);
        let family = families.get(key);
        if (!family) {
          family = { family: key, faces: {} };
          families.set(key, family);
        }
        const face = faceKeyOf(id);
        if (!family.faces[face])
          family.faces[face] = {
            name:
              id.fontIndex === undefined
                ? basename(path)
                : `${basename(path)} #${id.fontIndex + 1}`,
            path,
            fontIndex: id.fontIndex,
            ...faceStyle(face),
          };
      }
    }
  }
  for (const family of families.values()) completeSyntheticFaces(family);
  return [...families.values()].sort((a, b) =>
    a.family.localeCompare(b.family),
  );
}

/** Resolve a detected-font path, refusing anything outside the known font directories. */
export function resolveLocalFont(raw: string): string {
  const target = resolve(raw);
  const inside = fontDirs().some((dir) => {
    const rel = relative(resolve(dir), target);
    return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
  });
  if (!inside)
    throw new Error("reference path is outside the known font directories");
  if (!existsSync(target) || !isLocalFont(target))
    throw new Error("reference font not found");
  return target;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(error: unknown, status = 400): Response {
  return json(
    { error: error instanceof Error ? error.message : String(error) },
    status,
  );
}

function serveFile(root: string, pathname: string): Response {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = normalize(join(root, rel));
  if (!relative(root, target).startsWith("..") && existsSync(target)) {
    return new Response(Bun.file(target), {
      headers: { "content-type": mimeFor(target) },
    });
  }
  return new Response("not found", { status: 404 });
}

function emptyLike(response: Response): Response {
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

function sourceUrl(runId: string, file: string): string {
  return `/runs/${encodeURIComponent(runId)}/${encodeURIComponent(file)}`;
}

export function summarizeCandidate(
  row: ScoredCandidate,
  index: number,
  url: string,
): CandidateSummary {
  return {
    index,
    sourceId: row.sourceId,
    file: row.file,
    url,
    tier: row.score.tier,
    mean: formatDelta(row.score.meanDelta),
    max: formatDelta(row.score.maxDelta),
    coverage: `${row.score.compared}/${row.score.total}`,
    fscore: formatFeatureScore(row.feature),
    fcov: formatFeatureCoverage(row.feature),
    flags: row.feature.gaps.map((gap) => `${gap.feature}_gap`),
    worst: row.score.worstGlyphs.map(
      (glyph) =>
        `U+${glyph.codepoint.toString(16).toUpperCase().padStart(4, "0")} ${glyph.delta.toFixed(4)}`,
    ),
  };
}

function parseSourceList(raw: FormDataEntryValue | null): string[] {
  return typeof raw === "string"
    ? raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
}

function parseLimit(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string" || raw.trim() === "") return 10;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 50)
    throw new Error("limit must be a positive integer up to 50");
  return limit;
}

function parseModel(raw: FormDataEntryValue | null): CompareModel {
  if (raw === "monospace") return "monospace";
  return "latin";
}

function parseFontIndex(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 0)
    throw new Error("referenceIndex must be a non-negative integer");
  return index;
}

async function resolveReference(
  form: FormData,
): Promise<{ bytes: Uint8Array; name: string }> {
  const fontIndex = parseFontIndex(form.get("referenceIndex"));
  const reference = form.get("reference");
  if (reference instanceof File) {
    const raw = new Uint8Array(await reference.arrayBuffer());
    return {
      bytes: extractFont(raw, fontIndex),
      name:
        fontIndex === 0
          ? reference.name
          : `${reference.name} #${fontIndex + 1}`,
    };
  }
  const referencePath = form.get("referencePath");
  if (typeof referencePath === "string" && referencePath.trim() !== "") {
    const target = resolveLocalFont(referencePath.trim());
    const raw = new Uint8Array(readFileSync(target));
    return {
      bytes: extractFont(raw, fontIndex),
      name:
        fontIndex === 0
          ? basename(target)
          : `${basename(target)} #${fontIndex + 1}`,
    };
  }
  throw new Error(
    "choose a reference font file, or pick one detected on this machine",
  );
}

async function handleCompare(req: Request): Promise<Response> {
  const form = await req.formData();
  const { bytes: referenceBytes, name: referenceName } =
    await resolveReference(form);

  const limit = parseLimit(form.get("limit"));
  const model = parseModel(form.get("model"));
  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
  const appCacheDir = process.env.DOCFONTS_APP_CACHE ?? DEFAULT_APP_CACHE_DIR;
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(appCacheDir, runId);
  mkdirSync(runDir, { recursive: true });

  const referenceFile = `reference${safeExt(referenceName)}`;
  writeFileSync(join(runDir, referenceFile), referenceBytes);

  const result = compareReferenceToCorpus(referenceBytes, {
    cacheDir,
    sources: parseSourceList(form.get("sources")),
    model,
    limit,
  });

  const candidates = result.rows.map((row, index) => {
    const file = `candidate-${index}${safeExt(row.file)}`;
    writeFileSync(join(runDir, file), row.bytes);
    return summarizeCandidate(row, index, sourceUrl(runId, file));
  });

  return json({
    runId,
    reference: {
      name: safeSourceName(referenceName),
      url: sourceUrl(runId, referenceFile),
    },
    totalRows: result.totalRows,
    skipped: result.skipped,
    candidates,
  });
}

async function handleSources(): Promise<Response> {
  try {
    const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
    const { loadSnapshot } = await import("./src/cache");
    return json({
      sources: loadSnapshot(cacheDir).map((source) => ({
        sourceId: source.sourceId,
        family: source.family,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function handleLocalFonts(): Response {
  try {
    return json({ families: scanLocalFamilies() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** The corpus catalog is static for a cache dir, so list it once and reuse it across typeahead loads. */
const corpusFontCache = new Map<string, CorpusFont[]>();

function handleCorpusFonts(): Response {
  try {
    const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;
    let fonts = corpusFontCache.get(cacheDir);
    if (!fonts) {
      fonts = listCorpusFonts(cacheDir);
      corpusFontCache.set(cacheDir, fonts);
    }
    return json({ fonts });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Run IDs are server-minted (base36-base36); reject anything else so a client can't escape the cache dir. */
export function runDirFor(runId: string): string {
  if (!/^[a-z0-9]+-[a-z0-9]+$/.test(runId)) throw new Error("invalid run id");
  const appCacheDir = process.env.DOCFONTS_APP_CACHE ?? DEFAULT_APP_CACHE_DIR;
  return join(appCacheDir, runId);
}

/** Compare the reference against one specific corpus font, on demand, writing it into an existing run. */
async function handleCompareTarget(req: Request): Promise<Response> {
  const form = await req.formData();
  const sourceId = form.get("sourceId");
  const file = form.get("file");
  if (typeof sourceId !== "string" || !sourceId)
    throw new Error("sourceId is required");
  if (typeof file !== "string" || !file) throw new Error("file is required");
  const runId = form.get("runId");
  if (typeof runId !== "string") throw new Error("runId is required");

  const runDir = runDirFor(runId);
  mkdirSync(runDir, { recursive: true });
  const { bytes: referenceBytes } = await resolveReference(form);
  const model = parseModel(form.get("model"));
  const cacheDir = process.env.DOCFONTS_SOURCE_CACHE ?? DEFAULT_CACHE_DIR;

  const row = compareReferenceToTarget(referenceBytes, {
    cacheDir,
    sourceId,
    file,
    model,
  });

  const candFile = `pin-${safeSourceName(sourceId)}-${safeSourceName(file)}${safeExt(row.file)}`;
  writeFileSync(join(runDir, candFile), row.bytes);
  return json({
    candidate: summarizeCandidate(row, 0, sourceUrl(runId, candFile)),
  });
}

function serveRunFile(pathname: string): Response {
  const appCacheDir = process.env.DOCFONTS_APP_CACHE ?? DEFAULT_APP_CACHE_DIR;
  const raw = pathname.replace(/^\/runs\//, "");
  const parts = raw.split("/").map(decodeURIComponent);
  if (parts.length !== 2) return new Response("not found", { status: 404 });
  const target = normalize(join(appCacheDir, parts[0], parts[1]));
  if (relative(appCacheDir, target).startsWith("..") || !existsSync(target))
    return new Response("not found", { status: 404 });
  return new Response(Bun.file(target), {
    headers: { "content-type": mimeFor(target) },
  });
}

export function createServer(port: number): ReturnType<typeof Bun.serve> {
  rmSync(DEFAULT_APP_CACHE_DIR, { recursive: true, force: true });
  mkdirSync(DEFAULT_APP_CACHE_DIR, { recursive: true });
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      try {
        if (req.method === "POST" && url.pathname === "/api/compare")
          return await handleCompare(req);
        if (req.method === "POST" && url.pathname === "/api/compare-target")
          return await handleCompareTarget(req);
        if (req.method === "GET" && url.pathname === "/api/corpus-fonts")
          return handleCorpusFonts();
        if (req.method === "GET" && url.pathname === "/api/sources")
          return await handleSources();
        if (req.method === "GET" && url.pathname === "/api/local-fonts")
          return handleLocalFonts();
        if (req.method === "GET" && url.pathname.startsWith("/runs/"))
          return serveRunFile(url.pathname);
        if (req.method === "GET") return serveFile(APP_DIR, url.pathname);
        if (req.method === "HEAD")
          return emptyLike(serveFile(APP_DIR, url.pathname));
        return new Response("method not allowed", { status: 405 });
      } catch (error) {
        return errorResponse(error);
      }
    },
  });
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const server = createServer(args.port);
    console.log(`DocFonts corpus app: http://127.0.0.1:${server.port}`);
    setInterval(() => {}, 1 << 30);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

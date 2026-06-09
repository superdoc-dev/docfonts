import { extname, isAbsolute, join, resolve } from "node:path";

const REPO_DIR = join(import.meta.dir, "..", "..", "..");
export const DEFAULT_OUT = join(
  REPO_DIR,
  ".cache",
  "corpus-visual",
  "review.html",
);

export const ASSETS_DIR = "assets";
export const FONT_ASSETS_DIR = `${ASSETS_DIR}/fonts`;

export const FACE_SLOTS = ["regular", "bold", "italic", "boldItalic"] as const;

export type FaceSlot = (typeof FACE_SLOTS)[number];

export const FACE_LABELS: Record<FaceSlot, string> = {
  regular: "Regular",
  bold: "Bold",
  italic: "Italic",
  boldItalic: "Bold Italic",
};

export const OVERLAY_GLYPHS: readonly string[] = [
  "a",
  "g",
  "e",
  "s",
  "t",
  "R",
  "Q",
  "M",
  "G",
  "&",
  "@",
  "0",
  "8",
  "1",
  "i",
  "l",
  "y",
  "j",
  "?",
];

export const SPECIMEN_TEXT = "Hamburgefonstiv 0123456789";
export const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog.";

export interface FontFaceAsset {
  asset: string;
  sourceName: string;
}

export type FaceAssets = Partial<Record<FaceSlot, FontFaceAsset>>;

export interface FontSetView {
  label: string;
  faces: FaceAssets;
}

export interface VisualReviewApp {
  family?: string;
  reference: FontSetView;
  candidates: FontSetView[];
}

export function isFaceSlot(value: string): value is FaceSlot {
  return FACE_SLOTS.includes(value as FaceSlot);
}

export function resolveOutPath(out: string | undefined): string {
  if (!out) return DEFAULT_OUT;
  const absolute = isAbsolute(out) ? out : resolve(out);
  return absolute.endsWith(".html") ? absolute : join(absolute, "review.html");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function codepointOf(glyph: string): number {
  const cp = glyph.codePointAt(0);
  if (cp === undefined) throw new Error("empty glyph in overlay set");
  return cp;
}

export function formatCodepoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function fontFamily(kind: "ref" | "candidate", index: number, face: FaceSlot) {
  return kind === "ref" ? `docfonts-ref-${face}` : `docfonts-c${index}-${face}`;
}

function fontFaceCss(app: VisualReviewApp): string {
  const rules: string[] = [];
  for (const face of FACE_SLOTS) {
    const asset = app.reference.faces[face];
    if (!asset) continue;
    rules.push(
      `@font-face { font-family: "${fontFamily("ref", 0, face)}"; src: url("${escapeCssString(asset.asset)}"); }`,
    );
  }
  app.candidates.forEach((candidate, index) => {
    for (const face of FACE_SLOTS) {
      const asset = candidate.faces[face];
      if (!asset) continue;
      rules.push(
        `@font-face { font-family: "${fontFamily("candidate", index, face)}"; src: url("${escapeCssString(asset.asset)}"); }`,
      );
    }
  });
  return rules.join("\n");
}

function reviewModel(app: VisualReviewApp) {
  return {
    ...app,
    faces: FACE_SLOTS.map((slot) => ({ slot, label: FACE_LABELS[slot] })),
    glyphs: OVERLAY_GLYPHS.map((glyph) => ({
      glyph,
      codepoint: formatCodepoint(codepointOf(glyph)),
    })),
    specimenText: SPECIMEN_TEXT,
    sampleText: SAMPLE_TEXT,
    fontFamilies: {
      reference: Object.fromEntries(
        FACE_SLOTS.map((face) => [face, fontFamily("ref", 0, face)]),
      ),
      candidates: app.candidates.map((_, index) =>
        Object.fromEntries(
          FACE_SLOTS.map((face) => [
            face,
            fontFamily("candidate", index, face),
          ]),
        ),
      ),
    },
  };
}

export function fontAssetName(
  prefix: string,
  slot: FaceSlot,
  sourcePath: string,
): string {
  const ext = extname(sourcePath) || ".ttf";
  return `${prefix}-${slot}${ext}`;
}

export function renderVisualReviewApp(app: VisualReviewApp): string {
  const family = app.family ?? "(family not specified)";
  const model = safeJson(reviewModel(app));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(`Visual review: ${family}`)}</title>
<style>
${fontFaceCss(app)}
  :root { color-scheme: light; }
  body { font-family: system-ui, sans-serif; margin: 24px; color: #202124; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .meta { color: #5f6368; font-size: 13px; margin: 0 0 16px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
  button { border: 1px solid #c7ccd1; background: #fff; border-radius: 6px; padding: 7px 10px; cursor: pointer; }
  button.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
  .card { border: 1px solid #d8dde3; border-radius: 8px; padding: 14px; }
  .card h2 { font-size: 16px; margin: 0 0 4px; }
  .source { color: #5f6368; font-size: 12px; margin-bottom: 10px; }
  .row { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: baseline; margin: 8px 0; }
  .label { color: #5f6368; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  .sample { font-size: 34px; line-height: 1.25; white-space: nowrap; overflow: hidden; }
  .paragraph { font-size: 22px; line-height: 1.35; white-space: normal; }
  .overlay { position: relative; min-height: 58px; overflow: hidden; background: #fff; border: 1px solid #eef0f2; }
  .overlay span { position: absolute; left: 0; top: 0; font-size: 46px; line-height: 1.2; white-space: nowrap; mix-blend-mode: multiply; }
  .overlay .ref { color: #00bcd4; }
  .overlay .cand { color: #ff00b8; }
  .glyphs { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; margin-top: 10px; }
  .glyph { border: 1px solid #eef0f2; min-height: 80px; padding: 4px; }
  .glyph .overlay { min-height: 58px; border: 0; }
  .glyph .overlay span { font-size: 52px; }
  .glyph label { display: block; color: #5f6368; font-size: 11px; text-align: center; }
  .missing { color: #9aa0a6; font-size: 14px; }
</style>
</head>
<body>
  <h1>${escapeHtml(`Visual review: ${family}`)}</h1>
  <p class="meta">Loaded ${app.candidates.length} candidate(s). Cyan is reference, magenta is candidate, blue overlap means shared ink.</p>
  <div class="toolbar" id="face-toolbar"></div>
  <main class="grid" id="cards"></main>
<script type="module">
const data = ${model};
const hasFace = (set, face) => Boolean(set.faces[face]);
const familyFor = (kind, index, face) =>
  kind === "reference"
    ? data.fontFamilies.reference[face]
    : data.fontFamilies.candidates[index][face];
const firstAvailableFace = data.faces.find((face) =>
  hasFace(data.reference, face.slot) &&
  data.candidates.some((candidate) => hasFace(candidate, face.slot))
);
let selectedFace = firstAvailableFace ? firstAvailableFace.slot : "regular";
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false || value === null) continue;
    if (key === "class") node.className = value;
    else if (key === "style") node.setAttribute("style", value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
};
const text = (value, className, style) =>
  el("div", { class: className, style }, [value]);
const overlay = (candidate, index, value) => {
  const refFamily = familyFor("reference", 0, selectedFace);
  const candFamily = familyFor("candidate", index, selectedFace);
  return el("div", { class: "overlay" }, [
    el("span", { class: "ref", style: \`font-family: "\${refFamily}"\` }, [value]),
    el("span", { class: "cand", style: \`font-family: "\${candFamily}"\` }, [value]),
  ]);
};
const row = (label, child) =>
  el("div", { class: "row" }, [el("div", { class: "label" }, [label]), child]);

function renderToolbar() {
  const toolbar = document.getElementById("face-toolbar");
  toolbar.innerHTML = "";
  for (const face of data.faces) {
    const available = hasFace(data.reference, face.slot) &&
      data.candidates.some((candidate) => hasFace(candidate, face.slot));
    const button = el("button", {
      type: "button",
      class: selectedFace === face.slot ? "active" : "",
      disabled: available ? undefined : "true",
    }, [face.label]);
    button.addEventListener("click", () => {
      selectedFace = face.slot;
      render();
    });
    toolbar.append(button);
  }
}

function renderCandidate(candidate, index) {
  const refFace = data.reference.faces[selectedFace];
  const candFace = candidate.faces[selectedFace];
  const card = el("section", { class: "card" }, [
    el("h2", {}, [candidate.label]),
    el("div", { class: "source" }, [candFace ? candFace.sourceName : "missing face"]),
  ]);
  if (!refFace || !candFace) {
    card.append(el("p", { class: "missing" }, ["This face is missing from the reference or candidate set."]));
    return card;
  }
  const refStyle = \`font-family: "\${familyFor("reference", 0, selectedFace)}"\`;
  const candStyle = \`font-family: "\${familyFor("candidate", index, selectedFace)}"\`;
  card.append(
    row("reference", text(data.specimenText, "sample", refStyle)),
    row("candidate", text(data.specimenText, "sample", candStyle)),
    row("overlay", overlay(candidate, index, data.specimenText)),
    row("body", text(data.sampleText, "paragraph", candStyle)),
  );
  const glyphs = el("div", { class: "glyphs" });
  for (const glyph of data.glyphs) {
    glyphs.append(el("div", { class: "glyph" }, [
      overlay(candidate, index, glyph.glyph),
      el("label", {}, [\`\${glyph.glyph} \${glyph.codepoint}\`]),
    ]));
  }
  card.append(glyphs);
  return card;
}

function render() {
  renderToolbar();
  const cards = document.getElementById("cards");
  cards.innerHTML = "";
  for (let index = 0; index < data.candidates.length; index++)
    cards.append(renderCandidate(data.candidates[index], index));
}

render();
</script>
</body>
</html>
`;
}

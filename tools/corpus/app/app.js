// docfonts Corpus Review - local workbench UI.
// Numbers come from the compare engine. The overlay is a visual aid, not the measurement.

const FACE_SLOTS = [
  { id: "regular", label: "Regular", short: "R" },
  { id: "bold", label: "Bold", short: "B" },
  { id: "italic", label: "Italic", short: "I" },
  { id: "boldItalic", label: "Bold Italic", short: "BI" },
];
const GLYPHS = [
  "a",
  "g",
  "e",
  "s",
  "t",
  "R",
  "Q",
  "M",
  "&",
  "@",
  "0",
  "1",
  "i",
  "l",
  "y",
  "?",
];
const SPECIMEN = "Hamburgefonstiv 0123";
const BODY = "The quick brown fox jumps over the lazy dog.";

const VERDICT = {
  metric_safe: { cls: "v-safe", label: "metric-safe" },
  near_metric: { cls: "v-near", label: "near-metric" },
  cell_width_only: { cls: "v-cell", label: "cell-width-only" },
  visual_only: { cls: "v-visual", label: "visual-only" },
};
const verdictOf = (tier) => VERDICT[tier] ?? { cls: "v-visual", label: tier };

const el = (id) => document.getElementById(id);
const fileInput = el("reference");
const fnameLabel = el("fname");
const detectedSel = el("detected");
const detectedList = el("detected-list");
const scopeSel = el("scope");
const modelSeg = el("model");
const faceSources = el("face-sources");
const limitInput = el("limit");
const sampleInput = el("sample");
const runButton = el("run");
const toastEl = el("toast");
const main = el("main");

let model = "latin";
let activeFace = "regular";
let families = [];
let corpusFonts = [];
const referenceByFace = Object.fromEntries(
  FACE_SLOTS.map((slot) => [slot.id, null]),
);
const resultsByFace = Object.fromEntries(
  FACE_SLOTS.map((slot) => [slot.id, null]),
);
const selectedIndexByFace = Object.fromEntries(
  FACE_SLOTS.map((slot) => [slot.id, -1]),
);
// Transient per-face run state ("measuring" | "failed"), surfaced on the face pills.
const faceStatus = Object.fromEntries(
  FACE_SLOTS.map((slot) => [slot.id, null]),
);
const faceError = Object.fromEntries(FACE_SLOTS.map((slot) => [slot.id, null]));

function node(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) n.append(c);
  return n;
}

function faceSlot(id) {
  return FACE_SLOTS.find((slot) => slot.id === id) ?? FACE_SLOTS[0];
}

let toastTimer = null;
/** Transient corner toast for one-off feedback (pins, errors). Run progress lives on the face pills. */
function setStatus(message, kind = "info") {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `toast show${kind === "error" ? " err" : ""}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.className = "toast";
  }, 3600);
}

function codepoint(glyph) {
  return `U+${glyph.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

function referenceLabel(ref) {
  if (!ref) return "missing";
  return ref.name;
}

function fontDescriptors(ref) {
  return {
    style: ref?.style || "normal",
    weight: ref?.weight || "400",
  };
}

function fontStyle(family, ref) {
  const desc = fontDescriptors(ref);
  return `font-family:"${family}";font-style:${desc.style};font-weight:${desc.weight}`;
}

async function loadFont(family, url, ref = null) {
  const face = new FontFace(family, `url("${url}")`, fontDescriptors(ref));
  await face.load();
  document.fonts.add(face);
}

async function loadSources() {
  try {
    const res = await fetch("/api/sources");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "could not load sources");
    for (const source of data.sources)
      scopeSel.append(
        node("option", { value: source.sourceId }, [source.family]),
      );
  } catch {
    // Keep the default "All acquired" scope when the snapshot is not available.
  }
}

/** Load the full corpus catalog once so the review can pin and compare any specific font. */
async function loadCorpusFonts() {
  try {
    const res = await fetch("/api/corpus-fonts");
    const data = await res.json();
    corpusFonts = Array.isArray(data.fonts) ? data.fonts : [];
  } catch {
    corpusFonts = [];
  }
}

async function loadDetected() {
  try {
    const res = await fetch("/api/local-fonts");
    const data = await res.json();
    families = res.ok && Array.isArray(data.families) ? data.families : [];
    detectedList.innerHTML = "";
    detectedSel.placeholder = "Type a detected family...";
    if (!families.length) {
      detectedSel.placeholder = "No local fonts detected";
      return;
    }
    families.forEach((family, index) => {
      const count = Object.keys(family.faces).length;
      detectedList.append(
        node("option", {
          value: family.family,
          label: `${count} face${count === 1 ? "" : "s"}`,
          "data-index": String(index),
        }),
      );
    });
  } catch {
    detectedList.innerHTML = "";
    detectedSel.placeholder = "Detection unavailable";
  }
}

function updateFaceControls() {
  const regular = referenceByFace.regular;
  fnameLabel.textContent =
    regular?.kind === "file" ? regular.name : "No file loaded";
}

function faceState(slot) {
  if (faceStatus[slot.id] === "measuring") return "measuring";
  if (faceStatus[slot.id] === "failed") return "failed";
  if (resultsByFace[slot.id]) return "measured";
  if (referenceByFace[slot.id]) return "ready";
  return "missing";
}

function renderFaceSources() {
  faceSources.innerHTML = "";
  for (const slot of FACE_SLOTS) {
    const ref = referenceByFace[slot.id];
    const state = faceState(slot);
    const classes = ["face-source", `face-${slot.id}`, `state-${state}`];
    if (slot.id === activeFace) classes.push("active");
    if (ref) classes.push("loaded");
    faceSources.append(
      node(
        "button",
        {
          class: classes.join(" "),
          type: "button",
          "data-face": slot.id,
          title:
            state === "failed"
              ? faceError[slot.id] || "compare failed"
              : undefined,
        },
        [
          node("span", { class: "face-short" }, [slot.short]),
          node("span", { class: "face-name" }, [
            ref ? referenceLabel(ref) : `${slot.label} missing`,
          ]),
          node("span", { class: "face-state" }, [state]),
        ],
      ),
    );
  }
}

function setActiveFace(face) {
  activeFace = face;
  updateFaceControls();
  renderFaceSources();
  renderActiveFace();
}

function clearFaces() {
  for (const slot of FACE_SLOTS) {
    referenceByFace[slot.id] = null;
    resultsByFace[slot.id] = null;
    selectedIndexByFace[slot.id] = -1;
  }
}

/** Detected family pick: auto-fill every face the family actually has. */
function loadFamily(family) {
  clearFaces();
  for (const slot of FACE_SLOTS) {
    const face = family.faces[slot.id];
    if (face)
      referenceByFace[slot.id] = {
        kind: "path",
        path: face.path,
        fontIndex: face.fontIndex,
        style: face.style,
        synthetic: face.synthetic,
        weight: face.weight,
        name: face.name,
      };
  }
  activeFace = (
    FACE_SLOTS.find((slot) => referenceByFace[slot.id]) ?? FACE_SLOTS[0]
  ).id;
  updateFaceControls();
  renderFaceSources();
  renderActiveFace();
}

/** A one-off uploaded file compares as a single Regular face. */
function loadSingleFile(file) {
  clearFaces();
  referenceByFace.regular = { kind: "file", file, name: file.name };
  activeFace = "regular";
  detectedSel.value = "";
  updateFaceControls();
  renderFaceSources();
  renderActiveFace();
}

function candidateFamily(data, candidate) {
  return `docfonts-${data.faceId}-candidate-${candidate.index}`;
}

function referenceFamily(data) {
  return `docfonts-${data.faceId}-reference-${data.runId}`;
}

/** Compact candidate switcher shown in the review header. Pinned fonts lead, then the ranked corpus matches. */
function candidatePicker(data, currentIndex) {
  const select = node("select", {
    class: "field cand-picker",
    "aria-label": "Candidate",
  });
  const entries = data.candidates.map((candidate, index) => ({
    candidate,
    index,
  }));
  const ordered = [
    ...entries.filter((entry) => entry.candidate.pinned),
    ...entries.filter((entry) => !entry.candidate.pinned),
  ];
  for (const { candidate, index } of ordered) {
    const verdict = verdictOf(candidate.tier);
    const rank = candidate.pinned ? "Pinned" : `${index + 1}.`;
    const option = node("option", { value: String(index) }, [
      `${rank} ${candidate.file} - ${verdict.label} (${candidate.mean} / ${candidate.max})`,
    ]);
    if (index === currentIndex) option.setAttribute("selected", "");
    select.append(option);
  }
  select.addEventListener("change", () => {
    selectCandidate(Number(select.value));
  });
  return select;
}

/** Typeahead over the full corpus so any specific font can be pinned and compared on demand. */
function pinSearch() {
  const input = node("input", {
    class: "field pin-input",
    type: "text",
    placeholder: "Compare a specific font...",
    "aria-label": "Compare a specific font",
    autocomplete: "off",
  });
  const results = node("div", { class: "pin-results", hidden: "" });

  const render = (matches) => {
    results.innerHTML = "";
    if (!matches.length) {
      results.hidden = true;
      return;
    }
    for (const match of matches) {
      const option = node("button", { type: "button", class: "pin-opt" }, [
        node("span", { class: "pf" }, [match.file]),
        node("span", { class: "ps" }, [match.sourceId]),
      ]);
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        results.hidden = true;
        input.value = "";
        pinTarget(match);
      });
      results.append(option);
    }
    results.hidden = false;
  };

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      render([]);
      return;
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = corpusFonts
      .filter((font) => {
        const haystack = `${font.file} ${font.sourceId}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 25);
    render(matches);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      results.hidden = true;
    }, 120);
  });

  return node("div", { class: "pin" }, [input, results]);
}

/** Score the reference against one chosen corpus font, then add it to the review and select it. */
async function pinTarget(match) {
  const data = resultsByFace[activeFace];
  if (!data) return;
  const existing = data.candidates.findIndex(
    (candidate) =>
      candidate.sourceId === match.sourceId && candidate.file === match.file,
  );
  if (existing >= 0) {
    selectCandidate(existing);
    return;
  }
  const ref = referenceByFace[activeFace];
  if (!ref) return;

  setStatus(`Comparing ${match.file}...`);
  try {
    const form = new FormData();
    if (ref.kind === "file") form.set("reference", ref.file);
    else form.set("referencePath", ref.path);
    if (ref.fontIndex !== undefined)
      form.set("referenceIndex", String(ref.fontIndex));
    form.set("model", data.model || model);
    form.set("runId", data.runId);
    form.set("sourceId", match.sourceId);
    form.set("file", match.file);
    const res = await fetch("/api/compare-target", {
      method: "POST",
      body: form,
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || "compare failed");

    const candidate = out.candidate;
    candidate.index = data.candidates.length;
    candidate.pinned = true;
    data.candidates.push(candidate);
    await loadFont(candidateFamily(data, candidate), candidate.url);
    selectCandidate(candidate.index);
    setStatus(
      `Pinned ${match.file} (${verdictOf(candidate.tier).label}). ${data.candidates.length} candidates in review.`,
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

function overlay(data, candidate, text) {
  const refFamily = referenceFamily(data);
  const candFamily = candidateFamily(data, candidate);
  const ref = referenceByFace[data.faceId];
  return node("div", { class: "overlay" }, [
    node("span", { class: "ref", style: fontStyle(refFamily, ref) }, [text]),
    node("span", { class: "cand", style: `font-family:"${candFamily}"` }, [
      text,
    ]),
  ]);
}

function glyphGrid(data, candidate) {
  const refFamily = referenceFamily(data);
  const candFamily = candidateFamily(data, candidate);
  const ref = referenceByFace[data.faceId];
  const grid = node("div", { class: "glyphgrid" });
  for (const glyph of GLYPHS) {
    grid.append(
      node("div", { class: "g" }, [
        node("span", { class: "ref", style: fontStyle(refFamily, ref) }, [
          glyph,
        ]),
        node("span", { class: "cand", style: `font-family:"${candFamily}"` }, [
          glyph,
        ]),
        node("label", {}, [codepoint(glyph)]),
      ]),
    );
  }
  return grid;
}

function renderFacebar() {
  return node("div", { class: "facebar" }, [
    node(
      "div",
      { class: "seg" },
      FACE_SLOTS.map((slot) =>
        node(
          "button",
          {
            type: "button",
            disabled: resultsByFace[slot.id] ? undefined : "",
            "aria-selected": slot.id === activeFace ? "true" : "false",
            "data-face": slot.id,
          },
          [slot.label],
        ),
      ),
    ),
  ]);
}

function selectCandidate(index) {
  const data = resultsByFace[activeFace];
  if (!data) return;
  const candidate = data.candidates[index];
  if (!candidate) return;

  selectedIndexByFace[activeFace] = index;
  const verdict = verdictOf(candidate.tier);
  const specimen = sampleInput.value.trim() || SPECIMEN;
  const refFamily = referenceFamily(data);
  const candFamily = candidateFamily(data, candidate);
  const ref = referenceByFace[data.faceId];

  const valueRow = (key, value) =>
    node("div", { class: "dr" }, [
      node("span", { class: "k" }, [key]),
      node("span", { class: "v" }, [value]),
    ]);

  const worst = candidate.worst.length
    ? candidate.worst.map((worstGlyph) =>
        node("span", { class: "w" }, [worstGlyph]),
      )
    : [node("span", { class: "fine" }, ["none over threshold"])];

  const flags = candidate.flags.length
    ? candidate.flags.map((flag) => node("span", { class: "flag" }, [flag]))
    : [node("span", { class: "fine" }, ["no feature gaps flagged"])];

  main.innerHTML = "";
  main.append(
    node("div", { class: "review-head" }, [
      node("div", { class: "review-pick" }, [
        node("div", { class: "section-label", style: "margin:0" }, [
          `${data.reference.name} · ${faceSlot(activeFace).label} · ${data.candidates.length} candidates`,
        ]),
        candidatePicker(data, index),
        pinSearch(),
      ]),
      node("span", { class: `badge ${verdict.cls}` }, [verdict.label]),
    ]),
    node("div", { class: "subline" }, [
      `${faceSlot(activeFace).label}. ${candidate.sourceId}. Closest by current metrics. Confirm by eye before trusting.`,
    ]),
    renderFacebar(),

    node("div", { class: "block" }, [
      node("p", { class: "section-label" }, ["Overlay"]),
      overlay(data, candidate, "Rg"),
      node("div", { class: "legend" }, [
        node("span", {
          html: '<i style="background:var(--diff-ref)"></i>reference',
        }),
        node("span", {
          html: '<i style="background:var(--diff-cand)"></i>candidate',
        }),
        node("span", { html: '<i style="background:#0b0d10"></i>overlap' }),
        node("span", {
          class: "grow",
          html: `advance mean <b>${candidate.mean}</b> / max <b>${candidate.max}</b>`,
        }),
      ]),
      node("div", { class: "samples" }, [
        node("div", { class: "s" }, [
          node("div", { class: "tag" }, ["reference"]),
          node("div", { class: "txt", style: fontStyle(refFamily, ref) }, [
            specimen,
          ]),
        ]),
        node("div", { class: "s" }, [
          node("div", { class: "tag" }, ["candidate"]),
          node("div", { class: "txt", style: `font-family:"${candFamily}"` }, [
            specimen,
          ]),
        ]),
      ]),
    ]),

    node("div", { class: "cols" }, [
      node("div", {}, [
        node("p", { class: "section-label" }, ["Glyph overlay"]),
        glyphGrid(data, candidate),
        node("p", { class: "section-label", style: "margin:18px 0 8px" }, [
          "Body sample - candidate",
        ]),
        node(
          "div",
          {
            class: "s",
            style: `font-family:"${candFamily}";font-size:19px;padding:12px 14px`,
          },
          [BODY],
        ),
      ]),
      node("div", {}, [
        node("p", { class: "section-label" }, ["Measurement"]),
        node("div", { class: "datarows" }, [
          valueRow("face", faceSlot(activeFace).label),
          valueRow("verdict", verdict.label),
          valueRow("advance mean", candidate.mean),
          valueRow("advance max", candidate.max),
          valueRow("advance coverage", candidate.coverage),
          valueRow("feature score", candidate.fscore),
          valueRow("feature coverage", candidate.fcov),
        ]),
        node("p", { class: "section-label", style: "margin:16px 0 8px" }, [
          "Feature flags",
        ]),
        node("div", { class: "worst" }, flags),
        node("p", { class: "section-label", style: "margin:16px 0 8px" }, [
          "Worst glyphs (full sample)",
        ]),
        node("div", { class: "worst" }, worst),
        node("p", { class: "section-label", style: "margin:16px 0 8px" }, [
          "Provenance",
        ]),
        node("div", { class: "datarows" }, [
          valueRow("source", candidate.sourceId),
          valueRow("method / date", "analytic_advance / today"),
        ]),
        node(
          "button",
          { class: "btn full", style: "margin-top:16px", type: "button" },
          ["Mark as selected fallback"],
        ),
        node("p", { class: "fine", style: "margin-top:9px" }, [
          "Needs visual review before it becomes a published row.",
        ]),
      ]),
    ]),
  );

  main.querySelectorAll(".facebar button").forEach((button) => {
    button.addEventListener("click", () => setActiveFace(button.dataset.face));
  });
  main.querySelector(".btn.full").addEventListener("click", () => {
    setStatus(
      `Selected ${faceSlot(activeFace).label}: ${candidate.file} (${verdict.label}). Recorded for review, not published.`,
    );
  });
}

function renderEmpty() {
  const ref = referenceByFace[activeFace];
  const message = ref
    ? "Run a comparison to populate this face."
    : "Load a real reference file for this face.";
  main.innerHTML = "";
  main.append(
    node("div", { class: "empty" }, [
      node("div", { class: "big" }, [
        `${faceSlot(activeFace).label} not measured`,
      ]),
      node("div", {}, [message]),
    ]),
  );
}

function renderActiveFace() {
  const data = resultsByFace[activeFace];
  if (!data?.candidates?.length) {
    renderEmpty();
    return;
  }
  const index =
    selectedIndexByFace[activeFace] >= 0 ? selectedIndexByFace[activeFace] : 0;
  selectCandidate(index);
}

async function loadResultFonts(faceId, data) {
  await loadFont(
    referenceFamily(data),
    data.reference.url,
    referenceByFace[faceId],
  );
  await Promise.all(
    data.candidates.map((candidate) =>
      loadFont(candidateFamily({ faceId }, candidate), candidate.url),
    ),
  );
}

async function compareFace(slot) {
  const ref = referenceByFace[slot.id];
  if (!ref) return null;

  const form = new FormData();
  if (ref.kind === "file") form.set("reference", ref.file);
  else form.set("referencePath", ref.path);
  if (ref.fontIndex !== undefined)
    form.set("referenceIndex", String(ref.fontIndex));
  form.set("limit", limitInput.value);
  form.set("model", model);
  form.set("sources", scopeSel.value);

  const res = await fetch("/api/compare", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "compare failed");
  data.faceId = slot.id;
  data.model = model;
  await loadResultFonts(slot.id, data);
  return data;
}

async function runCompare() {
  const loaded = FACE_SLOTS.filter((slot) => referenceByFace[slot.id]);
  if (loaded.length === 0) {
    setStatus("Load at least one real reference face.");
    return;
  }

  runButton.disabled = true;
  for (const slot of loaded) {
    faceStatus[slot.id] = "measuring";
    faceError[slot.id] = null;
    renderFaceSources();
    try {
      resultsByFace[slot.id] = await compareFace(slot);
      selectedIndexByFace[slot.id] = 0;
      faceStatus[slot.id] = null;
    } catch (error) {
      faceStatus[slot.id] = "failed";
      faceError[slot.id] =
        error instanceof Error ? error.message : String(error);
    }
    updateFaceControls();
    renderFaceSources();
  }
  if (!resultsByFace[activeFace]) {
    const done = loaded.find((slot) => resultsByFace[slot.id]);
    if (done) activeFace = done.id;
  }
  updateFaceControls();
  renderFaceSources();
  renderActiveFace();
  runButton.disabled = false;
}

el("choose").addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  loadSingleFile(file);
});

function selectDetectedFamily() {
  const query = detectedSel.value.trim().toLowerCase();
  if (!query) return;
  const family = families.find((entry) => entry.family.toLowerCase() === query);
  if (family) {
    loadFamily(family);
    return;
  }
  setStatus("Choose a family from the detected list.");
}

detectedSel.addEventListener("change", selectDetectedFamily);
detectedSel.addEventListener("keydown", (event) => {
  if (event.key === "Enter") selectDetectedFamily();
});

modelSeg.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    model = button.dataset.model;
    modelSeg.querySelectorAll("button").forEach((item) => {
      item.setAttribute("aria-selected", item === button ? "true" : "false");
    });
  });
});

faceSources.addEventListener("click", (event) => {
  const button = event.target.closest("[data-face]");
  if (button) setActiveFace(button.dataset.face);
});

runButton.addEventListener("click", runCompare);
sampleInput.addEventListener("input", () => {
  if (resultsByFace[activeFace]) renderActiveFace();
});

renderFaceSources();
updateFaceControls();
renderActiveFace();
loadSources();
loadDetected();
loadCorpusFonts();

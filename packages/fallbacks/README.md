# @docfonts/fallbacks

Document font substitution, measured.

Measured open-font fallbacks for proprietary document fonts. Use it to decide whether a requested document font can render with an open family you actually ship.

It ships no fonts and no proprietary binaries. It ships decisions: the recommended open family when one exists, the fidelity verdict, and the honest cases where no open family should be used.

## Install

```sh
npm install @docfonts/fallbacks
```

ESM-only. Use `import`, or let your bundler handle it. CommonJS `require()` is not supported.

## Render A Font

Use `getRenderableFallback` when you need one font family to render now. Pass `canRenderFamily` so docfonts only returns families your app can load.

```ts
import { getRenderableFallback } from "@docfonts/fallbacks";

const fallback = getRenderableFallback("Helvetica", {
  canRenderFamily: (family) => bundledFamilies.has(family),
});

// { substituteFamily: "Liberation Sans", policyAction: "substitute", verdict: "metric_safe", lineBreakSafe: true, evidenceId: "helvetica", generic: "sans-serif" }
```

The result is `null` when there is nothing renderable from your available assets. Use `getFallbackDecision` when you need to know why.

## Explain A Decision

Use `getFallbackDecision` for UI, diagnostics, and reporting. It distinguishes known fonts with no recommended fallback from fonts docfonts has never seen.

```ts
import { getFallbackDecision } from "@docfonts/fallbacks";

getFallbackDecision("Aptos");
// { kind: "customer_supplied", evidenceId: "aptos", generic: "sans-serif" }

getFallbackDecision("Tahoma");
// { kind: "no_recommended_fallback", evidenceId: "tahoma", generic: "sans-serif" }

getFallbackDecision("Made Up Font");
// { kind: "unknown" }

getFallbackDecision("Georgia", {
  canRenderFamily: (family) => bundledFamilies.has(family),
});
// { kind: "asset_missing", substituteFamily: "Gelasio", verdict: "near_metric", evidenceId: "georgia", generic: "serif" }
```

Decision kinds:

- `fallback` - render the returned `substituteFamily`.
- `asset_missing` - docfonts has a fallback, but your app does not load that family.
- `face_missing` - (face-aware lookups only) the family has a substitute, but not for the requested face. Route that face through your absence handling; do not substitute it.
- `no_recommended_fallback` - docfonts knows the font but recommends no renderable open family.
- `customer_supplied` - the real font should come from the customer or environment.
- `preserve_only` - keep the original family name. Do not substitute.
- `unknown` - docfonts has no evidence for this family.

## Create A Resolver Map

Use `createFallbackMap` when wiring a resolver. `canRenderFamily` is required because a resolver map must never point at fonts you cannot load.

```ts
import { createFallbackMap, normalizeFamilyName } from "@docfonts/fallbacks";

const map = createFallbackMap({
  canRenderFamily: (family) => bundledFamilies.has(family),
});

map[normalizeFamilyName("Times New Roman")]; // { substituteFamily: "Liberation Serif", ... }
```

Keys are normalized. Use `normalizeFamilyName` for lookups. Rows whose substitute family is not available are omitted. Each entry carries `faces`: a Regular-only entry is only safe in a **face-aware** resolver (one that checks `faces` or uses `getRenderableFallbackForFace`), since applying it to bold/italic would route a face the substitute does not provide.

## What the fields mean

- `substituteFamily` - the open family to render in place of the requested one.
- `policyAction` - what a renderer should do, not a quality claim. Use `verdict` for fidelity.
- `verdict` - the measured fidelity. Examples: `metric_safe`, `near_metric`, `cell_width_only`, `visual_only`.
- `lineBreakSafe` - true when advances preserve line breaks: `metric_safe`, `near_metric`, or monospace `cell_width_only`.
- `faces` - reviewed face coverage for this evidence row. If any face is `true`, respect it as face-scoped coverage (a row can be Regular-only). If all faces are `false`, the row is **not** face-scoped (e.g. a category fallback whose physical font does have faces) and the face-aware helpers treat it as renderable for any face.
- `evidenceId` - the stable id for the reviewed evidence row; look the full row up in `SUBSTITUTION_EVIDENCE`.
- `generic` - the logical font's broad CSS category (`serif`, `sans-serif`, or `monospace`), for a last-resort generic `font-family` keyword when no named substitute renders. Also present on the known (non-`unknown`) decision kinds.
- `glyphExceptions` - named glyph-level divergences that qualify this fallback (e.g. one codepoint reflows), or omitted when none. A family lookup carries all of the row's; a face lookup (`getRenderableFallbackForFace`) carries only that face's, so Cambria Regular shows none while Bold Italic shows its grave-accent exception.

`cell_width_only` keeps monospace advances stable, but glyph shapes can still differ. A `substitute` can still have a lower-fidelity `verdict` when one face or glyph is qualified. The verdict is the fidelity signal.

## Face-aware routing (Regular-only substitutes)

Some substitutes provide only some faces - e.g. Baskerville Old Face -> Bacasime Antique is Regular-only. The family-level helpers above answer "which family", and every result carries `faces`, so a resolver must route per-face. The face-aware helpers do it for you:

```ts
import { getRenderableFallbackForFace } from "@docfonts/fallbacks";
const opts = { canRenderFamily: (family) => bundledFamilies.has(family) };

getRenderableFallbackForFace("Baskerville Old Face", "regular", opts)?.substituteFamily; // "Bacasime Antique"
getRenderableFallbackForFace("Baskerville Old Face", "bold", opts);                       // null (Regular-only)
```

`getFallbackDecisionForFace(family, face, options)` reports the reason - `face_missing` when the substitute exists but lacks that face. A covered face carries its OWN verdict, not the family's worst-face rollup (e.g. `Cambria` regular is `metric_safe` even though the family rolls up to `visual_only`).

The full structured rows are exported as `SUBSTITUTION_EVIDENCE` for richer reporting (faces, per-face verdicts, glyph exceptions).

## Local tools

These maintainer tools use ignored `.cache` files and are not shipped in the package.

`bun run acquire` downloads open-font candidates into `.cache/sources`. Sources come in two shapes: zip archives and pinned source trees. Set `DOCFONTS_SOURCE_CACHE` to use another cache directory, or pass `--source google-fonts` to acquire one source.

`bun run compare` checks a private reference font against acquired OTF/TTF candidates and prints a ranked Latin advance-width table. It writes no fonts, paths, or results to the tree.

```sh
bun run --cwd packages/fallbacks compare -- \
  --reference /path/to/reference.ttf \
  --family "Bookman Old Style" \
  --source tex-gyre-bonum
```

- `--reference` (required) - path to the font to measure against.
- `--family` - a label shown in the report header.
- `--source` - restrict to one or more acquired source ids (repeat the flag or comma-separate). Defaults to every acquired source.

The comparison is a lead finder, not an automatic verdict. It measures Latin advance widths over a fixed sample and reports the tier, coverage, outlier counts, and worst glyphs for each candidate.

## Provenance

The data comes from reviewed docfonts evidence. Measurements are produced against licensed originals, but this package distributes no proprietary binaries or raw proprietary metrics.

Built by the team behind SuperDoc. Standalone and neutral.

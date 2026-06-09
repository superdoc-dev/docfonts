# @docfonts/fallbacks

Measured open-font fallbacks for proprietary document fonts.

The package ships decisions, not fonts: which open family to render when one is reviewed, how faithful it is, and when no open fallback should be used.

## Install

```sh
npm install @docfonts/fallbacks
```

ESM-only.

## Render a font

Use `getRenderableFallback` when you need one family to render now. Pass `canRenderFamily` so the result only includes fonts your app can load.

```ts
import { getRenderableFallback } from "@docfonts/fallbacks";

const fallback = getRenderableFallback("Helvetica", {
  canRenderFamily: (family) => bundledFamilies.has(family),
});
```

Returns `null` when docfonts has no renderable fallback from your available assets.

## Explain a decision

Use `getFallbackDecision` for UI, diagnostics, and reports.

```ts
import { getFallbackDecision } from "@docfonts/fallbacks";

getFallbackDecision("Aptos");
// { kind: "customer_supplied", evidenceId: "aptos", generic: "sans-serif" }

getFallbackDecision("Georgia", {
  canRenderFamily: (family) => bundledFamilies.has(family),
});
// { kind: "asset_missing", substituteFamily: "Gelasio", verdict: "near_metric", ... }
```

Important decision kinds:

- `fallback` - render `fallback.substituteFamily`.
- `asset_missing` - docfonts has a fallback, but your app does not load it.
- `face_missing` - the fallback does not provide the requested face.
- `customer_supplied`, `preserve_only`, or `no_recommended_fallback` - do not substitute.
- `unknown` - docfonts has no evidence for this family.

## Build a resolver map

Use `createFallbackMap` when wiring a resolver. `canRenderFamily` is required so the map never points at fonts you cannot load.

```ts
import { createFallbackMap, normalizeFamilyName } from "@docfonts/fallbacks";

const map = createFallbackMap({
  canRenderFamily: (family) => bundledFamilies.has(family),
});

map[normalizeFamilyName("Times New Roman")];
```

Some fallbacks are face-scoped. `faces` reports real face coverage. Use `getRenderableFallbackForFace` for styled text; a result may include `faceSource`, where `synthetic` means render from the indicated face and let your renderer synthesize the requested style.

## Fidelity fields

- `verdict` - measured fidelity, such as `metric_safe`, `near_metric`, `cell_width_only`, or `visual_only`.
- `lineBreakSafe` - true when advances preserve line breaks.
- `glyphExceptions` - named glyphs that can reflow.
- `advance.basis` - sample/model used for mean and max deltas, such as `latin_full`, `latin_text`, or `monospace_cell`.
- `generic` - CSS generic family for last-resort fallback.
- `evidenceId` - stable id for the reviewed evidence row.

`SUBSTITUTION_EVIDENCE` exposes the full reviewed rows for richer reporting.

## Provenance

Measurements are produced against licensed originals. This package distributes no proprietary binaries, raw proprietary metrics, or font files.

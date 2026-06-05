# @docfonts/fallbacks

Document font substitution, measured.

Measured open-font fallbacks for proprietary document fonts (Office / Word / DOCX), as a tiny runtime data package. Map a requested proprietary font to an open one without hand-copying tables, and without routing to a font you do not bundle.

It ships no fonts and no proprietary binaries: only the measured evidence - which open family stands in, the verdict, a stable evidence id - including the honest "no open font stands in."

## Install

```sh
npm install @docfonts/fallbacks
```

ESM-only (`"type": "module"`); import it, or let your bundler. CommonJS `require()` is not supported.

## Three things you might want

```ts
// 1. I need a family to render right now (only ever a font you bundle, or null):
import { getRenderableFallback } from "@docfonts/fallbacks";
getRenderableFallback("Helvetica", { canRenderFamily: (f) => bundled.has(f) });
// { substituteFamily: "Liberation Sans", policyAction: "substitute", verdict: "metric_safe", lineBreakSafe: true, evidenceId: "helvetica" }
```

```ts
// 2. I need to explain the decision (UI, diagnostics, reporting) - a discriminated union:
import { getFallbackDecision } from "@docfonts/fallbacks";
getFallbackDecision("Aptos");            // { kind: "customer_supplied", evidenceId: "aptos" }
getFallbackDecision("Tahoma");           // { kind: "no_recommended_fallback", evidenceId: "tahoma" }
getFallbackDecision("Made Up Font");     // { kind: "unknown" }
getFallbackDecision("Georgia", { canRenderFamily: (f) => bundled.has(f) });
// not bundled -> { kind: "asset_missing", substituteFamily: "Gelasio", verdict: "near_metric", evidenceId: "georgia" }
```

This is the point of the package: a measured "no open font stands in" (Aptos) is a real answer, and it is **not** the same as a font docfonts never heard of (`unknown`). The `kind`s are `fallback`, `asset_missing`, `no_recommended_fallback`, `customer_supplied`, `preserve_only`, `unknown`.

```ts
// 3. I need a resolver map. `canRenderFamily` is required - the map only holds fonts you can render:
import { createFallbackMap, normalizeFamilyName } from "@docfonts/fallbacks";
const map = createFallbackMap({ canRenderFamily: (f) => bundled.has(f) });
map[normalizeFamilyName("Times New Roman")]; // { substituteFamily: "Liberation Serif", ... }
```

Keys are normalized (lowercased, quote-stripped); look up with `normalizeFamilyName`. Rows whose family you do not bundle are left out, never routed to a missing asset.

## What the fields mean

- `substituteFamily` - the open family to render in place of the requested one.
- `policyAction` - what a renderer should do, not a quality claim: `substitute` renders the named open family, `category_fallback` renders a lower-fidelity same-category family. A `substitute` can still be top-level `visual_only` (e.g. Cambria); use `verdict` for fidelity.
- `verdict` - the measured fidelity, from a fixed taxonomy (`metric_safe`, `near_metric`, `cell_width_only`, `visual_only`, ...). The headline rolls up to the worst face.
- `lineBreakSafe` - true when advances preserve line breaks: `metric_safe`, `near_metric`, or monospace `cell_width_only`. Not a claim of an exact clone (`cell_width_only` keeps advances but not glyph shapes); read `verdict` for the tier.
- `evidenceId` - the stable id for the reviewed evidence row; look the full row up in `SUBSTITUTION_EVIDENCE`.

The full structured rows are exported as `SUBSTITUTION_EVIDENCE` (faces, per-face verdicts, glyph exceptions) for richer reporting. Face-level routing stays yours: these answer "which family", not "which face".

## Provenance

The data comes from reviewed docfonts evidence. Measurements are produced against licensed originals, but this package distributes no proprietary binaries or raw proprietary metrics.

Built by the team behind SuperDoc. Standalone and neutral.

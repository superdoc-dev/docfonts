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

// { substituteFamily: "Liberation Sans", policyAction: "substitute", verdict: "metric_safe", lineBreakSafe: true, evidenceId: "helvetica" }
```

The result is `null` when there is nothing renderable from your available assets. Use `getFallbackDecision` when you need to know why.

## Explain A Decision

Use `getFallbackDecision` for UI, diagnostics, and reporting. It distinguishes known fonts with no recommended fallback from fonts docfonts has never seen.

```ts
import { getFallbackDecision } from "@docfonts/fallbacks";

getFallbackDecision("Aptos");
// { kind: "customer_supplied", evidenceId: "aptos" }

getFallbackDecision("Tahoma");
// { kind: "no_recommended_fallback", evidenceId: "tahoma" }

getFallbackDecision("Made Up Font");
// { kind: "unknown" }

getFallbackDecision("Georgia", {
  canRenderFamily: (family) => bundledFamilies.has(family),
});
// { kind: "asset_missing", substituteFamily: "Gelasio", verdict: "near_metric", evidenceId: "georgia" }
```

Decision kinds:

- `fallback` - render the returned `substituteFamily`.
- `asset_missing` - docfonts has a fallback, but your app does not load that family.
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

Keys are normalized. Use `normalizeFamilyName` for lookups. Rows whose substitute family is not available are omitted.

## What the fields mean

- `substituteFamily` - the open family to render in place of the requested one.
- `policyAction` - what a renderer should do, not a quality claim. Use `verdict` for fidelity.
- `verdict` - the measured fidelity. Examples: `metric_safe`, `near_metric`, `cell_width_only`, `visual_only`.
- `lineBreakSafe` - true when advances preserve line breaks: `metric_safe`, `near_metric`, or monospace `cell_width_only`.
- `evidenceId` - the stable id for the reviewed evidence row; look the full row up in `SUBSTITUTION_EVIDENCE`.

`cell_width_only` keeps monospace advances stable, but glyph shapes can still differ. A `substitute` can still have a lower-fidelity `verdict` when one face or glyph is qualified. The verdict is the fidelity signal.

The full structured rows are exported as `SUBSTITUTION_EVIDENCE` for richer reporting, including faces, per-face verdicts, and glyph exceptions. Face-level routing stays yours: these helpers answer "which family", not "which face".

## Provenance

The data comes from reviewed docfonts evidence. Measurements are produced against licensed originals, but this package distributes no proprietary binaries or raw proprietary metrics.

Built by the team behind SuperDoc. Standalone and neutral.

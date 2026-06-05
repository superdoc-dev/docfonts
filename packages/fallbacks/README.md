# @docfonts/fallbacks

Document font substitution, measured.

Measured open-font fallbacks for proprietary document fonts (Office / Word / DOCX), as a tiny runtime data package. It carries the structured substitution evidence plus one asset-aware lookup, so a renderer can map a requested proprietary font to an open one without hand-copying tables, and without routing to a font it does not bundle.

It ships no fonts and no proprietary binaries: only the measured evidence (which open family stands in, the verdict, the advance delta, the license id, and a stable evidence id).

## Install

```sh
npm install @docfonts/fallbacks
```

## Usage

`getFallback` answers "what does docfonts recommend for this family?". Pass `hasFamily` to keep it to fonts you actually bundle:

```ts
import { getFallback } from "@docfonts/fallbacks";

getFallback("Helvetica", { hasFamily: (f) => bundled.has(f) });
// { family: "Liberation Sans", action: "substitute", verdict: "metric_safe", faithful: true, evidenceId: "helvetica" }
```

`deriveFallbackMap` builds the substitute map you wire into a resolver. `hasFamily` is required here: a render map never includes a substitute whose font you cannot load.

```ts
import { deriveFallbackMap } from "@docfonts/fallbacks";

const map = deriveFallbackMap({ hasFamily: (f) => bundled.has(f) });
// { helvetica: { family: "Liberation Sans", ... }, calibri: { ... }, ... }
// Rows whose family you do not bundle are left out, not routed to a missing asset.
```

Both resolve to `null` (or omit the row) when docfonts has no row, the recommendation is "no open font stands in", or you do not ship the physical family.

## What the fields mean

- `family` - the open family to render in place of the requested one.
- `action` - `substitute` (a measured metric match) or `category_fallback` (right letterforms, lower fidelity).
- `verdict` - the measured fidelity, from a fixed taxonomy (`metric_safe`, `near_metric`, `cell_width_only`, `visual_only`, ...). The headline rolls up to the worst face.
- `faithful` - a coarse "good enough for line-break fidelity" flag (`metric_safe` or `near_metric`). Not a claim of an exact clone; read `verdict` for the tier.
- `evidenceId` - the stable id for the reviewed evidence row.

The full structured rows are exported as `SUBSTITUTION_EVIDENCE` (faces, per-face verdicts, glyph exceptions) for richer reporting. Face-level routing stays yours: `getFallback` answers "which family", not "which face".

## Provenance

The data comes from reviewed docfonts evidence. Measurements are produced against licensed originals,
but this package distributes no proprietary binaries or raw proprietary metrics.

Built by the team behind SuperDoc. Standalone and neutral.

## License

MIT

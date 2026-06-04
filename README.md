# docfonts

> Measured open substitutes for proprietary document fonts - with proof, provenance, face coverage, and a fallback verdict.

docfonts is an open, evidence-backed registry of which open fonts can stand in for proprietary
document fonts (Office / Word / DOCX), and how faithfully. Every entry is measured, not folklore:
advance deltas, face coverage (regular / bold / italic / bold-italic), license provenance, and a
verdict (metric-safe / cell-width-only / visual-only / customer-supplied / preserve-only /
no-substitute).

Built by the team behind SuperDoc. Standalone and neutral - useful to any document renderer, PDF
generator, or web app that needs document-fidelity font fallback.

## Why

Existing substitution lists (fontconfig metric-aliases, distro wikis, the LibreOffice replacement
table) assert pairs without published measurement, face coverage, or negative verdicts - and some are
wrong (e.g. Consolas -> Inconsolata is cell-width-only, with no italic face). docfonts publishes the
measured truth, including the honest "no open substitute found" results.

## What's here (v1)

- A static registry with one canonical page per proprietary font (`/fonts/<font>`), generated from
  `packages/registry`.
- A client-side DOCX font scanner (`/tools/scan-docx-fonts`) - runs in the browser, never uploads.
- A `docfonts` CLI: `compare <proprietary.ttf> <open.ttf>` and `scan-docx-fonts <file.docx>`.

No proprietary font binaries are distributed, ever. Measurements against proprietary originals are
reproduced locally against your own legally installed fonts (the BYO model).

## Structure

- `packages/registry` - canonical evidence records + query helpers (the source of truth).
- `packages/core` - scoring, verdicts, shared types (pure; no I/O).
- `packages/font-metadata` - SFNT parser (cmap / hmtx / metrics). Knows fonts, not DOCX, not scoring.
- `packages/docx-fonts` - DOCX font-declaration parsing (theme / rFonts). Knows DOCX, not scoring.
- `apps/site` - docfonts.dev (static pages + client-side scanner).
- `apps/cli` - the `docfonts` CLI.
- `scripts/` - one-way import from the font-fidelity-research repo; static site-data generation.

Boundary rule: apps consume packages only; no business logic lives in apps.

## Dev

```
bun install
bun run dev         # apps/site
bun run typecheck
bun run lint
bun test
```

Status: scaffold (v1 = static registry + client-side scanner + CLI; no API / MCP / DB / hosted font
downloads yet). See `STATE.md` for the plan and decisions.

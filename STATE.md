# docfonts - STATE

Live tracker for docfonts, an open satellite product in the SuperDoc orbit (alongside docx-corpus,
docx-tools, ooxml-dev). Read this first on resume.

## What it is (the narrow claim)

> Measured open substitutes for proprietary document fonts - with proof, provenance, face coverage,
> and a fallback verdict.

NOT "an open-source font product" and NOT "solving font issues for companies" (too broad - that space
is FontBakery (QA), HarfBuzz (shaping), fontkit/opentype.js (parsing), Fontsource/Fontist
(distribution), Fontaine (CSS fallback metrics)). docfonts owns ONE thing: the measured, honest answer
to "which open font can stand in for this proprietary document font, and how faithfully."

## Why it exists (verified gap, 2026-06-04)

What exists today is alias lists, distro configs, wiki pages, and font-QA tools - not measured
evidence. fontconfig `30-metric-aliases.conf`, the ArchWiki list, the LibreOffice replacement table,
and Wikipedia assert pairs with no published advance measurement, no face-coverage table, no live
layout proof, and no negative verdicts. Receipt: the LibreOffice table lists Consolas -> Inconsolata,
but measurement shows it is cell-width-only with NO italic face. No direct competitor (a measured,
document-fidelity substitution registry) was found.

## Decisions finalized (2026-06-04)

- **Name: docfonts.** Brand domain **docfonts.dev** (matches ooxml.dev). Buy **docfonts.com** +
  **docfonts.org** defensively (all available). Skip **docfonts.io** (.io ~$35 yr1 / ~$66 renewal, not
  worth it). Skipped names: metricfonts (over-claims metric; negatives are half the value),
  fontfallback (reads as CSS/CLS tooling - wrong category), fontproof/fontmatch (type-design /
  font-ID collisions, both verified). fontverdict was a near-miss; docfonts is the more durable brand.
- **No redirect EMDs for SEO.** Buying fontsubstitution.dev / docxfonts.dev / missingfonts.dev to
  redirect does NOT capture search intent - Google's EMD update + "keywords in domain/path have hardly
  any effect"; a fresh redirected domain passes ~zero equity, only the destination page ranks. Buy
  redirect domains only for defense/brand/recall, not SEO. The SEO is 100% on-site pages + the tool.
- **SEO model: one canonical page per PROPRIETARY font** (`/fonts/calibri`, `/fonts/aptos`), NOT split
  `/fonts/X` and `/pairs/X-Y` (keyword cannibalization). People search the proprietary name. Put the
  substitute(s) + verdict on the font page. Page titles carry the search terms.
- **Best funnel asset: the client-side DOCX scanner** (`/tools/scan-docx-fonts`) - parses in-browser,
  never uploads (privacy + BYO ethos + backlink magnet + natural SuperDoc CTA).
- **SuperDoc claim stays honest.** Say "Built by the team behind SuperDoc" / "the measured evidence
  behind SuperDoc's font fallback". Do NOT say "used by SuperDoc's resolver" until the resolver
  actually consumes the registry (a real future integration, not done yet).
- **Legal (carried):** publish the METHOD + open-candidate provenance + deltas/verdicts/oracle-env;
  do NOT publish raw proprietary advance tables until legal approves (EULA-derived). Reproduce oracle
  numbers with your OWN legally installed proprietary fonts. Never distribute proprietary binaries.
- **v1 scope:** static registry + client-side scanner + CLI. NO API / MCP / DB / hosted font
  downloads. Start minimal; build on top as needed.
- **Brand (full system in `brand.md`, generated 2026-06-04).** Endorsed product brand inheriting from
  the SuperDoc master brand (`../brand.md`); sparse file - unset sections inherit. Archetype: **The
  Metrologist** (calm measurement authority, skeptical spine; "instrumentation, not litigation").
  Tagline **"Document font substitution, measured"** (anchored on *substitution* not *substitutes* so
  the negative verdict stays in scope). Hero leads measured-vs-folklore, sharpened by the honest "no,"
  Aptos as first featured verdict (scoped to method+date). Visual is its OWN system, not inherited:
  warm specimen-sheet paper + ink, Calibration Teal `#0F766E` accent (NOT SuperDoc Blue), and the
  verdict taxonomy as a semantic color system (metric-safe green / cell-width amber / no-substitute
  clay). SuperDoc Blue reserved only for the "Built by SuperDoc" mark. Keeps Inter + JetBrains Mono
  (open fonts, orbit kinship; mono for all measured values). Copy discipline: scope negatives to
  method+date; describe the category (alias lists, configs, QA/distribution tools) by what it is, never
  as "wrong."

## Scaffold (done 2026-06-04)

Bun monorepo mirroring the sibling conventions (Bun workspaces, Biome 2.4.7, bunfig, `@scope/name`
packages with `main/types = src/index.ts`, root tsconfig paths). Committed + pushed:
**github.com/superdoc-dev/doc-fonts** (branch `main`, as caio-pizzol; first commit a809925). Note: the
GitHub repo slug is `doc-fonts` (hyphen) while the package/brand/domain is `docfonts` (docfonts.dev).

```
docfonts/
  apps/
    site/        # docfonts.dev - static pages + client-side scanner (stub; Bun+React+prerender, per docx-tools/apps/web)
    cli/         # `docfonts compare` + `docfonts scan-docx-fonts` (stub)
  packages/
    registry/    # canonical evidence records + query helpers (source of truth) -> imports core
    core/        # scoring, verdicts, shared types (pure)
    font-metadata/ # SFNT parser (cmap/hmtx/metrics) - knows fonts, not DOCX, not scoring
    docx-fonts/  # DOCX font-declaration parsing - knows DOCX, not scoring
  scripts/       # import-research.ts (one-way from font-fidelity-research), generate-site-data.ts
  tests/fixtures/{docx,fonts}/   # OPEN fonts only; never proprietary
  package.json bunfig.toml biome.json tsconfig.json .gitignore README.md brand.md STATE.md
```

Boundary rule (enforced by header docs + tsconfig paths): apps consume packages only; font-metadata
and docx-fonts never import core; registry may import core; nothing parses + scores in the same layer.

## Seed source

Productizes the existing evidence engine in `../font-fidelity-research` (SFNT parser
`harness/scripts/font-metadata.js`, the similarity harness, the Word-oracle method, the reconciled
catalog, the proofs, the open-font source inventory). Marginal cost is package + site + cadence, not
build-from-scratch.

Seed records to import (with provenance + verdicts): the 5 shipped clones (Calibri->Carlito etc.);
Georgia->Gelasio, Arial Narrow->Liberation Sans Narrow (layout-proven, legal pending);
Baskerville Old Face->Bacasime, Cooper Black->Caprasimo (DocRepair, Regular-only, legal pending);
cell-width-only Lucida Console->Cousine, Consolas->Inconsolata; measured no-substitute Aptos/Verdana/
Tahoma/Trebuchet MS/Comic Sans/Candara/Constantia/Corbel; TeX Gyre leads Schola->Century Schoolbook,
Bonum->Bookman (GUST license, legal review).

## Next steps (build on top, in order)

1. DONE (commit 68b0b6d): browser-safe TS port of `font-metadata.js` -> `packages/font-metadata`,
   with golden parity tests vs the JS parser (8 open fixtures + license texts). Follow-up: add
   independent spec-behavior tests (not only parity) so we are not locked to old quirks forever.
2. Implement `scripts/import-research.ts` -> seed `packages/registry` records.
3. `packages/core` scoring/verdict logic from the catalog rules.
4. `packages/docx-fonts` scanner; wire `apps/cli`.
5. `apps/site`: per-proprietary-font pages + guides + the client-side scanner, generated from registry.
6. Buy docfonts.dev (+ .com/.org). (Baseline already committed + pushed to superdoc-dev/doc-fonts.)

## Out of scope (explicit)

Shipping a fallback font library; solving every font; web-perf/CLS metrics (Fontaine); distribution
(Fontsource/Fontist); CJK/symbol/math substitution; font QA (FontBakery); API/MCP/DB in v1.

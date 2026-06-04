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
packages with `main/types = src/index.ts`, root tsconfig paths). Repo:
**github.com/superdoc-dev/docfonts** (branch `main`, as caio-pizzol; first commit a809925). The repo
was renamed from `doc-fonts` to `docfonts`, so the slug now matches the package / brand / domain.

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

1. DONE: browser-safe TS port of `font-metadata.js` -> `packages/font-metadata` (68b0b6d) with golden
   parity tests, PLUS independent SFNT-contract spec-behavior tests (1e9ac32) so we are not locked to
   the old parser's quirks. 8 open fixtures + real license texts under `tests/fixtures/fonts/licenses/`.
2. PARTIAL: 9 REAL seed records from font-fidelity-research (scorecard 2026-06-03 + decision-catalog):
   7 metric_safe clones (Calibri/Carlito 0.00/0.00 ... Cambria/Caladea 0.01/0.05), Comic Sans/Comic
   Neue visual_only (9.73/13.84), Aptos no_substitute ("no open metric clone"; closest Source Sans 3
   is visual fallback only). **HAZARD: `data/registry/records.json` is committed as `[]` and reverts
   to `[]` every turn** (an external process rewrites it; my edits to it do not persist). So the
   durable home for the seed is `packages/registry/src/seed.ts` (typed `EvidenceRecord[]`, so it is
   validated at COMPILE time - stronger than the schema, which accepts `[]`). `loadRecords()` prefers
   records.json when non-empty, else falls back to `SEED_RECORDS`, so a fresh build reproduces the
   full site from saved source regardless of the reset. Regression guard: `packages/registry/
   records.test.ts` fails if `loadRecords()` is empty / missing key records (calibri, aptos). All 9
   pass `validateRecords` (`{ok:true}`). To make records.json itself durable, COMMIT it (or implement
   import-research.ts). STILL TODO: `scripts/import-research.ts` to regenerate records.json from corpus
   + measurements (the proof-layer measurement JSONs are not written; records reference IDs only).
   Note: patched two files left stale by a concurrent registry refactor (resolverAction->policyAction):
   `schema.test.ts` fixture + a cast in `schema.ts` - reconcile with whoever owns that refactor.
3. `packages/core` scoring/verdict logic from the catalog rules.
4. `packages/docx-fonts` scanner; wire `apps/cli`. (Scanner UI shell exists in the site; parser stub.)
5. PARTIAL: `apps/site` is now **Astro 6 + Bun, static output, Cloudflare Pages** (NOT the old
   Bun+React+prerender note). Builds 11 static pages from the registry: homepage (hero, featured
   no-substitute, measured-pass specimen, registry table, six-verdict legend), `/fonts/[font].astro`
   via `getStaticPaths` (one page per proprietary font = the SEO surface), `/tools/scan-docx-fonts`
   (in-browser, never-uploads stub). UI fonts self-hosted via Fontsource (Inter + JetBrains Mono);
   NO substitute webfonts (not a webfont host) - substitute specimens become build-time images later.
   No SSR adapter (add @astrojs/cloudflare only when a route needs SSR). CF Pages build: root dir =
   repo root, build = `bun run --cwd apps/site build`, output = `apps/site/dist` (see apps/site/README).
   STILL TODO: guides pages, real scanner parse (wire @docfonts/docx-fonts), build-time specimens.
   Verified THIS turn from saved source (records.json = []): fresh `bun run --cwd apps/site build` =
   **11 pages** (9 `/fonts/<font>` incl. calibri, via seed fallback), `bun run typecheck` clean,
   `bun test` = 39 pass, `bun run lint` clean. Not committed yet (user's call).
6. Buy docfonts.dev (+ .com/.org) if not already purchased. (Repo: superdoc-dev/docfonts.)

Brand/design system from the mockups (`mockups/`, gitignored from biome) is now codified in
`apps/site/src/styles/tokens.css` + `src/lib/verdict.ts` (the six-verdict color+glyph system). The
homepage is the consolidated "A1 specimen + measured-pass" direction with real measured numbers.

## Out of scope (explicit)

Shipping a fallback font library; solving every font; web-perf/CLS metrics (Fontaine); distribution
(Fontsource/Fontist); CJK/symbol/math substitution; font QA (FontBakery); API/MCP/DB in v1.

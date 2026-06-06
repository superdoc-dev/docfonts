# docfonts

[![npm version](https://img.shields.io/npm/v/@docfonts/fallbacks.svg)](https://www.npmjs.com/package/@docfonts/fallbacks)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Document font substitution, measured.

docfonts publishes `@docfonts/fallbacks`, a small runtime package for document renderers.
It maps common proprietary document fonts to reviewed open-font fallback decisions.

The package ships no font binaries and no proprietary data. It contains a public evidence snapshot,
asset-aware lookup helpers, and tests that prove the npm package only includes supported runtime files.

Built by the team behind [SuperDoc](https://github.com/superdoc-dev/superdoc). Standalone and neutral.

## Package

- `packages/fallbacks` - runtime fallback decisions and lookup helpers.

## Source backlog

`packages/fallbacks/sources.json` tracks open-font projects we may measure next. It is public
provenance only, not a recommendation and not shipped in the npm package. The first entries cover TeX
Gyre, the maintained open extension of the URW++ Base 35 set: Termes, Heros, Bonum, Schola, Pagella,
Adventor, Cursor, and Chorus. A candidate only becomes fallback data after measurement and review.

## API

- `getRenderableFallback` - returns the open family to render, or `null` when none is renderable.
- `getFallbackDecision` - explains the outcome for UI, diagnostics, and reporting.
- `createFallbackMap` - builds a resolver map from only the font families you can render.
- `normalizeFamilyName` - normalizes map lookup keys.

## Install

```sh
npm install @docfonts/fallbacks
```

## Dev

```sh
bun install
bun run typecheck
bun run test
bun run lint
bun run build
```

## Release

`@docfonts/fallbacks` is released by the `release-fallbacks` workflow on every push to `main`.
semantic-release publishes a new version when the merged commits contain a releasable Conventional Commit.
The same workflow can still run manually as a dry run.

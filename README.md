# docfonts

> Document font substitution, measured.

This public repository currently publishes `@docfonts/fallbacks`: a small runtime package that maps
common proprietary document fonts to measured open-font fallbacks.

The package ships no font binaries and no proprietary data. It contains a reviewed evidence snapshot,
runtime lookup helpers, and tests that prove the npm tarball excludes research data, local paths, and
oracle-environment labels.

Built by the team behind SuperDoc. Standalone and neutral.

## Package

- `packages/fallbacks` - runtime fallback evidence and lookup helpers.

Everything else used to build, measure, or review the evidence stays outside the tracked public tree
until it is ready to be documented and supported as public source.

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

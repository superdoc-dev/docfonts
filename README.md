# docfonts

[![npm version](https://img.shields.io/npm/v/@docfonts/fallbacks.svg)](https://www.npmjs.com/package/@docfonts/fallbacks)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Document font substitution, measured.

docfonts publishes `@docfonts/fallbacks`, a small runtime package for document renderers.
It maps common proprietary document fonts to reviewed open-font fallback decisions. It ships no font binaries and no proprietary data.

Built by the team behind [SuperDoc](https://github.com/superdoc-dev/superdoc). Standalone and neutral.

## Structure

- `packages/fallbacks` - runtime fallback decisions and lookup helpers.
- `tools/corpus` - local source acquisition and comparison tools.

## Use

- Runtime: install `@docfonts/fallbacks` and call the lookup helpers.
- Acquire: run `bun run corpus:acquire` to download open-font sources into an ignored local cache.
- Compare: run `bun run corpus:compare` to rank acquired open fonts against a licensed local
  reference. Results stay local unless deliberately published through a curated product surface.

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

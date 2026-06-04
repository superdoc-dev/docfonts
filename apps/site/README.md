# @docfonts/site

docfonts.dev - the static, registry-driven site. Astro + Bun, static output, deployed on
Cloudflare Pages.

## Architecture

- **Static-first.** `output: "static"` in `astro.config.mjs`. No SSR adapter in v1: the build emits
  plain HTML/CSS/JS to `dist/`, and Cloudflare Pages serves it. Add `@astrojs/cloudflare` only when a
  route genuinely needs server rendering, actions, sessions, or Cloudflare runtime features.
- **Registry-driven.** Pages read measured verdicts from `@docfonts/registry` (`loadRecords()`).
  `src/pages/fonts/[font].astro` generates one canonical static page per proprietary font via
  `getStaticPaths` - the SEO surface. People search the proprietary name, so the title carries it.
- **Islands stay opt-in.** `@astrojs/react` is installed for future interactive components, but the
  homepage and font pages ship zero JS. The scanner uses a small vanilla `<script>`.
- **Fonts are self-hosted** (Fontsource: Inter + JetBrains Mono). docfonts is not a webfont host -
  no CDN, and no substitute webfonts are loaded. Substitute specimens will become build-time images;
  any live substitute face would be a deliberate, documented exception.
- **Scanner is in-browser.** `src/pages/tools/scan-docx-fonts.astro` reads the `.docx` locally and
  never uploads. Parsing is wired to `@docfonts/docx-fonts` (currently a stub).

## Develop

```
bun install            # from repo root
bun run --cwd apps/site dev
bun run --cwd apps/site build      # -> apps/site/dist
bun run --cwd apps/site preview
```

## Deploy (Cloudflare Pages)

This is a Bun monorepo, so set the build explicitly rather than relying on framework auto-detection:

| Setting | Value |
|---|---|
| Root directory | repo root (`/`) |
| Build command | `bun run --cwd apps/site build` |
| Build output directory | `apps/site/dist` |

Cloudflare Pages detects Bun from `bun.lock`. No `wrangler.toml` is needed for a static Pages
project. (If this later moves to Workers static assets, that config points `assets.directory` at
`apps/site/dist`.)

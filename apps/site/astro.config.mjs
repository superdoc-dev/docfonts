// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// docfonts.dev - static-first. No SSR adapter in v1 (Cloudflare Pages serves the built ./dist).
// Add @astrojs/cloudflare only when a route genuinely needs server rendering / runtime features.
export default defineConfig({
  site: "https://docfonts.dev",
  output: "static",
  // The scanner is the only interactive surface; React islands stay opt-in per-component.
  integrations: [react()],
  vite: {
    ssr: {
      // Workspace packages ship TypeScript source (main = src/index.ts); let Vite transpile them
      // instead of externalizing to Node, which cannot run .ts directly.
      noExternal: [/^@docfonts\//],
    },
  },
});

import type { GitHubTreeSource } from "./types";

const GOOGLE_FONTS_COMMIT = "c89741abbf4eeabce432c3ed2fd7dc28b022701e";

export const GOOGLE_FONT_SOURCES: GitHubTreeSource[] = [
  {
    kind: "github-tree",
    sourceId: "google-fonts",
    family: "Google Fonts",
    project: "Google Fonts",
    repo: "google/fonts",
    commit: GOOGLE_FONTS_COMMIT,
    licenseDirs: {
      apache: "Apache-2.0",
      ofl: "OFL-1.1",
      ufl: "UFL-1.0",
    },
    targetFamilies: ["Document font discovery"],
  },
];

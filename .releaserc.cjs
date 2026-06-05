const releaseNotesApiKey = process.env.ANTHROPIC_API_KEY_RELEASE_NOTES;

if (releaseNotesApiKey && !process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = releaseNotesApiKey;
}

const notesPlugin = releaseNotesApiKey
  ? [
      "semantic-release-ai-notes",
      {
        model: "claude-haiku-4-5",
        style: "concise",
        maxTurns: 15,
        systemPromptAdditions:
          "Never use em dashes. Use hyphens, periods, or colons.",
      },
    ]
  : "@semantic-release/release-notes-generator";

module.exports = {
  branches: ["main"],
  tagFormat: `v\${version}`,
  plugins: [
    "@semantic-release/commit-analyzer",
    notesPlugin,
    [
      "@semantic-release/npm",
      {
        pkgRoot: "packages/fallbacks",
      },
    ],
    [
      "@semantic-release/github",
      {
        successComment: false,
        failComment: false,
      },
    ],
  ],
};

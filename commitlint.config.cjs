/**
 * Conventional Commits, enforced on commit-msg by lefthook. The scope is deliberate in this monorepo:
 * semantic-release is NOT path-aware, so the commit SCOPE is how a change signals which package it
 * affects. Release-producing scopes are `fallbacks` and `registry` (the latter only when it changes the
 * exported substitution evidence); `docs`, `site`, `discovery`, `bakeoff`, `corpus`, `ci`, and `chore`
 * are non-release. See .releaserc.json.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
};

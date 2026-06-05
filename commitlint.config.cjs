/**
 * Conventional Commits, enforced on commit-msg by lefthook. Uses the default config-conventional rules
 * (feat / fix / chore / docs / refactor / test / ci / ...). Releases are computed by semantic-release
 * from these commits with the default commit convention; the release workflow is manual, so scope is a
 * readability aid, not a release filter.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
};

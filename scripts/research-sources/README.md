# research sources (vendored reference snapshots, public-safe)

Committed snapshots of the structured research artifacts that originally seeded the registry. They
used to live only in a sibling repo that is not part of this public project; vendoring them here keeps
the provenance inspectable inside the repo.

| File | What |
|---|---|
| `STATUS.csv` | Per-font gate authority (static / metric / layout / ship) + status + a public note. |
| `apryse-font-fallback-summary-2026-06-04.csv` | One-best advance delta + license per Apryse toolbar font (coarse). |
| `similarity-scorecard-2026-06-03.csv` | Per-candidate advance/coverage for the curated visual bakeoffs. |

**Reference only - NOT the registry's source of truth.** `data/registry/records.json` is hand-curated
and is deliberately MORE honest than these snapshots can reproduce. Several curated verdicts rest on
face-scoped and runner-measured evidence the coarse summaries here do not carry: Cambria is
`visual_only` (a face diverges ~23%), Georgia is `near_metric` (1.84%), and Arial Narrow is
`visual_only` (~50%) - yet the apryse summary rounds all three to "metric-safe". `scripts/import-research.ts`
reads these for reference and runs as a dry run; it is intentionally NOT wired into CI, because
regenerating from them would overclaim those rows. See that script's header for the full rationale.

**Public-safe.** This repo ships to public GitHub. These snapshots are sanitized: internal
product-process wording, cross-repo PR references, internal artifact filenames, and internal ticket
IDs are removed or generalized. `scripts/research-sources.test.ts` fails the build if a disallowed
marker (Slack/dashboard/SSO URLs, cross-repo `PR #` refs, `SD-`/`IT-` ticket IDs, etc.) reappears here
or in the committed registry notes. Customer names and free-form internal prose still need human review.

**Snapshots, not a live feed.** Dates in the filenames are the measurement run, not the vendor date.
Refreshing them is a manual, reviewed step.

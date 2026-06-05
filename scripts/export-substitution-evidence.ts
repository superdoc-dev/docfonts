#!/usr/bin/env bun
/**
 * export-substitution-evidence.ts - regenerate the PUBLIC renderer-facing artifact
 * data/registry/substitution-evidence.json from the canonical records (loadRecords). This is docfonts
 * acting as the UPSTREAM producer: a consumer (SuperDoc, a PDF generator, ...) vendors this JSON instead
 * of hand-copying EvidenceRecords, so its substitute map stays reproducible from the reviewed registry.
 *
 * The projection is pure (see toSubstitutionEvidence): it drops the records' editorial prose and
 * provenance labels and keeps only the structured renderer fields. An export.test asserts the committed
 * file equals a fresh export, so a stale artifact fails CI.
 *
 * Run:  bun run scripts/export-substitution-evidence.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportSubstitutionEvidence, loadRecords } from "@docfonts/registry";

const OUT = join(
  import.meta.dir,
  "..",
  "packages",
  "registry",
  "data",
  "registry",
  "substitution-evidence.json",
);

const evidence = exportSubstitutionEvidence(loadRecords());
writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(
  `[export] wrote substitution-evidence.json: ${evidence.length} rows (${evidence.filter((e) => e.policyAction === "substitute").length} substitute).`,
);

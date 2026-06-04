/**
 * Corpus SOURCE adapter contract. A source (legal-review ship-set, Google Fonts checkout, DocRepair
 * download, TeX Gyre packet, ...) owns the raw files, license texts, retrieval date, and any hashes.
 * It yields normalized RawCorpusFace entries; the generic driver (scripts/import-corpus.ts) does the
 * source-agnostic work: hash + verify, parse metadata, hash license text, dedup, assemble the
 * CorpusManifest. Adapters live here in scripts/ (internal tooling) so the published package and the
 * committed manifests never carry private paths or binaries.
 */

/** One open font face as a source hands it over: bytes + the provenance the source can attest. */
export interface RawCorpusFace {
  /** logical family name the source groups this face under (e.g. "Carlito"). */
  family: string;
  fileName: string;
  /** the font file bytes. Never committed; the driver hashes + parses then discards them. */
  bytes: Uint8Array;
  /** the source's recorded sha256, if it ships one. The driver verifies bytes against it. */
  expectedSha256?: string;
  /** license id, e.g. "OFL-1.1" | "Apache-2.0". */
  license: string;
  /** the exact license text bytes; the driver derives licenseTextSha256 from these. */
  licenseTextBytes: Uint8Array;
  /** upstream / license URL for this family. */
  sourceUrl: string;
}

/** A normalized open-font source. One implementation per source kind; the ship-set is the first. */
export interface CorpusSource {
  /** stable corpus id, also the output filename stem (e.g. "current-ship-set-2026-06-03"). */
  corpusId: string;
  /** human-readable, PUBLIC-SAFE description (no private filesystem paths). */
  source: string;
  /** public-safe source URL/identity (no private filesystem paths). */
  sourceUrl: string;
  /** YYYY-MM-DD the source was retrieved/packaged. */
  retrievedDate: string;
  /** provenance label attached to every family from this source. */
  licenseSource: string;
  /** yields each open face. May read from a configurable input path the adapter was given. */
  faces(): Iterable<RawCorpusFace>;
}

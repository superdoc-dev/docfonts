/** Inclusive codepoint range helper for building the sample. */
function codepointRange(start: number, end: number): number[] {
  const out: number[] = [];
  for (let cp = start; cp <= end; cp++) out.push(cp);
  return out;
}

/**
 * Fixed Latin sample for advance comparison: every printable ASCII codepoint (U+0020 space through
 * U+007E tilde), Latin-1 letters with diacritics, and common punctuation/symbols a document is likely
 * to use. Named and tested so the metric is reproducible. Stored as numeric codepoints, sorted and
 * unique.
 */
export const LATIN_SAMPLE: readonly number[] = (() => {
  const latin1 = codepointRange(0x00a0, 0x00ff).filter((cp) => cp !== 0x00ad);
  const generalPunctuation = [
    0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2020, 0x2021, 0x2022,
    0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
  ];
  const all = [...codepointRange(0x20, 0x7e), ...latin1, ...generalPunctuation];
  return [...new Set(all)].sort((a, b) => a - b);
})();

const TEXT_PUNCTUATION = new Set([
  0x20, // space
  0x21, // !
  0x22, // "
  0x23, // #
  0x26, // &
  0x27, // '
  0x28, // (
  0x29, // )
  0x2c, // ,
  0x2d, // -
  0x2e, // .
  0x2f, // /
  0x3a, // :
  0x3b, // ;
  0x3f, // ?
  0x40, // @
  0x5b, // [
  0x5d, // ]
  0x7b, // {
  0x7d, // }
  0x00a0, // no-break space
  0x2013, // en dash
  0x2014, // em dash codepoint
  0x2018, // left single quote
  0x2019, // right single quote
  0x201c, // left double quote
  0x201d, // right double quote
  0x2026, // ellipsis
]);

const EXCLUDED_TEXT_LETTERS = new Set([
  0x00b5, // micro sign: Unicode treats it as a letter, but it behaves like a symbol here.
]);

function isTextLetterOrDigit(codepoint: number): boolean {
  if (EXCLUDED_TEXT_LETTERS.has(codepoint)) return false;
  return /^[\p{L}\p{N}]$/u.test(String.fromCodePoint(codepoint));
}

/**
 * Text-carrying Latin sample used to rank proportional-font candidates. The full sample still reports
 * outliers, but rare symbols should not hide a strong body-text lead.
 */
export const LATIN_TEXT_SAMPLE: readonly number[] = LATIN_SAMPLE.filter(
  (cp) => TEXT_PUNCTUATION.has(cp) || isTextLetterOrDigit(cp),
);

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

/**
 * Japanese CJK text sample used for JP Mincho/Gothic rows. It intentionally mixes full-width CJK,
 * ASCII, half-width katakana, and variable punctuation so the comparison is not just a full-width
 * tautology. Shape still needs human review, so the CJK model caps exact width matches at
 * `cell_width_only`.
 */
export const CJK_JP_TEXT_SAMPLE: readonly number[] = (() => {
  const ascii = [...codepointRange(0x30, 0x39), ...codepointRange(0x41, 0x5a)];
  const halfWidthKatakana = codepointRange(0xff66, 0xff9f);
  const japanese = [
    0x0020, 0x002d, 0x002e, 0x002f, 0x3001, 0x3002, 0x300c, 0x300d, 0x3042,
    0x3044, 0x3046, 0x3048, 0x304a, 0x304b, 0x306a, 0x30a2, 0x30a4, 0x30a6,
    0x30a8, 0x30aa, 0x30ab, 0x30af, 0x30b4, 0x30b7, 0x30c3, 0x30ca, 0x30fb,
    0x30fc, 0x4e00, 0x4e03, 0x4e09, 0x4e2d, 0x4e5d, 0x4e8c, 0x4e94, 0x4eac,
    0x4eba, 0x4f1a, 0x516b, 0x516d, 0x5341, 0x53e3, 0x53f7, 0x56db, 0x56fd,
    0x5831, 0x5927, 0x5b66, 0x5c0f, 0x5e74, 0x5fc3, 0x60c5, 0x6587, 0x65e5,
    0x660e, 0x6708, 0x671d, 0x672c, 0x6771, 0x6821, 0x756a, 0x78ba, 0x793a,
    0x793e, 0x7ae0, 0x8868, 0x8a8d, 0x8a9e, 0x90fd, 0x962a, 0xff08, 0xff09,
  ];
  return [...new Set([...ascii, ...halfWidthKatakana, ...japanese])].sort(
    (a, b) => a - b,
  );
})();

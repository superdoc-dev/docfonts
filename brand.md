---
name: "docfonts"
tagline: "Document font substitution, measured."
version: 1
language: en
type: product
architecture: endorsed
---

<!-- Inherits from: ../brand.md (SuperDoc). This is a sparse product brand. Sections not present here inherit from the SuperDoc master brand. Where this file tightens a guardrail or sets its own visual system, this file wins. -->

# docfonts

## Strategy

### Overview

docfonts is an open, measured registry of which open fonts can stand in for proprietary document fonts (Office / Word / DOCX), and how faithfully - including the honest "no open substitute found."

It was built by the team behind SuperDoc, out of the font-fidelity measurement work behind SuperDoc's document rendering. SuperDoc needed to know, with evidence, which open font to fall back to when a document named a proprietary one. The folklore lists could not answer that. So the measurement became a product of its own.

What docfonts really does is replace folklore with measurement. Every entry carries advance deltas, face coverage (regular / bold / italic / bold-italic), license provenance, the method and date the numbers were produced, and a verdict drawn from a fixed taxonomy: metric-safe, near-metric, cell-width-only, visual-only, customer-supplied, preserve-only, no-substitute. For a substitute whose faces differ, the verdict is recorded per face and the headline rolls up to the worst face.

The problem it solves is structural. The common substitute-font sources assert pairs without measuring them. A "metric-equivalent" font ships with no italic face. Another matches advance widths but draws different letterforms. Document renderers inherit this silent fidelity loss - pages reflow, italics vanish - and the negative result that would have warned them rarely gets published.

**Before docfonts**: You copy a pairing from a distro wiki, a fontconfig alias file, or the LibreOffice replacement table. You hope it matches. You discover the broken italic, or the reflowed page, in production.

**After docfonts**: You look up the proprietary font by name. You read the measured delta, see which faces actually exist, check the license, and get a verdict - or a clear, scoped "no open font stands in."

**Long-term ambition**: docfonts becomes the source of record anyone consults before choosing a document-font fallback - the measured reference for renderers, PDF generators, and editors, the way developers reach for caniuse before relying on a web feature.

### Positioning

**Category**: The measured substitution registry for document fonts - published, reproducible evidence for which open font stands in for a proprietary one, and how faithfully.

**What docfonts is NOT**:
- Not a font library or webfont host. It does not store, bundle, or ship fonts (that is Fontsource / Fontist).
- Not a CSS fallback-metrics or CLS tool. It does not tune `size-adjust` to stop layout shift for webfonts (that is Fontaine).
- Not a font-QA suite (that is FontBakery) or a font-creation tool (that is fonttools / fontforge).
- Not a folklore alias list with nicer styling. The measurement is the product, not the pairing.
- Not a SuperDoc feature or accessory. It is standalone and neutral.

**Competitive landscape**:

The substitute-font space today is four kinds of thing. None of the common sources publishes a measured, document-fidelity verdict - we have not found one that does.

1. **Alias lists and configs** - fontconfig's `30-metric-aliases.conf`, the ArchWiki metric-compatible page, the LibreOffice replacement table, distro wikis. They assert pairs. No published measurement, no face-coverage table, no negative results.
2. **Web-perf fallback tools** - Fontaine, CSS `size-adjust` and metric overrides. They reduce layout shift (CLS) for webfonts. They do not measure fidelity against a proprietary document original.
3. **Distribution** - Fontsource, Fontist. They get open fonts into your build. They do not tell you which one can stand in for Calibri.
4. **Font QA and creation** - FontBakery, fonttools, fontforge. They check or build fonts. They do not measure substitution fidelity.

docfonts occupies the empty cell: measured, document-fidelity substitution, with provenance and an honest verdict.

**Structural differentials**:
- **Measured, not asserted** - advance deltas and face coverage, reproducible from a stated method.
- **Negative verdicts published** - "no open substitute found" is a first-class result, scoped to method and date.
- **Document-fidelity scope** - Word / DOCX / Office, where substitution actually breaks pages.
- **Provenance on every claim** - license and source for each open candidate; method and date on each number.
- **BYO and private** - distributes no proprietary binaries; the DOCX scanner runs in the browser and never uploads.
- **Neutral and standalone** - useful to any renderer; endorsed by SuperDoc, owned by no one.

**The territory docfonts owns**: The measured truth about document-font substitution - including the honest no. The space the common sources leave empty: published measurement where the rest of the category offers folklore.

### Personality

**Dominant archetype**: The Metrologist. A calm measurement authority with a skeptical spine. It inherits SuperDoc's Precision Toolmaker and narrows it to one job: measure, and report what the measurement says - even when the answer is unwelcome. It is calibrated instrumentation, not litigation.

**Attributes the brand transmits**:
- Measured
- Neutral
- Honest
- Precise
- Reproducible
- Quietly skeptical

**What docfonts IS**:
- The instrument that reports the number, then the verdict
- Skeptical of inherited pairings, never sneering at them
- Willing to publish a no
- Specific about what is missing, not vague about what is close
- A reference you check, not a list you trust on faith

**What docfonts is NOT**:
- A crusade that centers on catching other lists being wrong
- A marketplace that wants you to pick a pretty font
- A source that rounds "close" up to "compatible"
- A SuperDoc marketing surface
- Loud where the measurement should speak

### Promise

Every pairing carries its measurement: advance deltas, face coverage, provenance.
When no open font stands in, we publish that too.
We never claim metric-safe without a measurement.
No proprietary binary is ever distributed. The numbers reproduce against your own licensed fonts.

**Base message**: docfonts is the measured registry of which open fonts can stand in for proprietary document fonts - and how faithfully, including when none can.

**Synthesizing phrase**: docfonts exists so font substitution stops being folklore.

### Guardrails

**Tone summary**: Measured. Neutral. Honest. Precise. Reproducible.

**What the brand cannot be**:
- A folklore list with better styling
- A SuperDoc accessory or a SuperDoc marketing page
- A source of proprietary font downloads
- A tool that claims compatibility it did not measure
- A brand whose identity is other people being wrong

**Litmus test**: If a claim does not have a measurement behind it, it does not ship.

---

## Voice

### Identity

We measure font substitution. We are not a font library, and we are not a list.

We started inside SuperDoc, which had to decide - with evidence, not folklore - which open font to render when a document asked for a proprietary one. We measured advance widths, checked which faces actually existed, traced licenses, and wrote down a verdict. Then we noticed that nobody publishes this. The whole category asserts that fonts match without ever measuring it. So we made the measurement the product.

We report the number first and the adjective second. We name the face that is missing instead of calling a font "near-complete." We scope every negative to the method and the date it was produced, because a measurement is a measurement, not a law of nature. When the honest verdict is that no open font stands in, we publish that too - a no is a result, not a gap. We distribute no proprietary binaries, ever; our numbers reproduce against fonts you license yourself.

**Essence**: Measurement where the category has folklore.

### Tagline & Slogans

**Primary tagline**: Document font substitution, measured.
_Use on homepage hero, repo description, social bios. Anchor on substitution, not substitutes - the negative verdict is part of the value._

**Alternatives**:
- Which open font stands in, and how faithfully.
- Open substitutes for document fonts, with the measurement attached.
- Substitute fonts, measured - verdict included.

**Slogans for different contexts**:
- Scanner tool: "Scan a .docx. See every font, and what can stand in. Nothing leaves your browser."
- Negative-verdict context: "Sometimes the right substitute is no substitute."
- Font page / SEO: "Aptos: no open metric substitute found (this method, this date)."
- Provenance pitch: "Every pairing, with the receipt."
- CLI: "compare two fonts. Get the deltas, the coverage, the verdict."

### Manifesto

Every substitute-font list tells you the same thing.

These fonts match.

Almost none of them measured it.

They were copied from a wiki, into a config, into a distro, into your renderer - and somewhere along the way the italic went missing and nobody wrote it down.

We measure.

We measure the advance widths. We count the faces that actually exist. We trace the license. We record the method and the date.

Then we give it a verdict. One of a fixed set of words. No hedging.

And when the measurement says no open font stands in, we publish the no.

A no is a result. It is the most useful thing on the page, because it is the one answer the folklore will never give you.

We are not here to be right about other people being wrong.

We are here so the next person who builds a document renderer can look up a font and find a number, not a rumor.

**docfonts.**

### Message Pillars

**Measurement**
- Advance deltas and face coverage, published and reproducible from a stated method.
- The number leads. The adjective follows.

**Honesty**
- "No open substitute found" is a first-class result, scoped to method and date.
- We name the missing face. We never round "close" up to "compatible."

**Provenance**
- License and source for every open candidate.
- Method and date on every measurement, so anyone can reproduce it.

**Fidelity scope**
- Document fidelity - Word, DOCX, Office - where substitution actually breaks pages.
- Not web-perf, not CLS, not distribution, not QA. One job, done with evidence.

**Neutrality**
- A standalone registry, useful to any renderer or PDF generator.
- Built by the team behind SuperDoc; SuperDoc is a consumer and the credibility source, not the owner of the truth.

**Privacy and BYO**
- The DOCX scanner runs in the browser and never uploads.
- No proprietary binary is ever distributed; reproduce the numbers against your own licensed fonts.

### Phrases

- "Folklore says they match. We publish the delta."
- "Every pairing carries its measurement."
- "Sometimes the measured answer is no - and we ship that too."
- "We never claim metric-safe without a measurement."
- "The italic that isn't there is in the table."
- "Four faces, or we say which ones are missing."
- "A verdict, not a vibe."
- "No open substitute is a result, not a gap."
- "Measured against your own licensed originals. We distribute nothing proprietary."

### Social Bios

**LinkedIn**:
docfonts is the measured registry of which open fonts can stand in for proprietary document fonts - and how faithfully. Every entry carries advance deltas, face coverage, license provenance, and a verdict, including the honest "no open substitute found." Document fidelity, not web-perf. No proprietary binaries, ever. Built by the team behind SuperDoc; standalone and neutral.

**X/Twitter**:
Document font substitution, measured. Advance deltas, face coverage, provenance, and a verdict - including the honest no. Built by the team behind SuperDoc.

**Website (footer/about)**:
docfonts publishes measured open substitutes for proprietary document fonts: advance deltas, face coverage, license provenance, and a verdict from a fixed taxonomy - including when no open font stands in. It distributes no proprietary binaries; the DOCX scanner runs entirely in your browser. Built by the team behind SuperDoc, standalone and neutral.

### Tonal Rules

These extend the SuperDoc voice rules. Where they are more specific, they win.

1. No metric-safe claim without a measurement. Ever. This is the litmus test in sentence form.
2. Lead with the number, not the adjective. "advance delta 1.8%" before "close."
3. Name the missing face. If there is no italic, write "no italic face" - never "near-complete."
4. A verdict is one of the fixed taxonomy words: metric-safe, near-metric, cell-width-only, visual-only, customer-supplied, preserve-only, no-substitute. Use the taxonomy; do not invent grades. When faces differ, record a per-face verdict and roll the headline up to the worst face.
5. Scope every negative to method and date: "no open metric substitute found (this method, this date)." A measurement is not a law of nature.
6. Describe the category by what it is, not as wrong. "Alias lists and distro configs assert pairs without measurement." Report; do not sneer.
7. SuperDoc is endorsement, not authorship of the truth. Say "Built by the team behind SuperDoc." Never "the official SuperDoc font tool."
8. Never say "used by SuperDoc's font resolver" until SuperDoc actually consumes the registry. State present facts, not intended ones.
9. We distribute no proprietary binaries, and we say so. Point people to reproduce against their own licensed fonts.
10. Reproducibility over assertion. Every number can be regenerated from the stated method and your own fonts.

**Identity boundaries**:
- We are not a font library or marketplace. We do not host or ship fonts.
- We are not a CSS fallback or CLS tool. That is Fontaine's job; ours is document fidelity.
- We are not a font-distribution tool. That is Fontsource and Fontist.
- We are not a font-QA suite. That is FontBakery.
- We are not a SuperDoc accessory. The neutrality is what makes the registry worth trusting.
- We are not a folklore list with a redesign. The measurement is the product.

| We Say | We Never Say |
|---|---|
| "advance delta 1.8%, no italic face" | "basically identical" |
| "no open metric substitute found (this method, this date)" | "there's no good alternative, period" |
| "metric-safe (measured)" | "100% compatible" |
| "cell-width-only: matches advance, not letterform" | "drop-in replacement" |
| "Built by the team behind SuperDoc" | "the official SuperDoc font tool" |
| "reproduce against your own licensed fonts" | "download the originals here" |
| "the LibreOffice table lists this pair; we measured it" | "every other list is wrong" |
| "a verdict, with the measurement attached" | "trust us, it matches" |

---

## Visual

docfonts sets its own visual system. It shares two open typefaces with the SuperDoc orbit for kinship, but it does not inherit SuperDoc Blue as its identity. The look is a calibrated instrument and a typographic specimen sheet - not a SuperDoc microsite, and not a font marketplace. The verdict taxonomy is the color system: the palette does the reporting.

### Colors

**Base - the specimen sheet**

Warm paper and ink, with soft graph-paper rules. This is deliberately not SuperDoc's cool white canvas; warm paper reads as document, print, specimen.

| Role | Hex | Usage |
|---|---|---|
| Ink (text primary) | `#17191E` | Headings, body, measured values |
| Ink secondary | `#5B6169` | Metadata, captions, method/date notes |
| Paper | `#FBFAF7` | Page background |
| Surface | `#FFFFFF` | Cards, tables, specimen rows |
| Grid line | `#E7E3DA` | Table rules, graph-paper guides |
| Hairline | `#EFECE4` | Finer dividers, row separators |

**Primary accent - Calibration Teal**

`#0F766E` - Links, focus states, active controls, the brand mark. Reads as instrument and precision, and is intentionally distinct from SuperDoc Blue.
`#115E59` (hover/active) - Interactive darker state.

**Verdict system (functional, semantic - the signature of the brand)**

These map one-to-one to the `Verdict` tokens in `@docfonts/core`. They are functional, not decorative: a verdict badge always uses its assigned color, so the page can be read at a glance. Two conditional verdicts share one neutral color but remain distinct tokens - color is a reading aid, not the source of truth.

| Verdict (core token) | Hex | Reads as |
|---|---|---|
| metric-safe (`metric_safe`) | `#15803D` (measured green) | Pass, measured (within the direct threshold) |
| near-metric (`near_metric`) | `#3F6212` (olive) | Near-exact: within the likely band; a few glyphs drift |
| cell-width-only (`cell_width_only`) | `#B45309` (amber) | Partial: advance matches, letterform does not |
| visual-only (`visual_only`) | `#92400E` (deep ochre) | Partial: looks close, not metric-matched |
| customer-supplied (`customer_supplied`) | `#475569` (slate) | Conditional: a font the user supplies, outside the open registry |
| preserve-only (`preserve_only`) | `#475569` (slate) | Conditional: keep the original; do not substitute |
| no-substitute (`no_substitute`) | `#A8392B` (clay) | The honest no - definite, not alarm |

Clay, not fire-engine red, for the negative. A no is a measured result, not an emergency. Every color meets WCAG AA (at least 4.5:1) for badge text on the paper background; if a verdict token is renamed or added in core, this table moves with it. When a substitute's faces differ, the badge shows the worst-face rollup with a "qualified" marker; the per-face breakdown carries the stronger faces.

**Reserved**

SuperDoc Blue `#1355FF` is used only for the small "Built by the team behind SuperDoc" endorsement mark. It never anchors docfonts' own UI.

**Colors to avoid**: Saturated neon, gradients in the product UI, multi-hue marketing washes. The data carries the color; the chrome stays quiet.

### Typography

We eat our own cooking: docfonts uses only open fonts, the kind it documents. Both faces below are open-licensed, which keeps the brand honest and shared with the SuperDoc orbit.

**UI and body - Inter**
Weights: Regular (400), Medium (500), Semibold (600).
Usage: Interface text, prose, headings, documentation. Enable `tabular-nums` wherever figures appear inline so columns of deltas align.

**Measured values and code - JetBrains Mono**
Weight: Regular (400), Medium (500).
Usage: Every measured value - advance deltas, percentages, face-coverage cells, verdict IDs, CLI output, code. Use tabular figures so numeric columns line up exactly. The rule: if it is a number we measured, it is set in mono.

| Level | Size | Weight | Context |
|---|---|---|---|
| Hero | 44px | Semibold | Marketing hero only |
| Page heading | 32px | Semibold | Font pages, top titles |
| Section heading | 22px | Semibold | Major sections |
| Subsection | 18px | Medium | Within sections |
| Body | 16px | Regular | Default prose |
| Data / value | 15px | Regular (mono) | Deltas, coverage, verdicts |
| Small | 14px | Regular | Metadata, method, date |
| Caption | 12px | Regular | Labels, provenance fine print |

### Photography

Prefer rendered evidence over photography. The hero image of this product is a table.

**Mood**: Calibrated, precise, documentary, restrained.

**Subjects**: Specimen rows (a glyph set at one size); delta bars; face-coverage grids (R / B / I / BI cells, present or missing); verdict badges; side-by-side overlays of a proprietary original and its open candidate; a calibration-certificate or datasheet layout.

**Avoid**: Font-marketplace galleries, decorative type splashes, glamour shots of letterforms, stock photography, abstract "tech" imagery. Nothing that says "pick a pretty font."

### Style

**Design keywords**: Measured. Calibrated. Documentary. Tabular. Restrained. Specimen-first.

**Reference points**: Hardware datasheets and calibration certificates; typographic specimen sheets; caniuse-style evidence tables; Linear's restraint; Stripe Docs' precision. The page should look like a measurement was taken and written down with care.

**Direction**: The interface is a readout. Tables, not cards-as-decoration. Monospace numerals, aligned columns, soft graph-paper structure, generous whitespace, one verdict color per row. The verdict system carries the color so the chrome can stay neutral. It should feel like an instrument you trust, built by people who care about the third decimal place - because they do. No marketplace gloss. No SuperDoc microsite. A specimen sheet that happens to live on the web.

# Test fixture fonts - licenses

All fonts here are OPEN and used only as parser test fixtures. No proprietary fonts (see
`../README.md`). Each is the upstream release, unmodified. Full license texts are in `licenses/`.

| File(s) | Family | License | Copyright / Reserved Font Name | Text |
|---|---|---|---|---|
| Carlito-{Regular,Bold,Italic,BoldItalic}.ttf | Carlito | OFL-1.1 | (c) 2010-2013 tyPoland Lukasz Dziedzic, RFN "Carlito" | `licenses/OFL-1.1.txt` |
| CarlitoCollection.ttc | Carlito | OFL-1.1 | (c) 2010-2013 tyPoland Lukasz Dziedzic, RFN "Carlito" | `licenses/OFL-1.1.txt` |
| CarlitoItalicWeightCollection.ttc | Carlito | OFL-1.1 | (c) 2010-2013 tyPoland Lukasz Dziedzic, RFN "Carlito" | `licenses/OFL-1.1.txt` |
| LiberationSerif-Regular.ttf | Liberation Serif | OFL-1.1 | digitized (c) 2010 Google; (c) 2012 Red Hat, RFN "Liberation" | `licenses/OFL-1.1.txt` |
| LiberationMono-Regular.ttf | Liberation Mono | OFL-1.1 | digitized (c) 2010 Google; (c) 2012 Red Hat, RFN "Liberation" | `licenses/OFL-1.1.txt` |
| LiberationSansNarrow-Regular.ttf | Liberation Sans Narrow | GPLv2 + font exception | (c) Red Hat, Inc. | `licenses/LiberationSansNarrow-License.txt` + `licenses/LiberationSansNarrow-COPYING.txt` |
| Roboto-Regular.ttf | Roboto | OFL-1.1 | (c) 2011 The Roboto Project Authors | `licenses/Roboto-OFL.txt` |

Roboto relicensed from Apache-2.0 to OFL-1.1 in 2023; this is the OFL release. The OFL and the
Liberation GPLv2 font exception both permit redistributing these binaries when the license texts
accompany them (done here, in `licenses/`).

Two generated fixtures, both packed with `fonttools ttLib` under `SOURCE_DATE_EPOCH=0` for
byte-reproducible output, both carrying unmodified upstream Carlito glyph data (only the SFNT
container, and for the second the OS/2 weight + name records, are altered):

- `CarlitoCollection.ttc` - a 2-face collection (Carlito Regular + Bold). Exercises the `.ttc`
  multi-face code path (`countFaces` + `ParseOptions.faceIndex`).
- `CarlitoItalicWeightCollection.ttc` - a 2-face collection where face 0 is the canonical Italic
  (weight 400) and face 1 is the same outlines re-stamped as Light Italic (`usWeightClass` 300).
  Exercises canonical-slot classification: the Light Italic keeps the italic bit but must resolve to
  `styleKey "other"`, not `"italic"`, so it cannot shadow the real Italic in a measurement run.

These fixtures exercise the parser across sans / serif / mono / condensed, the four Carlito faces
(regular / bold / italic / boldItalic), `.ttc` collection parsing, canonical-slot weight
classification, and the OS/2-classification edge case (Roboto resolves to the "unknown" category).
Golden values for each are locked in `../../packages/font-metadata/parse.test.ts`.

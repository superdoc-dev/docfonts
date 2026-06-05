# Test fixture fonts - licenses

All fonts here are OPEN and used only as parser test fixtures. No proprietary fonts (see
`../README.md`). Each is the upstream release, unmodified. Full license texts are in `licenses/`.

| File(s) | Family | License | Copyright / Reserved Font Name | Text |
|---|---|---|---|---|
| Carlito-{Regular,Bold,Italic,BoldItalic}.ttf | Carlito | OFL-1.1 | (c) 2010-2013 tyPoland Lukasz Dziedzic, RFN "Carlito" | `licenses/OFL-1.1.txt` |
| CarlitoCollection.ttc | Carlito | OFL-1.1 | (c) 2010-2013 tyPoland Lukasz Dziedzic, RFN "Carlito" | `licenses/OFL-1.1.txt` |
| LiberationSerif-Regular.ttf | Liberation Serif | OFL-1.1 | digitized (c) 2010 Google; (c) 2012 Red Hat, RFN "Liberation" | `licenses/OFL-1.1.txt` |
| LiberationMono-Regular.ttf | Liberation Mono | OFL-1.1 | digitized (c) 2010 Google; (c) 2012 Red Hat, RFN "Liberation" | `licenses/OFL-1.1.txt` |
| LiberationSansNarrow-Regular.ttf | Liberation Sans Narrow | GPLv2 + font exception | (c) Red Hat, Inc. | `licenses/LiberationSansNarrow-License.txt` + `licenses/LiberationSansNarrow-COPYING.txt` |
| Roboto-Regular.ttf | Roboto | OFL-1.1 | (c) 2011 The Roboto Project Authors | `licenses/Roboto-OFL.txt` |

Roboto relicensed from Apache-2.0 to OFL-1.1 in 2023; this is the OFL release. The OFL and the
Liberation GPLv2 font exception both permit redistributing these binaries when the license texts
accompany them (done here, in `licenses/`).

`CarlitoCollection.ttc` is the one generated fixture: a 2-face TrueType collection (Carlito Regular +
Bold) packed with `fonttools ttLib` under `SOURCE_DATE_EPOCH=0` for byte-reproducible output. It
exercises the `.ttc` multi-face code path (`countFaces` + `ParseOptions.faceIndex`); the glyph data is
the unmodified upstream Carlito, only the SFNT container is repackaged.

These fixtures exercise the parser across sans / serif / mono / condensed, the four Carlito faces
(regular / bold / italic / boldItalic), `.ttc` collection parsing, and the OS/2-classification edge
case (Roboto resolves to the "unknown" category). Golden values for each are locked in
`../../packages/font-metadata/parse.test.ts`.

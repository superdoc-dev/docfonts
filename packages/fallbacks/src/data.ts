// Generated from records.json by scripts/generate-data.ts. Do not edit by hand.
import type { SubstitutionEvidence } from "./types.js";

export const SUBSTITUTION_EVIDENCE: readonly SubstitutionEvidence[] = [
  {
    "evidenceId": "calibri",
    "generic": "sans-serif",
    "logicalFamily": "Calibri",
    "physicalFamily": "Carlito",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "pass",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "calibri__carlito#analytic_advance#2026-06-03",
      "calibri__carlito#face_aggregate#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "cambria",
    "generic": "serif",
    "logicalFamily": "Cambria",
    "physicalFamily": "Caladea",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "cambria_regular__caladea#regular#w400#d2f6cad3#analytic_advance#2026-06-04",
      "cambria_bold__caladea#bold#w700#74eda4fc#analytic_advance#2026-06-04",
      "cambria_italic__caladea#italic#w400#9c968bf6#analytic_advance#2026-06-04",
      "cambria_boldItalic__caladea#boldItalic#w700#f47a35ad#analytic_advance#2026-06-04"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0.0002378,
      "maxDelta": 0.2310758
    },
    "candidateLicense": "Apache-2.0",
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "metric_safe",
      "italic": "metric_safe",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "boldItalic",
        "codepoint": 96,
        "advanceDelta": 0.231,
        "note": "Caladea Bold Italic grave accent (U+0060) advance diverges ~23% from Cambria; lines containing it reflow. All other glyphs, and the regular/bold/italic faces, are within the direct metric threshold."
      }
    ]
  },
  {
    "evidenceId": "arial",
    "generic": "sans-serif",
    "logicalFamily": "Arial",
    "physicalFamily": "Liberation Sans",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "arial__liberation-sans#analytic_advance#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "arial-mt",
    "generic": "sans-serif",
    "logicalFamily": "Arial MT",
    "physicalFamily": "Liberation Sans",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "arial-mt_regular__liberation-sans#regular#w400#analytic_advance#2026-06-10",
      "arial-mt_bold__liberation-sans#bold#w700#analytic_advance#2026-06-10",
      "arial-mt_italic__liberation-sans#italic#w400#analytic_advance#2026-06-10",
      "arial-mt_boldItalic__liberation-sans#boldItalic#w700#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_text",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "arial-unicode-ms",
    "generic": "sans-serif",
    "logicalFamily": "Arial Unicode MS",
    "physicalFamily": null,
    "verdict": "customer_supplied",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "not_run",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "customer_supplied",
    "measurementRefs": [
      "arial-unicode-ms#broad_unicode_no_open_substitute#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": null
  },
  {
    "evidenceId": "times-new-roman",
    "generic": "serif",
    "logicalFamily": "Times New Roman",
    "physicalFamily": "Liberation Serif",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "times-new-roman__liberation-serif#analytic_advance#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "times",
    "generic": "serif",
    "logicalFamily": "Times",
    "physicalFamily": "Liberation Serif",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "times_regular__liberation-serif#regular#w400#analytic_advance#2026-06-10",
      "times_bold__liberation-serif#bold#w700#analytic_advance#2026-06-10",
      "times_italic__liberation-serif#italic#w400#analytic_advance#2026-06-10",
      "times_boldItalic__liberation-serif#boldItalic#w700#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_text",
      "meanDelta": 0.00098877,
      "maxDelta": 0.1171875
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "metric_safe",
      "italic": "metric_safe",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "boldItalic",
        "codepoint": 239,
        "advanceDelta": 0.1172,
        "note": "Times Bold Italic vs Liberation Serif Bold Italic: small i diaeresis (U+00EF) advance differs ~11.7%; lines containing it can reflow. Regular, bold, and italic faces are metric_safe on the text sample."
      }
    ]
  },
  {
    "evidenceId": "courier-new",
    "generic": "monospace",
    "logicalFamily": "Courier New",
    "physicalFamily": "Liberation Mono",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "courier-new__liberation-mono#analytic_advance#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "courier",
    "generic": "monospace",
    "logicalFamily": "Courier",
    "physicalFamily": "Liberation Mono",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "courier__liberation-mono#monospace_cell#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "monospace_cell",
      "meanDelta": 0.0016,
      "maxDelta": 0.2002
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "regular",
        "codepoint": 176,
        "advanceDelta": 0.2002,
        "note": "Courier Regular vs Liberation Mono Regular: degree sign (U+00B0) advance differs ~20%; plus-minus (U+00B1) and division sign (U+00F7) also exceed the direct threshold."
      },
      {
        "slot": "bold",
        "codepoint": 176,
        "advanceDelta": 0.2002,
        "note": "Courier Bold vs Liberation Mono Bold: degree sign (U+00B0) advance differs ~20%; plus-minus (U+00B1) and division sign (U+00F7) also exceed the direct threshold."
      },
      {
        "slot": "italic",
        "codepoint": 176,
        "advanceDelta": 0.2002,
        "note": "Courier Italic vs Liberation Mono Italic: degree sign (U+00B0) advance differs ~20%; plus-minus (U+00B1) and division sign (U+00F7) also exceed the direct threshold."
      },
      {
        "slot": "boldItalic",
        "codepoint": 176,
        "advanceDelta": 0.2002,
        "note": "Courier Bold Italic vs Liberation Mono Bold Italic: degree sign (U+00B0) advance differs ~20%; plus-minus (U+00B1) and division sign (U+00F7) also exceed the direct threshold."
      }
    ]
  },
  {
    "evidenceId": "georgia",
    "generic": "serif",
    "logicalFamily": "Georgia",
    "physicalFamily": "Gelasio",
    "verdict": "near_metric",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "pass",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "georgia_regular__gelasio#regular#w400#1543f04d#analytic_advance#2026-06-04",
      "georgia_bold__gelasio#bold#w700#5a1b9bd7#analytic_advance#2026-06-04",
      "georgia_italic__gelasio#italic#w400#be1243a9#analytic_advance#2026-06-04",
      "georgia_boldItalic__gelasio#boldItalic#w700#6f3b3f7a#analytic_advance#2026-06-04",
      "georgia_regular__gelasio#regular#w400#1543f04d#live_layout#2026-06-03",
      "georgia_bold__gelasio#bold#w700#5a1b9bd7#live_layout#2026-06-03",
      "georgia_italic__gelasio#italic#w400#be1243a9#live_layout#2026-06-03",
      "georgia_boldItalic__gelasio#boldItalic#w700#6f3b3f7a#live_layout#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0.0000197,
      "maxDelta": 0.0183727
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "metric_safe",
      "italic": "near_metric",
      "boldItalic": "near_metric"
    },
    "glyphExceptions": [
      {
        "slot": "italic",
        "codepoint": 210,
        "advanceDelta": 0.0184,
        "note": "Georgia Italic vs Gelasio Italic: accented capital O (U+00D2-D8: O-grave/acute/circumflex/diaeresis/stroke) advance differs ~1.84%. 5 rare glyphs; all other glyphs exact, mean 0%."
      },
      {
        "slot": "boldItalic",
        "codepoint": 204,
        "advanceDelta": 0.011,
        "note": "Georgia Bold Italic vs Gelasio Bold Italic: accented capital I (U+00CC-CE: I-grave/acute/circumflex) advance differs ~1.10%. 3 rare glyphs; all other glyphs exact, mean ~0%."
      }
    ]
  },
  {
    "evidenceId": "arial-narrow",
    "generic": "sans-serif",
    "logicalFamily": "Arial Narrow",
    "physicalFamily": "Liberation Sans Narrow",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "arial-narrow_regular__liberation-sans-narrow#regular#w400#546e8957#analytic_advance#2026-06-04",
      "arial-narrow_bold__liberation-sans-narrow#bold#w700#8e5eb509#analytic_advance#2026-06-04",
      "arial-narrow_italic__liberation-sans-narrow#italic#w400#c5de4127#analytic_advance#2026-06-04",
      "arial-narrow_boldItalic__liberation-sans-narrow#boldItalic#w700#57fe1513#analytic_advance#2026-06-04"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0.5
    },
    "candidateLicense": "GPL-2.0-only WITH Font-exception-2.0",
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "visual_only",
      "italic": "metric_safe",
      "boldItalic": "metric_safe"
    },
    "glyphExceptions": [
      {
        "slot": "bold",
        "codepoint": 160,
        "advanceDelta": 0.5,
        "note": "Arial Narrow Bold no-break space (U+00A0) is double-width (2x the regular space); Liberation Sans Narrow Bold matches the regular space, so lines containing a non-breaking space reflow. All other glyphs, and the regular/italic/boldItalic faces, match within the direct metric threshold."
      }
    ]
  },
  {
    "evidenceId": "aptos",
    "generic": "sans-serif",
    "logicalFamily": "Aptos",
    "physicalFamily": null,
    "verdict": "no_substitute",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "fail",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "customer_supplied",
    "measurementRefs": [
      "aptos#top_candidates#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": null
  },
  {
    "evidenceId": "arial-black",
    "generic": "sans-serif",
    "logicalFamily": "Arial Black",
    "physicalFamily": "Archivo Black",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "arial-black__archivo-black#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "italic": "visual_only"
    }
  },
  {
    "evidenceId": "arial-rounded-mt-bold",
    "generic": "sans-serif",
    "logicalFamily": "Arial Rounded MT Bold",
    "physicalFamily": "Ubuntu",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "arial-rounded-mt-bold__ubuntu#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "Ubuntu-font-1.0"
  },
  {
    "evidenceId": "bookman-old-style",
    "generic": "serif",
    "logicalFamily": "Bookman Old Style",
    "physicalFamily": "TeX Gyre Bonum",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "bookman-old-style__tex-gyre-bonum#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "LicenseRef-GUST-Font-License-1.0"
  },
  {
    "evidenceId": "itc-bookman",
    "generic": "serif",
    "logicalFamily": "ITC Bookman",
    "physicalFamily": "TeX Gyre Bonum",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "itc-bookman__tex-gyre-bonum#alias_of_bookman-old-style#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "LicenseRef-GUST-Font-License-1.0"
  },
  {
    "evidenceId": "century",
    "generic": "serif",
    "logicalFamily": "Century",
    "physicalFamily": "C059",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "century_regular__c059#regular#w400#analytic_advance#2026-06-10",
      "century__c059#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "AGPL-3.0-only WITH PS-or-PDF-font-exception-20170817",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0.00293647,
      "maxDelta": 0.167
    },
    "faceVerdicts": {
      "regular": "metric_safe"
    },
    "glyphExceptions": [
      {
        "slot": "regular",
        "codepoint": 175,
        "advanceDelta": 0.167,
        "note": "Century Regular vs C059 Roman: macron (U+00AF) advance differs ~16.7%; yen (U+00A5), plus-minus (U+00B1), division sign (U+00F7), and middle dot (U+00B7) also exceed the direct threshold. Body-text Latin sample is metric_safe."
      }
    ]
  },
  {
    "evidenceId": "century-schoolbook",
    "generic": "serif",
    "logicalFamily": "Century Schoolbook",
    "physicalFamily": "C059",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "century-schoolbook_regular__c059#regular#w400#analytic_advance#2026-06-10",
      "century-schoolbook_bold__c059#bold#w700#analytic_advance#2026-06-10",
      "century-schoolbook_italic__c059#italic#w400#analytic_advance#2026-06-10",
      "century-schoolbook_boldItalic__c059#boldItalic#w700#analytic_advance#2026-06-10",
      "century-schoolbook__c059#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "AGPL-3.0-only WITH PS-or-PDF-font-exception-20170817",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0.00337127,
      "maxDelta": 0.167
    },
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "metric_safe",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "regular",
        "codepoint": 175,
        "advanceDelta": 0.167,
        "note": "Century Schoolbook Regular vs C059 Roman: macron (U+00AF) advance differs ~16.7%; yen (U+00A5), plus-minus (U+00B1), division sign (U+00F7), and middle dot (U+00B7) also exceed the direct threshold. Body-text Latin sample is metric_safe."
      },
      {
        "slot": "bold",
        "codepoint": 175,
        "advanceDelta": 0.167,
        "note": "Century Schoolbook Bold vs C059 Bold: macron (U+00AF) advance differs ~16.7%; yen (U+00A5), micro sign (U+00B5), plus-minus (U+00B1), and division sign (U+00F7) also exceed the direct threshold. Body-text Latin sample is metric_safe."
      }
    ]
  },
  {
    "evidenceId": "century-gothic",
    "generic": "sans-serif",
    "logicalFamily": "Century Gothic",
    "physicalFamily": "URW Gothic",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "century-gothic_regular__urw-gothic#regular#w400#analytic_advance#2026-06-10",
      "century-gothic_bold__urw-gothic#bold#w700#analytic_advance#2026-06-10",
      "century-gothic_italic__urw-gothic#italic#w400#analytic_advance#2026-06-10",
      "century-gothic_boldItalic__urw-gothic#boldItalic#w700#analytic_advance#2026-06-10",
      "century-gothic__urw-gothic#visual_review#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_text",
      "meanDelta": 0.0013,
      "maxDelta": 0.1662
    },
    "candidateLicense": "AGPL-3.0-only WITH PS-or-PDF-font-exception-20170817",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "regular",
        "codepoint": 35,
        "advanceDelta": 0.1662,
        "note": "Century Gothic Regular vs URW Gothic Book: number sign (U+0023) advance differs ~16.6%; caret (U+005E) and plus-minus (U+00B1) also exceed the direct threshold. Body text is close, but not line-break safe."
      }
    ]
  },
  {
    "evidenceId": "garamond",
    "generic": "serif",
    "logicalFamily": "Garamond",
    "physicalFamily": "Cardo",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": false
    },
    "faceSources": {
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "garamond__cardo#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "consolas",
    "generic": "monospace",
    "logicalFamily": "Consolas",
    "physicalFamily": "Inconsolata SemiExpanded",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "consolas__inconsolata-semiexpanded#monospace_cell#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "monospace_cell",
      "meanDelta": 0.00019531,
      "maxDelta": 0.00019531
    },
    "candidateLicense": "OFL-1.1",
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "faceVerdicts": {
      "regular": "cell_width_only",
      "bold": "cell_width_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "verdana",
    "generic": "sans-serif",
    "logicalFamily": "Verdana",
    "physicalFamily": "Noto Sans",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "verdana__noto-sans#visual_review#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "tahoma",
    "generic": "sans-serif",
    "logicalFamily": "Tahoma",
    "physicalFamily": "Noto Sans",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "tahoma__noto-sans#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "segoe-ui",
    "generic": "sans-serif",
    "logicalFamily": "Segoe UI",
    "physicalFamily": "Selawik",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "segoe-ui__selawik#coverage_limited_advance_probe#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "trebuchet-ms",
    "generic": "sans-serif",
    "logicalFamily": "Trebuchet MS",
    "physicalFamily": "PT Sans",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "trebuchet-ms__pt-sans#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "comic-sans-ms",
    "generic": "sans-serif",
    "logicalFamily": "Comic Sans MS",
    "physicalFamily": "Comic Relief",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "comic-sans-ms__comic-relief#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "candara",
    "generic": "sans-serif",
    "logicalFamily": "Candara",
    "physicalFamily": null,
    "verdict": "visual_only",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "fail",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "candara#top_candidates#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": null
  },
  {
    "evidenceId": "constantia",
    "generic": "serif",
    "logicalFamily": "Constantia",
    "physicalFamily": null,
    "verdict": "visual_only",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "fail",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "constantia#top_candidates#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": null
  },
  {
    "evidenceId": "corbel",
    "generic": "sans-serif",
    "logicalFamily": "Corbel",
    "physicalFamily": null,
    "verdict": "visual_only",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "fail",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "corbel#top_candidates#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": null
  },
  {
    "evidenceId": "lucida-console",
    "generic": "monospace",
    "logicalFamily": "Lucida Console",
    "physicalFamily": "Noto Sans Mono",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "lucida-console__noto-sans-mono#monospace_cell#analytic_advance#2026-06-09",
      "lucida-console__noto-sans-mono#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "monospace_cell",
      "meanDelta": 0.00254,
      "maxDelta": 0.00303
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "cell_width_only",
      "bold": "cell_width_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "gill-sans-mt-condensed",
    "generic": "sans-serif",
    "logicalFamily": "Gill Sans MT Condensed",
    "physicalFamily": "PT Sans Narrow",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "gill-sans-mt-condensed__pt-sans-narrow#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "yu-mincho",
    "generic": "serif",
    "logicalFamily": "Yu Mincho",
    "physicalFamily": "BIZ UDMincho",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "yu-mincho_regular__biz-udmincho#regular#w400#cjk_jp_text#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "cjk_jp_text",
      "meanDelta": 0.0425,
      "maxDelta": 0.4829
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "ms-mincho",
    "generic": "serif",
    "logicalFamily": "MS Mincho",
    "physicalFamily": "BIZ UDMincho",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "ms-mincho_regular__biz-udmincho#regular#w400#cjk_jp_text#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "cjk_jp_text",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "cell_width_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "ms-gothic",
    "generic": "sans-serif",
    "logicalFamily": "MS Gothic",
    "physicalFamily": "BIZ UDGothic",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "ms-gothic_regular__biz-udgothic#regular#w400#cjk_jp_text#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "cjk_jp_text",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "cell_width_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "yu-gothic",
    "generic": "sans-serif",
    "logicalFamily": "Yu Gothic",
    "physicalFamily": "BIZ UDGothic",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "bold"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "yu-gothic_regular__biz-udgothic#regular#w400#cjk_jp_text#analytic_advance#2026-06-10",
      "yu-gothic_bold__biz-udgothic#bold#w700#cjk_jp_text#analytic_advance#2026-06-10"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "cjk_jp_text",
      "meanDelta": 0.0415,
      "maxDelta": 0.4521
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  },
  {
    "evidenceId": "aptos-display",
    "generic": "sans-serif",
    "logicalFamily": "Aptos Display",
    "physicalFamily": null,
    "verdict": "customer_supplied",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "not_run",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "customer_supplied",
    "measurementRefs": [],
    "exportRule": "preserve_original_name"
  },
  {
    "evidenceId": "cambria-math",
    "generic": "serif",
    "logicalFamily": "Cambria Math",
    "physicalFamily": null,
    "verdict": "preserve_only",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "not_run",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "preserve_only",
    "measurementRefs": [],
    "exportRule": "preserve_original_name"
  },
  {
    "evidenceId": "helvetica",
    "generic": "sans-serif",
    "logicalFamily": "Helvetica",
    "physicalFamily": "Liberation Sans",
    "verdict": "metric_safe",
    "faces": {
      "regular": true,
      "bold": true,
      "italic": true,
      "boldItalic": true
    },
    "gates": {
      "static": "not_run",
      "metric": "pass",
      "layout": "not_run",
      "ship": "pass"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "helvetica__liberation-sans#analytic_advance#2026-06-03"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "calibri-light",
    "generic": "sans-serif",
    "logicalFamily": "Calibri Light",
    "physicalFamily": "Carlito",
    "verdict": "visual_only",
    "faces": {
      "regular": false,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "gates": {
      "static": "not_run",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "calibri-light__carlito#analytic_advance#2026-06-05"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0.0148,
      "maxDelta": 0.066
    },
    "candidateLicense": "OFL-1.1"
  },
  {
    "evidenceId": "baskerville-old-face",
    "generic": "serif",
    "logicalFamily": "Baskerville Old Face",
    "physicalFamily": "Bacasime Antique",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "bold": {
        "kind": "synthetic",
        "from": "regular"
      },
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "regular"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "baskerville-old-face_regular__bacasime-antique#regular#w400#7dac1e5f#analytic_advance#2026-06-05",
      "baskerville-old-face__bacasime-antique#synthetic_faces#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0.4915590863952334
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    },
    "glyphExceptions": [
      {
        "slot": "regular",
        "codepoint": 160,
        "advanceDelta": 0.4916,
        "note": "Bacasime Antique Regular's no-break space (U+00A0) advance diverges ~49% from Baskerville Old Face; lines containing NBSP reflow. Every other Latin-core glyph is advance-identical, which is why this is visual_only with a single named exception, not near_metric."
      }
    ]
  },
  {
    "evidenceId": "brush-script-mt",
    "generic": "serif",
    "logicalFamily": "Brush Script MT",
    "physicalFamily": "Oregano Italic",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "bold": {
        "kind": "synthetic",
        "from": "regular"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "fail",
      "layout": "not_run",
      "ship": "fail"
    },
    "policyAction": "category_fallback",
    "measurementRefs": [
      "brush-script-mt__oregano-italic#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "visual_only",
      "bold": "visual_only"
    }
  },
  {
    "evidenceId": "cooper-black",
    "generic": "serif",
    "logicalFamily": "Cooper Black",
    "physicalFamily": "Caprasimo",
    "verdict": "visual_only",
    "faces": {
      "regular": true,
      "bold": false,
      "italic": false,
      "boldItalic": false
    },
    "faceSources": {
      "bold": {
        "kind": "synthetic",
        "from": "regular"
      },
      "italic": {
        "kind": "synthetic",
        "from": "regular"
      },
      "boldItalic": {
        "kind": "synthetic",
        "from": "regular"
      }
    },
    "gates": {
      "static": "pass",
      "metric": "pass",
      "layout": "not_run",
      "ship": "not_run"
    },
    "policyAction": "substitute",
    "measurementRefs": [
      "cooper-black_regular__caprasimo#regular#w400#786ab84e#analytic_advance#2026-06-05",
      "cooper-black__caprasimo#synthetic_faces#visual_review#2026-06-09"
    ],
    "exportRule": "preserve_original_name",
    "advance": {
      "basis": "latin_full",
      "meanDelta": 0,
      "maxDelta": 0
    },
    "candidateLicense": "OFL-1.1",
    "faceVerdicts": {
      "regular": "metric_safe",
      "bold": "visual_only",
      "italic": "visual_only",
      "boldItalic": "visual_only"
    }
  }
];

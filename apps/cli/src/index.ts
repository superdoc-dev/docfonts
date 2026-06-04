#!/usr/bin/env bun
/**
 * docfonts CLI (scaffold). Planned commands:
 *   docfonts compare <proprietary.ttf> <open.ttf>   measure advance deltas + face coverage + verdict
 *   docfonts scan-docx-fonts <file.docx>            list declared + proprietary fonts and resolution
 *
 * Operates on LOCAL files the user supplies (the BYO model). Never distributes proprietary fonts.
 */
const [cmd] = process.argv.slice(2);

if (cmd === "compare" || cmd === "scan-docx-fonts") {
  console.log(`docfonts: "${cmd}" is not implemented yet (scaffold).`);
  process.exit(1);
}

console.log("Usage: docfonts <compare|scan-docx-fonts> ...  (scaffold)");

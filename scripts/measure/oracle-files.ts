/**
 * Which files in an oracle directory the runner treats as font faces.
 *
 * .ttc (TrueType Collection) is included so collection-packaged oracles work - notably Cambria, which
 * macOS/Office install as Cambria.ttc (face 0 = Cambria, face 1 = Cambria Math). @docfonts/font-metadata
 * parses a .ttc's FIRST face, which is the wanted family here; the bold/italic faces ship as separate
 * .ttf files. A collection whose wanted face is NOT index 0 would need parser-level face enumeration -
 * a future enhancement, not required for the current oracle set.
 */
export function isOracleFontFile(name: string): boolean {
  return /\.(ttf|otf|ttc)$/i.test(name);
}

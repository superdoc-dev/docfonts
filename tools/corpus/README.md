# Corpus Tools

Local tools for finding open-font fallback candidates.

They download fonts into an ignored cache, compare a licensed local reference against that cache, and print ranked leads. They do not publish fallback decisions.

## Commands

```sh
bun run corpus:acquire
bun run corpus:compare -- --reference /path/to/reference.ttf --family "Verdana"
bun run corpus:bakeoff -- --reference /path/to/reference.ttf --candidate "Inter=/path/to/Inter.ttf"
```

## Acquire

```sh
bun run corpus:acquire -- --source google-fonts
```

Without `--source`, all configured sources are acquired. Use `DOCFONTS_SOURCE_CACHE` to choose a cache directory. The default is `.cache/corpus`.

## Compare

```sh
bun run corpus:compare -- \
  --reference /path/to/reference.ttf \
  --family "Lucida Console" \
  --source dejavu,noto-sans-mono \
  --model monospace
```

- `--reference` is required.
- `--family` is a report label.
- `--source` limits the acquired sources to compare. Without it, every acquired source is used.
- `--model latin` is the default. Proportional Latin ranking uses text-carrying codepoints for tier, mean, and max while still reporting full Latin outliers.
- `--model monospace` reports matching mono cells as `cell_width_only`, not `metric_safe`.

The advance tier stays the hard primary gate. Within a tier, rows sort by advance coverage, then `fcov`, then `fscore`, then mean advance delta. `fscore` is a typographic feature distance (0 means identical) blended from OS/2 weight, width, x-height, cap-height, PANOSE, and post italic angle; `fcov` shows how many of those features both fonts declared. Missing features are skipped, not scored as zero. `flags` marks strong advance matches whose features disagree enough to need review.

Comparison output is a lead finder. A public fallback row still needs review, provenance, face-scope checks, and visual sanity.

## Bake-off

```sh
bun run corpus:bakeoff -- \
  --reference /path/to/reference.ttf \
  --family "Arial Rounded MT Bold" \
  --candidate "Inter=/path/to/Inter.ttf" \
  --candidate "Nunito=/path/to/Nunito.ttf" \
  --visual
```

Bake-off compares a reference against a handful of manually chosen candidates side by side, printing the same advance and feature metrics per candidate. Pass `--visual` to add an experimental rendered-glyph difference column, which needs ImageMagick 7 (`magick`) on PATH; without it, no rendering is done. It calibrates the metrics against human judgment and writes nothing to the repo.

## Visual review

```sh
bun run corpus:visual -- \
  --reference /path/to/reference.ttf \
  --family "Verdana" \
  --candidate "Inter=/path/to/Inter.ttf" \
  --candidate "Nunito=/path/to/Nunito.ttf"
```

Visual review writes a small HTML app that loads the reference font and each candidate font, then shows live specimen rows and cyan/magenta overlays. Use it for the top candidates from `corpus:compare`.

- `--reference` and at least one `--candidate "Label=/path"` are required.
- `--reference` and `--candidate` are regular-face shorthands.
- Use `--reference-face face=/path` and `--candidate-face "Label:face=/path"` for `regular`, `bold`, `italic`, and `boldItalic`.
- `--family` is the report heading.
- `--out` sets the output path. A `.html` path is the file; any other path is a directory that receives `review.html`. The default is `.cache/corpus-visual/review.html`.

The generated app copies the selected font files into the ignored output directory so the browser can load them locally.

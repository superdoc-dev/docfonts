# Corpus Tools

Local tools for finding open-font fallback candidates.

They download fonts into an ignored cache, compare a licensed local reference against that cache, and print ranked leads. They do not publish fallback decisions.

## Commands

```sh
bun run corpus:acquire
bun run corpus:compare -- --reference /path/to/reference.ttf --family "Verdana"
bun run corpus:bakeoff -- --reference /path/to/reference.ttf --candidate "Inter=/path/to/Inter.ttf"
bun run corpus:app
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

Rows are ranked by advance tier, coverage, feature coverage (`fcov`), feature distance (`fscore`), then mean advance delta. `flags` marks strong advance matches whose font metadata disagrees enough to need review.

Comparison output is a lead finder, not a fallback decision.

## App

```sh
bun run corpus:app
```

The local app compares real reference faces against the corpus and shows the top candidates with overlays. It runs on localhost and stores temporary font files in `.cache/corpus-app`.

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

Visual review writes a small HTML page for a known shortlist of candidates.

- `--reference` and at least one `--candidate "Label=/path"` are required.
- `--reference` and `--candidate` are regular-face shorthands.
- Use `--reference-face face=/path` and `--candidate-face "Label:face=/path"` for `regular`, `bold`, `italic`, and `boldItalic`.
- `--family` is the report heading.
- `--out` sets the output path. A `.html` path is the file; any other path is a directory that receives `review.html`. The default is `.cache/corpus-visual/review.html`.

The generated app copies the selected font files into the ignored output directory so the browser can load them locally.

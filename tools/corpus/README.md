# Corpus Tools

Local tools for finding open-font fallback candidates.

They download fonts into an ignored cache, compare a licensed local reference against that cache, and print ranked leads. They do not publish fallback decisions.

## Commands

```sh
bun run corpus:acquire
bun run corpus:compare -- --reference /path/to/reference.ttf --family "Verdana"
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

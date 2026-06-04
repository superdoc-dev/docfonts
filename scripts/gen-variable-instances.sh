#!/usr/bin/env bash
# Generate static instances from a variable-font candidate, DETERMINISTICALLY, so the corpus can
# record reproducible generated-file hashes. This is the trusted reference path (fonttools) for
# variable candidates; docfonts does not instance variable fonts itself (see corpus instancedFrom).
#
# Requires: a Python venv with fonttools.  SOURCE_DATE_EPOCH=0 zeroes head.modified so output is
# byte-reproducible.  --update-name-table sets the RIBBI name/style bits from the fvar named instance,
# so wght=700 is recognized as Bold/BoldItalic (not "other").
#
# Usage: PY=/path/to/venv/bin/python scripts/gen-variable-instances.sh <vf.ttf> <wght> <out.ttf>
set -euo pipefail
PY="${PY:-python3}"
SRC="$1"; WGHT="$2"; OUT="$3"
SOURCE_DATE_EPOCH=0 "$PY" -m fontTools.varLib.instancer --update-name-table "$SRC" "wght=$WGHT" -o "$OUT" >/dev/null

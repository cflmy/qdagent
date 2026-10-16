#!/usr/bin/env bash
# Pack local marqdo ≥1.4.2 binary + ~/.marqdo (or workspace ext) into docker/ for image build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/docker"
mkdir -p "$DEST/bin" "$DEST/marqdo-home"

# Prefer workspace release binary (1.4.2+), then MARQDO_BIN, then PATH.
if [[ -z "${MARQDO_BIN:-}" ]]; then
  if [[ -x "$HOME/work/marqdo/target/release/marqdo" ]]; then
    MARQDO_BIN="$HOME/work/marqdo/target/release/marqdo"
  else
    MARQDO_BIN="$(command -v marqdo)"
  fi
fi
ver="$("$MARQDO_BIN" --version 2>/dev/null || true)"
if [[ "$ver" != *1.4* && "$ver" != *1.5* && "$ver" != *2.* ]]; then
  echo "pack-marqdo: need marqdo ≥1.4.2, got: $ver ($MARQDO_BIN)" >&2
  exit 1
fi
cp -f "$MARQDO_BIN" "$DEST/bin/marqdo"
chmod +x "$DEST/bin/marqdo"
echo "packed binary: $MARQDO_BIN ($("$DEST/bin/marqdo" --version))"

HOME_SRC="${MARQDO_HOME_SRC:-$HOME/.marqdo}"
if [[ -d "$HOME/work/marqdo/ext" ]]; then
  # Stage a minimal marqdo-home from workspace ext + native plugins.
  STAGE="$DEST/_stage_home"
  rm -rf "$STAGE"
  mkdir -p "$STAGE/ext" "$STAGE/native"
  rsync -a --delete \
    --exclude 'cache' \
    "$HOME/work/marqdo/ext/" "$STAGE/ext/"
  if [[ -d "$HOME/work/marqdo/ext/native" ]]; then
    rsync -a "$HOME/work/marqdo/ext/native/" "$STAGE/native/"
  fi
  HOME_SRC="$STAGE"
fi

rsync -a --delete \
  --exclude 'cache' \
  "$HOME_SRC/" "$DEST/marqdo-home/"

echo "packed: $DEST/marqdo-home (ext + native)"
rm -rf "$DEST/_stage_home" 2>/dev/null || true

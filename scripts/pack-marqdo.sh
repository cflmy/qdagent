#!/usr/bin/env bash
# Pack local marqdo 1.3.0+ binary + ~/.marqdo (or workspace ext) into docker/ for image build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/docker"
mkdir -p "$DEST/bin" "$DEST/marqdo-home"

MARQDO_BIN="${MARQDO_BIN:-$(command -v marqdo)}"
# Prefer freshly built 1.3.x next to the monorepo when present.
if [[ -x "$HOME/work/marqdo/target/release/marqdo" ]]; then
  ver="$("$HOME/work/marqdo/target/release/marqdo" --version 2>/dev/null || true)"
  if [[ "$ver" == *1.3* || "$ver" == *1.2* ]]; then
    MARQDO_BIN="$HOME/work/marqdo/target/release/marqdo"
  fi
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

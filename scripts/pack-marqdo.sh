#!/usr/bin/env bash
# Pack local marqdo binary + ~/.marqdo into docker/ for image build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/docker"
mkdir -p "$DEST/bin" "$DEST/marqdo-home"

cp -f "$(command -v marqdo)" "$DEST/bin/marqdo"
rsync -a --delete \
  --exclude 'cache' \
  "$HOME/.marqdo/" "$DEST/marqdo-home/"

echo "packed: $DEST/bin/marqdo"
echo "packed: $DEST/marqdo-home (ext + native)"

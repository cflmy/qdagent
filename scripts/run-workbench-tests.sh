#!/usr/bin/env bash
# L1/L2 workbench acceptance (T01–T17 slices). Requires Marqdo ≥2.1.3.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=marqdo-env.sh
source "$ROOT/scripts/marqdo-env.sh"
"$ROOT/scripts/probe-marqdo-capabilities.sh"

failed=0
for t in "$ROOT"/tests/workbench/t*.mq.md; do
  name="$(basename "$t")"
  echo "==> $name"
  if ! "$MARQDO_BIN" run --fs-root "$ROOT" "$t"; then
    echo "FAIL $name" >&2
    failed=$((failed + 1))
  fi
done
if [[ "$failed" -gt 0 ]]; then
  echo "$failed workbench test(s) failed" >&2
  exit 1
fi
echo "all workbench tests ok"

#!/usr/bin/env bash
# L1/L2 workbench acceptance (T01–T18 slices). Requires Marqdo ≥2.1.4.
# Set PLAYWRIGHT_REQUIRE_SERVER=1 (default) so browser gates cannot skip-green.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PLAYWRIGHT_REQUIRE_SERVER="${PLAYWRIGHT_REQUIRE_SERVER:-1}"
# shellcheck source=marqdo-env.sh
source "$ROOT/scripts/marqdo-env.sh"
"$ROOT/scripts/probe-marqdo-capabilities.sh"
python3 "$ROOT/scripts/check-contracts.py"
python3 "$ROOT/scripts/gate-concurrency-recovery.py"

# Auto-skip external network probes when upstream is unreachable (offline CI).
if [[ -z "${QDAGENT_SKIP_NETWORK:-}" ]]; then
  if ! curl -sS -m 2 -o /dev/null https://api.openai.com/v1/models 2>/dev/null; then
    export QDAGENT_SKIP_NETWORK=1
    echo "note: QDAGENT_SKIP_NETWORK=1 (openai.com unreachable)" >&2
  fi
fi

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
echo "all workbench tests ok (PLAYWRIGHT_REQUIRE_SERVER=${PLAYWRIGHT_REQUIRE_SERVER})"

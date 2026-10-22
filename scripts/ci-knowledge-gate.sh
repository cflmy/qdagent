#!/usr/bin/env bash
# Wave D-c — knowledge gates for CI / local.
# Always: thin /v1 framing check.
# If marqdo on PATH (or MARQDO_BIN): knowledge compile + verify (+ duplicate).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== check-v1-thin =="
"$ROOT/scripts/check-v1-thin.sh"

MARQDO_BIN="${MARQDO_BIN:-}"
if [[ -z "$MARQDO_BIN" ]]; then
  if command -v marqdo >/dev/null 2>&1; then
    MARQDO_BIN="$(command -v marqdo)"
  elif [[ -x "$ROOT/../marqdo/target/release/marqdo" ]]; then
    MARQDO_BIN="$ROOT/../marqdo/target/release/marqdo"
  fi
fi

if [[ -z "${MARQDO_BIN}" ]]; then
  if [[ "${REQUIRE_MARQDO:-0}" == "1" ]]; then
    echo "ci-knowledge-gate: marqdo required but not found" >&2
    exit 1
  fi
  echo "ci-knowledge-gate: SKIP knowledge/verify (marqdo not on PATH; set REQUIRE_MARQDO=1 to fail)"
  exit 0
fi

export PATH="$(dirname "$MARQDO_BIN"):$PATH"
# shellcheck source=marqdo-env.sh
source "$ROOT/scripts/marqdo-env.sh"
qdagent_resolve_marqdo

echo "== marqdo knowledge =="
"$ROOT/scripts/qdagent" knowledge

echo "== marqdo verify suite =="
"$ROOT/scripts/qdagent" verify

echo "== docgate selftest =="
DOCGATE_OUT=$("$MARQDO_BIN" run "$ROOT/execution/docgate-selftest.mq.md" | tail -1)
echo "$DOCGATE_OUT"
case "$DOCGATE_OUT" in
  *"\"passed\":true"*) ;;
  *) echo "DOCGATE SELFTEST FAILED" >&2; exit 1 ;;
esac

echo "== marqdo duplicate (report) =="
marqdo duplicate . -o .marqdo --json >/tmp/qd-ci-duplicate.json || true
if command -v python3 >/dev/null 2>&1; then
  python3 - <<'PY'
import json
d=json.load(open("/tmp/qd-ci-duplicate.json"))
n=len(d.get("duplicates") or [])
print(f"duplicates reported: {n} (informational; verify suite already gated)")
PY
else
  echo "duplicates reported: (python3 absent; report skipped — informational only)"
fi

echo "ci-knowledge-gate: OK"

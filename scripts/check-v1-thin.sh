#!/usr/bin/env bash
# C2b regression: /v1 must be Marqdo invoke (api.v1_*), not thick Python Agent.
# Legacy Python framing only when QDAGENT_V1_PYTHON=1 (emergency).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVE="$ROOT/serve.mq.md"
API="$ROOT/lib/api.mq.md"
MQ="$ROOT/scripts/mq.sh"
fail=0

grep -q 'api.v1_models' "$SERVE" || {
  echo "FAIL: serve.mq.md missing /v1/models → api.v1_models" >&2
  fail=1
}
grep -q 'api.v1_chat_completions' "$SERVE" || {
  echo "FAIL: serve.mq.md missing /v1/chat/completions → api.v1_chat_completions" >&2
  fail=1
}
# Must NOT proxy /v1 to Python by default.
if grep -E '\|/v1/chat/completions\|' "$SERVE" | grep -q 'v1_up\|7433'; then
  echo "FAIL: serve still proxies /v1 to Python upstream" >&2
  fail=1
fi
grep -q '## v1_chat_completions' "$API" || {
  echo "FAIL: lib/api.mq.md missing v1_chat_completions" >&2
  fail=1
}
grep -q 'QDAGENT_V1_PYTHON' "$MQ" || {
  echo "FAIL: mq.sh must gate legacy Python with QDAGENT_V1_PYTHON" >&2
  fail=1
}
# Default must be Python off.
if grep -E 'QDAGENT_V1_PYTHON:-\$\{QDAGENT_V1_PYTHON:-1\}|V1_PYTHON:-1' "$MQ" >/dev/null 2>&1; then
  echo "FAIL: QDAGENT_V1_PYTHON default must be 0 (C2b)" >&2
  fail=1
fi
GW="$ROOT/scripts/legacy/openai_v1_gateway.py"
grep -q 'thick_path_removed' "$GW" || {
  echo "FAIL: legacy gateway missing thick_path_removed marker" >&2
  fail=1
}

if [[ "$fail" -ne 0 ]]; then
  echo "check-v1-thin: FAILED" >&2
  exit 1
fi
echo "check-v1-thin: OK (C2b Marqdo /v1 invoke; Python framing opt-in only)"

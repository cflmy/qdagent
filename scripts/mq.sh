#!/usr/bin/env bash
# Run marqdo with qdagent defaults (Marqdo ≥ 1.4.4 / ADR 0007 Web Artifact).
# C2b: /v1 is served by Marqdo invoke (api.v1_*). Optional legacy Python framing
# only when QDAGENT_V1_PYTHON=1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=marqdo-env.sh
source "$ROOT/scripts/marqdo-env.sh"
qdagent_resolve_marqdo

export QDAGENT_DATA="${QDAGENT_DATA:-$ROOT/data}"
export QDAGENT_ROOT="${QDAGENT_ROOT:-$ROOT}"
export MARQDO_FS_ROOT="${MARQDO_FS_ROOT:-$ROOT}"
export QDAGENT_HOST="${QDAGENT_HOST:-127.0.0.1}"
export QDAGENT_PORT="${QDAGENT_PORT:-7431}"
export QDAGENT_V1_HOST="${QDAGENT_V1_HOST:-127.0.0.1}"
export QDAGENT_V1_PORT="${QDAGENT_V1_PORT:-7433}"
export QDAGENT_API_KEY="${QDAGENT_API_KEY:-qdagent-local}"
export QDAGENT_V1_EFI="${QDAGENT_V1_EFI:-1}"
cd "$ROOT"
mkdir -p "$QDAGENT_DATA"

start_v1_gateway() {
  # Default off — C2b Marqdo Endpoint/invoke owns /v1 on the main listen port.
  if [[ "${QDAGENT_V1_PYTHON:-0}" != "1" ]]; then
    return 0
  fi
  local health="http://${QDAGENT_V1_HOST}:${QDAGENT_V1_PORT}/health"
  if curl -fsS "$health" >/dev/null 2>&1; then
    echo "legacy /v1 Python framing already up :${QDAGENT_V1_PORT}"
    return 0
  fi
  python3 "$ROOT/scripts/legacy/openai_v1_gateway.py" >>"$QDAGENT_DATA/v1-gateway.log" 2>&1 &
  echo $! >"$QDAGENT_DATA/v1-gateway.pid"
  for _ in 1 2 3 4 5 6 7 8; do
    if curl -fsS "$health" >/dev/null 2>&1; then
      echo "legacy /v1 Python framing started :${QDAGENT_V1_PORT} (pid $(cat "$QDAGENT_DATA/v1-gateway.pid"))"
      return 0
    fi
    sleep 0.25
  done
  echo "warning: legacy /v1 Python did not become healthy on :${QDAGENT_V1_PORT}" >&2
}

if [[ "${QDAGENT_LEGACY_PROXY:-}" == "1" ]]; then
  export QDAGENT_PROXY_HOST="${QDAGENT_PROXY_HOST:-127.0.0.1}"
  export QDAGENT_PROXY_PORT="${QDAGENT_PROXY_PORT:-7432}"
  if ! curl -fsS "http://${QDAGENT_PROXY_HOST}:${QDAGENT_PROXY_PORT}/health" >/dev/null 2>&1; then
    python3 "$ROOT/scripts/legacy/llm_proxy.py" >>"$QDAGENT_DATA/llm-proxy.log" 2>&1 &
    echo $! >"$QDAGENT_DATA/llm-proxy.pid"
    echo "legacy llm-proxy started :${QDAGENT_PROXY_PORT}"
  fi
fi

start_v1_gateway

# Default entry is serve.mq.md (ADR 0007).
if [[ $# -eq 0 ]]; then
  set -- run serve.mq.md
elif [[ "$1" == "run" && $# -eq 1 ]]; then
  set -- run serve.mq.md
fi

exec marqdo "$@"

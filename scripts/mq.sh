#!/usr/bin/env bash
# Run marqdo with qdagent defaults (Marqdo 0.3.7+ — no Python side proxy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export MARQDO_EXT="${MARQDO_EXT:-$HOME/.marqdo/ext}"
export MARQDO_LIB="${MARQDO_LIB:-$HOME/.marqdo/lib}"
export QDAGENT_DATA="${QDAGENT_DATA:-$ROOT/data}"
export QDAGENT_HOST="${QDAGENT_HOST:-127.0.0.1}"
export QDAGENT_PORT="${QDAGENT_PORT:-7431}"
cd "$ROOT"

# Optional legacy Python CORS proxy (pre-0.3.7). Default: off.
if [[ "${QDAGENT_LEGACY_PROXY:-}" == "1" ]]; then
  export QDAGENT_PROXY_HOST="${QDAGENT_PROXY_HOST:-127.0.0.1}"
  export QDAGENT_PROXY_PORT="${QDAGENT_PROXY_PORT:-7432}"
  if ! curl -fsS "http://${QDAGENT_PROXY_HOST}:${QDAGENT_PROXY_PORT}/health" >/dev/null 2>&1; then
    python3 "$ROOT/scripts/legacy/llm_proxy.py" >>"$ROOT/data/llm-proxy.log" 2>&1 &
    echo $! >"$ROOT/data/llm-proxy.pid"
    echo "legacy llm-proxy started :${QDAGENT_PROXY_PORT}"
  fi
fi

exec marqdo "$@"

#!/usr/bin/env bash
# Run marqdo (+ optional LLM CORS proxy) with qdagent defaults.
# Proxy is a temporary host for GAP-01/02/04 — doc/gaps/01-marqdo-hard-limits.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export MARQDO_EXT="${MARQDO_EXT:-$HOME/.marqdo/ext}"
export QDAGENT_DATA="${QDAGENT_DATA:-$ROOT/data}"
export QDAGENT_HOST="${QDAGENT_HOST:-127.0.0.1}"
export QDAGENT_PORT="${QDAGENT_PORT:-7431}"
export QDAGENT_PROXY_HOST="${QDAGENT_PROXY_HOST:-127.0.0.1}"
export QDAGENT_PROXY_PORT="${QDAGENT_PROXY_PORT:-7432}"
cd "$ROOT"

start_proxy() {
  if [[ "${QDAGENT_NO_PROXY:-}" == "1" ]]; then
    return 0
  fi
  if curl -fsS "http://${QDAGENT_PROXY_HOST}:${QDAGENT_PROXY_PORT}/health" >/dev/null 2>&1; then
    echo "llm-proxy already up on :${QDAGENT_PROXY_PORT}"
    return 0
  fi
  python3 "$ROOT/scripts/llm_proxy.py" >>"$ROOT/data/llm-proxy.log" 2>&1 &
  echo $! >"$ROOT/data/llm-proxy.pid"
  sleep 0.4
  if curl -fsS "http://${QDAGENT_PROXY_HOST}:${QDAGENT_PROXY_PORT}/health" >/dev/null 2>&1; then
    echo "llm-proxy started pid=$(cat "$ROOT/data/llm-proxy.pid") :${QDAGENT_PROXY_PORT}"
  else
    echo "warning: llm-proxy failed to start — see data/llm-proxy.log" >&2
  fi
}

# Auto-start proxy when serving the web app
if [[ "${1:-}" == "run" ]] && [[ "${2:-}" == "index.mq.md" || "${2:-}" == "./index.mq.md" || -z "${2:-}" ]]; then
  start_proxy
fi

exec marqdo "$@"

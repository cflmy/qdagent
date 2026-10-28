#!/usr/bin/env bash
# Bring qdagent Web up safely: build SPA → (re)start serve → verify assets.
#
# Why: serve.mq.md boot-reads public/app/index.html once (lib/spa.bootstrap).
# A Vite rebuild that changes content hashes without restarting serve leaves
# the HTML pointing at missing /static/app/assets/index-*.js → blank page.
#
# Usage:
#   scripts/qdagent-up.sh              # build + restart + check
#   SKIP_BUILD=1 scripts/qdagent-up.sh # restart only (SPA already built)
#   FOREGROUND=1 scripts/qdagent-up.sh # build then exec serve in foreground
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
export QDAGENT_API_KEY="${QDAGENT_API_KEY:-qdagent-local}"
export PATH="$(dirname "$MARQDO_BIN"):$PATH"

LOG="${QDAGENT_SERVE_LOG:-/tmp/qdagent-serve.log}"
PID_FILE="${QDAGENT_DATA}/serve.pid"
INDEX_HTML="$ROOT/public/app/index.html"
SKIP_BUILD="${SKIP_BUILD:-0}"
FOREGROUND="${FOREGROUND:-0}"

cd "$ROOT"
mkdir -p "$QDAGENT_DATA"

build_spa() {
  if [[ "$SKIP_BUILD" == "1" ]]; then
    echo "qdagent-up: SKIP_BUILD=1 — not rebuilding frontend"
    return 0
  fi
  echo "qdagent-up: building frontend (Vite → public/app)…"
  (
    cd "$ROOT/frontend"
    # Prefer full build; tsc may fail on pre-existing reader typings — fall back to vite-only.
    if npm run build; then
      :
    else
      echo "qdagent-up: npm run build failed (tsc?); falling back to npm run build:spa" >&2
      npm run build:spa
    fi
  )
  if [[ ! -f "$INDEX_HTML" ]]; then
    echo "qdagent-up: missing $INDEX_HTML after build" >&2
    exit 1
  fi
  echo "qdagent-up: SPA index → $INDEX_HTML"
}

stop_local_serve() {
  local pids=()
  # Prefer PID file from a previous qdagent-up.
  if [[ -f "$PID_FILE" ]]; then
    local old
    old="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$old" ]] && kill -0 "$old" 2>/dev/null; then
      pids+=("$old")
    fi
  fi
  # Also anything listening on our port (local marqdo only).
  if command -v ss >/dev/null 2>&1; then
    local listen_pids
    listen_pids="$(ss -ltnp "sport = :${QDAGENT_PORT}" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
    local p
    for p in $listen_pids; do
      # Skip containerized / other-user processes we cannot signal.
      if [[ -r "/proc/$p/cmdline" ]] && tr '\0' ' ' <"/proc/$p/cmdline" | grep -q 'serve.mq.md'; then
        pids+=("$p")
      fi
    done
  fi
  if [[ ${#pids[@]} -eq 0 ]]; then
    echo "qdagent-up: no local serve on :${QDAGENT_PORT}"
    return 0
  fi
  local uniq
  uniq="$(printf '%s\n' "${pids[@]}" | sort -u)"
  echo "qdagent-up: stopping serve pid(s): $(echo "$uniq" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill $uniq 2>/dev/null || true
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    local alive=0
    for p in $uniq; do
      if kill -0 "$p" 2>/dev/null; then alive=1; fi
    done
    if [[ "$alive" -eq 0 ]]; then break; fi
    sleep 0.3
  done
  for p in $uniq; do
    if kill -0 "$p" 2>/dev/null; then
      echo "qdagent-up: force-kill $p" >&2
      kill -9 "$p" 2>/dev/null || true
    fi
  done
  rm -f "$PID_FILE"
}

start_serve() {
  echo "qdagent-up: starting serve on http://${QDAGENT_HOST}:${QDAGENT_PORT}…"
  if [[ "$FOREGROUND" == "1" ]]; then
    exec "$ROOT/scripts/mq.sh" run serve.mq.md
  fi
  nohup "$ROOT/scripts/mq.sh" run serve.mq.md >>"$LOG" 2>&1 &
  echo $! >"$PID_FILE"
  echo "qdagent-up: pid $(cat "$PID_FILE")  log $LOG"
}

wait_listen() {
  local i
  for i in $(seq 1 40); do
    if curl -fsS -o /dev/null "http://${QDAGENT_HOST}:${QDAGENT_PORT}/account/login" 2>/dev/null; then
      return 0
    fi
    sleep 0.25
  done
  echo "qdagent-up: serve did not become ready on :${QDAGENT_PORT}" >&2
  tail -n 40 "$LOG" >&2 || true
  exit 1
}

verify_spa() {
  echo "qdagent-up: verifying SPA asset wiring…"
  local cookie html refs missing=0 ref code
  cookie="$(mktemp)"
  curl -fsS -c "$cookie" -b "$cookie" \
    -X POST "http://${QDAGENT_HOST}:${QDAGENT_PORT}/account/login" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'username=demo&password=demo' -o /dev/null || true
  html="$(curl -fsS -b "$cookie" "http://${QDAGENT_HOST}:${QDAGENT_PORT}/" || true)"
  rm -f "$cookie"
  if [[ -z "$html" ]]; then
    echo "qdagent-up: empty home HTML" >&2
    exit 1
  fi
  if ! echo "$html" | grep -q 'id="root"'; then
    echo "qdagent-up: home HTML missing #root (SPA not injected)" >&2
    echo "$html" | head -c 400 >&2
    exit 1
  fi
  refs="$(echo "$html" | grep -oE '/static/app/assets/[^"[:space:]>]+' | sort -u || true)"
  if [[ -z "$refs" ]]; then
    echo "qdagent-up: no /static/app/assets/ refs in home HTML — blank page risk" >&2
    exit 1
  fi
  while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    code="$(curl -sS -o /dev/null -w '%{http_code}' "http://${QDAGENT_HOST}:${QDAGENT_PORT}${ref}")"
    echo "  $ref → $code"
    if [[ "$code" != "200" ]]; then
      missing=1
    fi
  done <<<"$refs"
  if [[ "$missing" -ne 0 ]]; then
    echo "qdagent-up: FAIL — hashed assets 404 (rebuild + restart mismatch)" >&2
    exit 1
  fi
  # Disk index must match what serve boot-read.
  local disk_js
  disk_js="$(grep -oE 'index-[^"/]+\.js' "$INDEX_HTML" | head -1 || true)"
  local served_js
  served_js="$(echo "$refs" | grep -oE 'index-[^"/]+\.js' | head -1 || true)"
  if [[ -n "$disk_js" && -n "$served_js" && "$disk_js" != "$served_js" ]]; then
    echo "qdagent-up: FAIL — disk index has $disk_js but serve injected $served_js (stale boot)" >&2
    exit 1
  fi
  echo "qdagent-up: OK — SPA assets match boot-read index ($served_js)"
}

build_spa
stop_local_serve
start_serve
wait_listen
verify_spa
echo "qdagent-up: open http://${QDAGENT_HOST}:${QDAGENT_PORT}/"

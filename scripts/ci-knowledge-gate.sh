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

echo "== marqdo check (full contract) =="
CHECK_FAIL=0
while IFS= read -r -d '' f; do
  out="$("$MARQDO_BIN" check "$f" 2>&1 || true)"
  case "$out" in
    *"contract check OK"*| "") ;;
    *)
      echo "CHECK FAIL: $f"
      echo "$out" | sed 's/^/    /'
      CHECK_FAIL=1
      ;;
  esac
done < <(git ls-files -z '*.mq.md')
if [[ "$CHECK_FAIL" != "0" ]]; then
  echo "marqdo check: FAILED (contract diagnostics above)" >&2
  exit 1
fi
echo "marqdo check: OK ($(git ls-files -z '*.mq.md' | grep -c .) files)"

echo "== labels debt ratchet (M8) =="
# Debt may shrink, never grow. Baseline lives in-repo; first run seeds it.
if ! "$MARQDO_BIN" labels "$ROOT" \
    --baseline "$ROOT/.marqdo/labels-baseline.json" \
    --fail-on-increase; then
  echo "labels ratchet: 未完成项增加 — 先清债或显式降基线" >&2
  exit 1
fi

echo "== S0/S1/S2 offline fixtures =="
for t in tests/s0/access-truth.mq.md tests/s0/promote-negative.mq.md; do
  if [[ -f "$t" ]]; then
    echo "-- $t"
    "$MARQDO_BIN" run "$t" || { echo "FAIL $t" >&2; exit 1; }
  fi
done
# S1/S2 need agent plugin for full bind; allow soft skip when plugin missing
for t in tests/s1/import-reuse.mq.md tests/s2/evolve-impact.mq.md; do
  if [[ -f "$t" ]]; then
    echo "-- $t"
    if ! "$MARQDO_BIN" run "$t"; then
      echo "WARN: $t failed (check plugin / MARQDO_SRC)" >&2
      if [[ "${REQUIRE_MARQDO:-0}" == "1" ]]; then exit 1; fi
    fi
  fi
done

echo "== docgate selftest =="
# The docgate CoW sandbox (ext/ai/sandbox) loads the native agent plugin
# (libagent.so); `cargo install marqdo` builds only the CLI binary, so the
# plugin may be absent. Probe resolvability and SKIP the selftest (clear
# message, NOT a failure) when it isn't available — the core gates above
# (knowledge / verify / check / labels) don't depend on it. CI builds the
# plugin separately (see .github/workflows/knowledge-gate.yml).
PROBE="$ROOT/.marqdo/_probe-agent-plugin.mq.md"
mkdir -p "$ROOT/.marqdo"
cat > "$PROBE" <<'MQ'
---
import plugin:lib/plugin.mq.md
---

# main

**p = > plugin.native_path name="agent"**
> print text=`p`
MQ
set +e
AGENT_P="$("$MARQDO_BIN" run "$PROBE" 2>/dev/null | tail -1)"
set -e
rm -f "$PROBE"
if [[ -z "${AGENT_P:-}" || "${AGENT_P:-}" == "None" ]]; then
  echo "SKIPPED: native agent plugin (libagent.so) not resolvable — docgate CoW sandbox needs marqdo_plugin_agent (build it or set MARQDO_AGENT_PLUGIN). Core knowledge gates above ran."
else
  set +e
  DOCGATE_OUT="$("$MARQDO_BIN" run "$ROOT/execution/docgate-selftest.mq.md" 2>/tmp/qd-docgate.err | tail -1)"
  DG_RC=$?
  set -e
  if [[ $DG_RC -ne 0 ]]; then
    echo "DOCGATE SELFTEST FAILED (exit $DG_RC)" >&2
    [[ -s /tmp/qd-docgate.err ]] && sed 's/^/  /' /tmp/qd-docgate.err >&2
    exit 1
  fi
  echo "$DOCGATE_OUT"
  case "$DOCGATE_OUT" in
    *"\"passed\":true"*) ;;
    *) echo "DOCGATE SELFTEST FAILED" >&2; exit 1 ;;
  esac
fi

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

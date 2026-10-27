#!/usr/bin/env bash
# Segment timing for Engineering Preflight hot path (warm).
# Usage: from qdagent root, with marqdo on PATH (prefer freshly built release).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
MQ="${MARQDO_BIN:-marqdo}"
TASK="${1:-ping engineering preflight}"

echo "== bench-preflight (root=${ROOT}, mq=$(command -v "${MQ}")) =="

if [[ ! -f .marqdo/ekc/graph/ir.json ]]; then
  echo "-- cold compile (once) --"
  time "${MQ}" knowledge "${ROOT}" -o .marqdo
fi

echo "-- warm knowledge preflight --"
time "${MQ}" knowledge preflight "${TASK}" "${ROOT}" -o .marqdo --json >/tmp/qd-pf-warm.json || true
echo "  decision=$(python3 -c "import json;print(json.load(open('/tmp/qd-pf-warm.json')).get('decision'))" 2>/dev/null || echo '?')"

echo "-- warm labels-pending-cached (1st may miss) --"
export QDAGENT_LABELS_ROOT="${ROOT}"
export MARQDO_BIN="${MQ}"
time bash scripts/labels-pending-cached.sh >/tmp/qd-labels1.json
echo "-- warm labels-pending-cached (2nd hit) --"
time bash scripts/labels-pending-cached.sh >/tmp/qd-labels2.json

echo "-- product 求道-预检 (pf.run = knowledge preflight + labels) --"
export QDAGENT_ROOT="${ROOT}"
export QDAGENT_TASK="${TASK}"
time "${MQ}" run cli/求道-预检.mq.md >/tmp/qd-cli-pf.out || true
tail -n 5 /tmp/qd-cli-pf.out || true

echo "== done =="

#!/usr/bin/env bash
# Product-face pending labels with fingerprint cache.
# Product dirs only (not tests/). CI ratchet still uses full-root `marqdo labels --baseline`.
# stdout: JSON array of label rows (same as `marqdo labels --json`).
set -euo pipefail

ROOT="${QDAGENT_LABELS_ROOT:-.}"
MQ="${MARQDO_BIN:-marqdo}"
CACHE="${ROOT}/.marqdo/labels-pending.json"
VER="v1"

fingerprint() {
  (
    for d in knowledge agent policies lib execution gateway; do
      if [[ -d "${ROOT}/${d}" ]]; then
        find "${ROOT}/${d}" -name '*.mq.md' -printf '%P\t%T@\t%s\n' 2>/dev/null || true
      fi
    done
    for f in serve.mq.md index.mq.md; do
      if [[ -f "${ROOT}/${f}" ]]; then
        printf '%s\t%s\t%s\n' "${f}" "$(stat -c %Y "${ROOT}/${f}")" "$(stat -c %s "${ROOT}/${f}")"
      fi
    done
  ) | sort | sha256sum | awk '{print $1}'
}

FP="${VER}:$(fingerprint)"

if [[ -f "${CACHE}" ]]; then
  OLD="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('fingerprint',''))" "${CACHE}" 2>/dev/null || true)"
  if [[ "${OLD}" == "${FP}" ]]; then
    python3 -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1])).get('rows',[]), ensure_ascii=False))" "${CACHE}"
    exit 0
  fi
fi

ARGS=()
for d in knowledge agent policies lib execution gateway; do
  [[ -d "${ROOT}/${d}" ]] && ARGS+=("${ROOT}/${d}")
done
for f in serve.mq.md index.mq.md; do
  [[ -f "${ROOT}/${f}" ]] && ARGS+=("${ROOT}/${f}")
done
if [[ ${#ARGS[@]} -eq 0 ]]; then
  ARGS+=("${ROOT}")
fi

ROWS="$("${MQ}" labels "${ARGS[@]}" --json 2>/dev/null || echo '[]')"
mkdir -p "${ROOT}/.marqdo"
python3 -c "
import json, sys
fp, rows_s, path = sys.argv[1], sys.argv[2], sys.argv[3]
rows = json.loads(rows_s)
json.dump({'fingerprint': fp, 'rows': rows}, open(path, 'w'), ensure_ascii=False)
print(rows_s)
" "${FP}" "${ROWS}" "${CACHE}"

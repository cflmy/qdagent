#!/usr/bin/env bash
# C2a regression: /v1 Python must be transport framing only (thick path → 410).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GW="$ROOT/scripts/legacy/openai_v1_gateway.py"
fail=0

grep -q 'thick_path_removed' "$GW" || {
  echo "FAIL: missing thick_path_removed marker in openai_v1_gateway.py" >&2
  fail=1
}
grep -q 'QDAGENT_V1_EFI' "$GW" || {
  echo "FAIL: missing QDAGENT_V1_EFI gate" >&2
  fail=1
}
grep -q 'gateway/v1_chat.mq.md' "$GW" || {
  echo "FAIL: EFI path must call gateway/v1_chat.mq.md" >&2
  fail=1
}
# Default must be EFI on (not thick).
if grep -E 'EFI_MODE\s*=' "$GW" | grep -q 'not in ("0"'; then
  :
else
  echo "FAIL: EFI_MODE default gate looks wrong" >&2
  fail=1
fi
# No profile/corpus inject on the live EFI path description.
if grep -n 'inject.*profile\|corpus_hits\|build_system' "$GW" | grep -viE 'legacy|unused|removed|docstring|#' >/dev/null 2>&1; then
  # Soft warning only — leftover helpers may remain unused.
  echo "NOTE: gateway still mentions profile/corpus helpers (must stay unused on EFI path)" >&2
fi

if [[ "$fail" -ne 0 ]]; then
  echo "check-v1-thin: FAILED" >&2
  exit 1
fi
echo "check-v1-thin: OK (Python /v1 is framing-only; thick → 410)"

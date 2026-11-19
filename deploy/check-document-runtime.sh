#!/usr/bin/env bash
# Strict source-first validation; the agent architecture has no root-skill stage
# and no pages-based business controller.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v marqdo >/dev/null || { echo 'marqdo is required' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'python3 is required' >&2; exit 1; }
count=0
while IFS= read -r source; do
    [[ -z "$source" ]] && continue
    output="$(marqdo check "$source" --json)" || { echo "$source failed compiler check" >&2; exit 1; }
    python3 -c 'import json,sys; value=json.load(sys.stdin); rows=value if isinstance(value,list) else [value]; sys.exit(1 if any(isinstance(r,dict) and r.get("severity")=="error" for r in rows) else 0)' <<<"$output" || { echo "$source has compiler diagnostics" >&2; exit 1; }
    count=$((count+1))
done < <(find agent skills workflows ext/office -type f -name '*.mq.md' | sort)
printf 'Checked %s Marqdo capability and workflow documents\n' "$count"

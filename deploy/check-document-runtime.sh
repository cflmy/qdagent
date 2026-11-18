#!/usr/bin/env bash
# Validate the document runtime before building an installable image.
set -uo pipefail
cd "$(dirname "$0")/.."
for dependency in marqdo rg python3; do
    if ! command -v "$dependency" >/dev/null; then
        printf 'Missing document-check dependency: %s\n' "$dependency" >&2
        exit 1
    fi
done
sources=$(rg --files ext/knowledge ext/root-skill ext/browser ext/search ext/ocr ext/plugins.mq.md pages/control/plugins.mq.md docs skills/marqdo-dev deploy/index.mq.md deploy/manage.mq.md deploy/agent-verify.mq.md deploy/model-key.mq.md deploy/services.mq.md tests/small-model-memory.mq.md tests/root-dag-scheduling.mq.md tests/knowledge-projections.mq.md tests/knowledge-proof-execution.mq.md tests/ext/ai-native-flow.mq.md tests/ext/ai-native-workflow.mq.md tests/fixtures/document-agent tests/fixtures/function-sections.mq.md tests/fixtures/office-scenario.mq.md tests/fixtures/knowledge-scenario.mq.md tests/fixtures/proof-scope ext/office pages/agent/catalog.mq.md pages/agent/executor.mq.md -g '*.mq.md') || exit 1
failed=0
while IFS= read -r source; do
    if ! diagnostics=$(marqdo check "$source" --narrative-ratio --json); then
        failed=1
    fi
    if [[ -n "$diagnostics" ]]; then
        printf '%s\n' "$diagnostics"
        if python3 -c 'import json,sys; v=json.load(sys.stdin); ds=v if isinstance(v,list) else [v]; raise SystemExit(1 if any(isinstance(d,dict) and d.get("severity")=="error" for d in ds) else 0)' <<< "$diagnostics"; then
            : # diagnostics carry no error
        else
            failed=1
        fi
    fi
done <<< "$sources"
exit "$failed"

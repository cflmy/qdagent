#!/usr/bin/env bash
# Run marqdo with qdagent defaults (ext from ~/.marqdo/ext).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export MARQDO_EXT="${MARQDO_EXT:-$HOME/.marqdo/ext}"
export QDAGENT_DATA="${QDAGENT_DATA:-$ROOT/data}"
export QDAGENT_HOST="${QDAGENT_HOST:-127.0.0.1}"
export QDAGENT_PORT="${QDAGENT_PORT:-7431}"
cd "$ROOT"
exec marqdo "$@"

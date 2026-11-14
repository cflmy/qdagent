#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
(cd server && go build -buildvcs=false -o ../.marqdo/qdagent-go ./cmd/qdagent)
npm run --prefix frontend build
if [ -z "${QDAGENT_BROWSER:-}" ] && [ -x .marqdo/docker-context/browser/chromium/chrome ]; then
 export QDAGENT_BROWSER="$PWD/.marqdo/docker-context/browser/chromium/chrome"
fi
QDAGENT_START_TEST_SERVER=1 npx --prefix frontend playwright test -c frontend/playwright.config.ts "$@"

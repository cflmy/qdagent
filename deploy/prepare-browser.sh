#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
browser_context=.marqdo/docker-context/browser
mkdir -p "$browser_context/node_modules"
cp -a frontend/node_modules/playwright-core "$browser_context/node_modules/"
if [ ! -x "$browser_context/chromium/chrome" ]; then
    browser_source=${QDAGENT_CHROMIUM_SOURCE:-}
    if [ -z "$browser_source" ]; then
        PLAYWRIGHT_BROWSERS_PATH="$PWD/.marqdo/browser-cache" node frontend/node_modules/playwright-core/cli.js install chromium
        browser_source=$(PLAYWRIGHT_BROWSERS_PATH="$PWD/.marqdo/browser-cache" node --input-type=module -e "import {chromium} from './frontend/node_modules/playwright-core/index.mjs';import path from 'node:path';process.stdout.write(path.dirname(chromium.executablePath()))")
    fi
    test -x "$browser_source/chrome"
    cp -a "$browser_source" "$browser_context/chromium"
fi
mkdir -p .marqdo/secrets
if [ ! -f .marqdo/secrets/browser_token ]; then
    (umask 077; openssl rand -hex 32 > .marqdo/secrets/browser_token)
fi
# Both non-root containers receive this fixed supplementary group; never log the key.
chgrp 10003 .marqdo/secrets/browser_token
chmod 0440 .marqdo/secrets/browser_token

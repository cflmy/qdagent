#!/bin/sh
# Conventional build entry; no model task or credential enters the image context.
set -eu
cd "$(dirname "$0")/.."
mkdir -p .marqdo/docker-context/bin
install -m 0755 "${MARQDO_BIN:-/usr/local/bin/marqdo}" .marqdo/docker-context/bin/marqdo
(cd server && go mod vendor -o ../.marqdo/go-vendor)
docker compose build qdagent

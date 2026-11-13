#!/bin/sh
# Conventional build entry; no model task or credential enters the image context.
set -eu
cd "$(dirname "$0")/.."
cargo build --offline --locked --manifest-path ext/qdagent/native/Cargo.toml --target-dir .marqdo/native-target
install -m 0755 .marqdo/native-target/debug/libqdagent_transport.so ext/native/libqdagent_transport.next.so
mv ext/native/libqdagent_transport.next.so ext/native/libqdagent_transport.so
install -m 0755 .marqdo/native-target/debug/qdagent-worker ext/native/qdagent-worker.next
mv ext/native/qdagent-worker.next ext/native/qdagent-worker
mkdir -p .marqdo/docker-context/bin
install -m 0755 "${MARQDO_BIN:-/usr/local/bin/marqdo}" .marqdo/docker-context/bin/marqdo
(cd server && go mod vendor -o ../.marqdo/go-vendor)
docker compose build qdagent

#!/bin/sh
# Only a disposable container, synthetic PDF and explicitly configured OCR token.
set -eu
cd "$(dirname "$0")/.."
docker compose up -d search
docker run --rm -i --network qdagent_default --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true --user 10001:10001 --group-add 10003 \
  --tmpfs /tmp:uid=10001,gid=10001,mode=1777,size=64m \
  --tmpfs /app/data:uid=10001,gid=10001,mode=0700,size=16m \
  --tmpfs /app/pages/data:uid=10001,gid=10001,mode=0700,size=16m \
  --pids-limit 128 --memory 768m \
  -v "$PWD/.marqdo/secrets/paddleocr_token:/run/paddleocr_token:ro" \
  -e QDAGENT_OCR_TOKEN_FILE=/run/paddleocr_token \
  --entrypoint python3 qdagent:local - < tests/live_services.py

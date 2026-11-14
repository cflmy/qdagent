#!/bin/sh
# Isolated browser + real Marqdo ABI contract check; never replaces production.
set -eu
cd "$(dirname "$0")/.."
bash deploy/prepare-browser.sh
browser_test_container="qdagent-browser-check-$$"
trap 'docker rm -f "$browser_test_container" >/dev/null 2>&1 || true' EXIT INT TERM
docker run -d --name "$browser_test_container" --init --read-only --cap-drop ALL \
 --security-opt no-new-privileges:true --security-opt "seccomp=$PWD/browser-sandbox/seccomp_profile.json" \
 --user 10002:10002 --group-add 10003 --tmpfs /tmp:uid=10002,gid=10002,mode=1777,size=256m \
 --shm-size 256m --memory 1536m --pids-limit 384 \
 -v "$PWD/.marqdo/secrets/browser_token:/run/browser_token:ro" \
 -e BROWSER_KEY_FILE=/run/browser_token -e BROWSER_TEST_MODE=1 -e BROWSER_TEST_ORIGIN=http://127.0.0.1:7431 \
 qdagent-browser:local >/dev/null
docker exec -d "$browser_test_container" node test/fixture.mjs
docker exec "$browser_test_container" node --input-type=module -e 'for(let i=0;i<50;i++){try{if((await fetch("http://127.0.0.1:7318/healthz")).ok)process.exit(0)}catch{}await new Promise(r=>setTimeout(r,100))}process.exit(1)'
docker exec "$browser_test_container" node --test network.test.mjs test/integration.mjs
browser_test_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$browser_test_container")
QDAGENT_BROWSER_URL="http://$browser_test_ip:7318" QDAGENT_BROWSER_KEY_FILE="$PWD/.marqdo/secrets/browser_token" \
 python3 -m unittest discover -s tests -p test_native_workbook.py

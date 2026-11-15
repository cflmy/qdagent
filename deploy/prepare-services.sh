#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 - <<'PY'
import os
from pathlib import Path
import secrets
directory = Path('.marqdo/secrets')
directory.mkdir(parents=True, exist_ok=True)
target = directory / 'search_settings.yml'
template = Path('deploy/search-settings.yml').read_text()
if target.exists():
    # Keep service signing identity when updating the public engine settings.
    secret = next(line.strip().split(': ', 1)[1] for line in target.read_text().splitlines() if line.strip().startswith('secret_key: '))
else:
    secret = secrets.token_hex(32)
target.write_text(template.replace('REPLACE_PRIVATE_SECRET', secret))
os.chmod(target, 0o440)
os.chown(target, -1, 977)
token = directory / 'paddleocr_token'
if not token.exists():
    raise SystemExit('Configure the private .marqdo/secrets/paddleocr_token before building')
os.chmod(token, 0o440)
os.chown(token, -1, 10003)
PY

#!/usr/bin/env bash
# Wave0: require Marqdo CLI/ext ≥2.1.3 and probe workbench capability bits.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=marqdo-env.sh
source "$ROOT/scripts/marqdo-env.sh"
qdagent_resolve_marqdo || exit $?

FIX="$ROOT/contracts/fixtures/workbench/capabilities-probe.json"
need_ver="$(python3 -c "import json; print(json.load(open('$FIX'))['required_min_version'])")"
if ! _qdagent_semver_ge "${QDAGENT_MARQDO_VERSION}" "$need_ver"; then
  echo "probe: CLI ${QDAGENT_MARQDO_VERSION} < required ${need_ver}" >&2
  exit 1
fi

caps_file="$(mktemp)"
trap 'rm -f "$caps_file"' EXIT
printf '%s\n' '{"id":1,"method":"capabilities","params":{}}' | "$MARQDO_BIN" mlsp >"$caps_file" || true

python3 - "$caps_file" "$FIX" "${QDAGENT_MARQDO_VERSION}" <<'PY'
import json, sys
path, fix_path, ver = sys.argv[1], sys.argv[2], sys.argv[3]
fix = json.load(open(fix_path))
raw = open(path).read().strip()
try:
    msg = json.loads(raw.splitlines()[-1] if raw else "{}")
except Exception as e:
    print(f"probe: capabilities JSON parse failed: {e}", file=sys.stderr)
    sys.exit(1)
if not msg.get("ok"):
    print(f"probe: capabilities not ok: {msg}", file=sys.stderr)
    sys.exit(1)
result = msg.get("result") or {}
features = result.get("features") or {}
adapters = {a.get("id"): a for a in (result.get("adapters") or []) if isinstance(a, dict)}
for want in fix.get("adapters") or []:
    if want.get("available") is False:
        got = adapters.get(want["id"])
        if got and got.get("available") is True:
            print(f"probe: adapter {want['id']} unexpectedly available", file=sys.stderr)
            sys.exit(1)
print(json.dumps({"ok": True, "version": ver, "feature_keys": list(features)[:16]}, ensure_ascii=False))
PY

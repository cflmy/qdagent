#!/usr/bin/env bash
# Stable push through proxy.cflmy.top (HK → GitHub).
#
# Why not one big `git push`?
#   Local path has a PMTU blackhole (~1500B DF drops). TLS1.3 / large packs
#   often stall. TLS1.2 + HTTP/1.1 + small incremental pushes are reliable.
#
# Longer-term: set up SSH ProxyJump to HK (see scripts/setup-git-ssh-jump.md).
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE="${1:-origin}"
BRANCH="${2:-master}"

git config --local http.version HTTP/1.1
git config --local http.sslVersion tlsv1.2
git config --local http.postBuffer 524288000
git config --local credential.helper store

git fetch "$REMOTE" "$BRANCH" || true
ahead=$(git rev-list --reverse "${REMOTE}/${BRANCH}..HEAD" 2>/dev/null || git rev-list --reverse "HEAD")
if [[ -z "${ahead// }" ]]; then
  echo "Nothing to push."
  exit 0
fi

echo "Pushing commits one-by-one to ${REMOTE}/${BRANCH} …"
while read -r c; do
  [[ -z "$c" ]] && continue
  ok=0
  for attempt in 1 2 3 4 5 6; do
    echo "→ $c (attempt $attempt)"
    if git -c http.version=HTTP/1.1 -c http.sslVersion=tlsv1.2 \
      -c http.postBuffer=524288000 -c credential.helper=store \
      -c http.lowSpeedLimit=1 -c http.lowSpeedTime=180 \
      push "$REMOTE" "${c}:refs/heads/${BRANCH}"; then
      ok=1
      break
    fi
    sleep $((attempt * 6))
  done
  if [[ "$ok" -ne 1 ]]; then
    echo "Failed at $c — re-run: $0 $REMOTE $BRANCH" >&2
    exit 1
  fi
done <<< "$ahead"

git fetch "$REMOTE" "$BRANCH" || true
git status -sb
echo "Done."

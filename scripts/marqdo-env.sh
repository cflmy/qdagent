#!/usr/bin/env bash
# Shared Marqdo env for qdagent — prefer workspace CLI ≥2.0.0 + Ext pack ≥2.0.0.
# Sourced by scripts/qdagent and scripts/mq.sh (not executed alone).
# shellcheck shell=bash

_qdagent_semver_ge() {
  # usage: _qdagent_semver_ge "1.4.3" "1.4.2" → 0 if $1 >= $2
  local IFS=.
  # shellcheck disable=SC2206
  local a=($1) b=($2)
  local i
  for i in 0 1 2; do
    local x="${a[$i]:-0}" y="${b[$i]:-0}"
    x="${x%%[^0-9]*}"
    y="${y%%[^0-9]*}"
    x="${x:-0}"
    y="${y:-0}"
    if (( x > y )); then return 0; fi
    if (( x < y )); then return 1; fi
  done
  return 0
}

qdagent_resolve_marqdo() {
  # Floor raised to Marqdo 2.0.0 (occlusion markup · access/取元 · labels 两级
  # 检索 · migrate labels · 债务棘轮 — M1–M10 全量落地).
  local min_cli="${QDAGENT_MARQDO_MIN:-2.0.0}"
  local min_ext="${QDAGENT_EXT_MIN:-2.0.0}"
  if [[ -z "${MARQDO_EXT:-}" ]]; then
    if [[ -d "$HOME/work/marqdo/ext" ]]; then
      export MARQDO_EXT="$HOME/work/marqdo/ext"
    elif [[ -d "${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/ext" ]]; then
      export MARQDO_EXT="${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/ext"
    else
      export MARQDO_EXT="$HOME/.marqdo/ext"
    fi
  fi
  if [[ -z "${MARQDO_LIB:-}" ]]; then
    if [[ -d "$HOME/work/marqdo/lib" ]]; then
      export MARQDO_LIB="$HOME/work/marqdo/lib"
    elif [[ -d "${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/lib" ]]; then
      export MARQDO_LIB="${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/lib"
    else
      export MARQDO_LIB="$HOME/.marqdo/lib"
    fi
  fi
  if [[ -z "${MARQDO_WEB_PLUGIN:-}" && -f "${MARQDO_EXT}/native/libweb.so" ]]; then
    export MARQDO_WEB_PLUGIN="${MARQDO_EXT}/native/libweb.so"
  fi

  if [[ -n "${MARQDO_BIN:-}" && -x "${MARQDO_BIN}" ]]; then
    :
  elif [[ -x "$HOME/work/marqdo/target/release/marqdo" ]]; then
    export MARQDO_BIN="$HOME/work/marqdo/target/release/marqdo"
  elif [[ -x "${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/target/release/marqdo" ]]; then
    export MARQDO_BIN="${QDAGENT_MARQDO_SRC:-/workspace/marqdo}/target/release/marqdo"
  else
    # Fallback to PATH lookup. Use `type -P` (NOT `command -v`): this file
    # defines a shell FUNCTION named `marqdo` further down, which `command -v`
    # would return as the bare token `marqdo` instead of the binary path —
    # breaking resolution whenever no sibling checkout exists (i.e. CI).
    # `type -P` ignores functions/aliases and returns only the executable path.
    export MARQDO_BIN="$(type -P marqdo || true)"
  fi

  if [[ -z "${MARQDO_BIN}" || ! -x "${MARQDO_BIN}" ]]; then
    echo "qdagent: marqdo not found (need CLI ≥ ${min_cli}, Ext ≥ ${min_ext})" >&2
    echo "  build: cd ~/work/marqdo && cargo build --release" >&2
    echo "  or:   export MARQDO_BIN=/path/to/marqdo" >&2
    return 127
  fi

  local ver_line ver
  ver_line="$("$MARQDO_BIN" --version 2>/dev/null || true)"
  ver="$(echo "$ver_line" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)"
  if [[ -z "$ver" ]]; then
    echo "qdagent: cannot parse marqdo version from: ${ver_line}" >&2
    return 1
  fi
  if ! _qdagent_semver_ge "$ver" "$min_cli"; then
    echo "qdagent: marqdo CLI ${ver} is too old (need ≥ ${min_cli})" >&2
    echo "  found: ${MARQDO_BIN}" >&2
    echo "  tip:   cargo build --release in ~/work/marqdo (or \$QDAGENT_MARQDO_SRC, default /workspace/marqdo)" >&2
    return 1
  fi

  local ext_ver=""
  if [[ -f "${MARQDO_EXT}/VERSION" ]]; then
    ext_ver="$(tr -d '[:space:]' < "${MARQDO_EXT}/VERSION" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)"
  fi
  if [[ -z "$ext_ver" ]]; then
    echo "qdagent: missing ${MARQDO_EXT}/VERSION (need Ext pack ≥ ${min_ext})" >&2
    echo "  tip:   marqdo ext add agent   # CDN latest" >&2
    echo "    or:  export MARQDO_EXT=\$HOME/work/marqdo/ext" >&2
    return 1
  fi
  if ! _qdagent_semver_ge "$ext_ver" "$min_ext"; then
    echo "qdagent: Ext pack ${ext_ver} is too old (need ≥ ${min_ext})" >&2
    echo "  MARQDO_EXT=${MARQDO_EXT}" >&2
    echo "  tip:   marqdo ext add agent   # pulls agent.run cold-EFI fix" >&2
    return 1
  fi

  export PATH="$(dirname "$MARQDO_BIN"):$PATH"
  return 0
}

marqdo() {
  if [[ -n "${MARQDO_BIN:-}" && -x "${MARQDO_BIN}" ]]; then
    command "${MARQDO_BIN}" "$@"
  else
    command marqdo "$@"
  fi
}

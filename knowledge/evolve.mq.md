---
markup: occlusion
title: knowledge/evolve
description: >-
  S2: function_sources-aware impact, conflict listing, local patch via MLSP
  artifact.patch, and rebuild after source change invalidates handles.
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  ctx: context.mq.md
  plugin: lib/plugin.mq.md
---

## kinds

Canonical knowledge unit kinds (gaps/03 · next/002).

`k` =

| kind |
|------|
| Fact |
| Rule |
| Decision |
| Constraint |
| Failure |

*k*

## impact
    + `project`="."
    + `path`=""
    + `artifact_id`=""

MLSP artifact.impact — list dependents invalidated by source/artifact change.

1. `artifact_id`
  **req = "{\"method\":\"artifact.impact\",\"params\":{\"project\":\"" + `project` + "\",\"artifact_id\":\"" + `artifact_id` + "\"}}"**
2. *
  **req = "{\"method\":\"artifact.impact\",\"params\":{\"project\":\"" + `project` + "\",\"path\":\"" + `path` + "\"}}"**
> sys.env_set name="QDAGENT_IMP_REQ" value=`req`
`args` =

| a |
|---|
| "-c" |
| MQ="${MARQDO_BIN:-marqdo}"; f="${TMPDIR:-/tmp}/qd-mlsp-imp.json"; printf '%s\n' "$QDAGENT_IMP_REQ" > "$f"; "$MQ" mlsp < "$f" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**stdout = access(proc, "stdout")**
1. not `stdout`
  `fail` =

  | ok | error |
  |----|-------|
  | False | impact_no_stdout |

  *fail*
**resp = > json.parse text=`stdout`**
*resp*

## patch
    + `project`="."
    + `artifact_id`
    + `edits_json`

MLSP artifact.patch — local reviewable edit. `edits_json` is a JSON array string.

**req = "{\"method\":\"artifact.patch\",\"params\":{\"project\":\"" + `project` + "\",\"artifact_id\":\"" + `artifact_id` + "\",\"edits\":" + `edits_json` + "}}"**
> sys.env_set name="QDAGENT_PATCH_REQ" value=`req`
`args` =

| a |
|---|
| "-c" |
| MQ="${MARQDO_BIN:-marqdo}"; f="${TMPDIR:-/tmp}/qd-mlsp-patch.json"; printf '%s\n' "$QDAGENT_PATCH_REQ" > "$f"; "$MQ" mlsp < "$f" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**stdout = access(proc, "stdout")**
1. not `stdout`
  `fail` =

  | ok | error |
  |----|-------|
  | False | patch_no_stdout |

  *fail*
**resp = > json.parse text=`stdout`**
*resp*

## rebuild
    + `kb_root`="."

Recompile EKC after source change. Clears stale projection by rewriting .marqdo.

**root = > ctx.resolve_root root=`kb_root`**
**out = > ctx.resolve_out out=".marqdo" root=`root`**
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = access(proc, "code")**
**ok = False**
1. `code` == 0
  **ok = True**
`ret` =

| ok | code | root | out |
|----|------|------|-----|
| `ok` | `code` | `root` | `out` |

*ret*

## refuse_mixed_generation
    + `kb_root`="."

Read publish_manifest / CURRENT when present; report generation id for consumers.

**root = > ctx.resolve_root root=`kb_root`**
**out = > ctx.resolve_out out=".marqdo" root=`root`**
**cur = `out` + "/CURRENT"**
**man = `out` + "/publish_manifest.json"**
**has_cur = > fs.exists path=`cur`**
**has_man = > fs.exists path=`man`**
**cur_txt = ""**
**man_txt = ""**
1. `has_cur`
  **cur_txt = > fs.read_text path=`cur`**
1. `has_man`
  **man_txt = > fs.read_text path=`man`**
`ret` =

| ok | has_current | has_manifest | current | manifest |
|----|-------------|--------------|---------|----------|
| True | `has_cur` | `has_man` | `cur_txt` | `man_txt` |

*ret*

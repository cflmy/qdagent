---
title: knowledge/context
description: >-
  Engineering Context Pack lifecycle — Task → Preflight → .mq.md pack.
  Zero LLM. Consumes Marqdo EKC CLI (does not reimplement resolver).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import table:lib/table.mq.md
import policy:./policy.mq.md
---

## resolve_root
    + `root`="."

Prefer explicit `root`, then `QDAGENT_ROOT` (set by scripts/qdagent), else process cwd.
Needed because `marqdo run cli/…` chdirs into `cli/`.

1. `root` != "."
  1. `root` != ""
    *root*
**env = > sys.env_get name="QDAGENT_ROOT"**
1. `env`
  *env*
**cwd = > sys.cwd**
*cwd*

## resolve_out
    + `out`=".marqdo"
    + `root`="."

1. `out` != ".marqdo"
  1. `out` != ""
    *out*
**r = > resolve_root root=`root`**
*`r` + "/.marqdo"*

## ensure_graph
    + `root`="."
    + `out`=".marqdo"

Ensure EKC projections exist. Missing graph → compile first (never skip EFI).

**root = > resolve_root root=`root`**
**out = > resolve_out out=`out` root=`root`**

**eng = `out` + "/engineering.yaml"**
**graph = `out` + "/graph/graph.json"**
**has_eng = > fs.exists path=`eng`**
**has_graph = > fs.exists path=`graph`**
1. `has_eng`
  `ok` =

  | ok | status |
  |----|--------|
  | True | ready |

  *ok*
2. `has_graph`
  `ok2` =

  | ok | status |
  |----|--------|
  | True | ready |

  *ok2*
3. *
  > sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
  > sys.env_set name="QDAGENT_EKC_OUT" value=`out`
  `args` =

  | a |
  |---|
  | "-c" |
  | marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

  **proc = > sys.exec cmd="sh" args=args capture=True**
  **code = [code](proc)**
  1. `code` == 0
    `ok3` =

    | ok | status |
    |----|--------|
    | True | compiled |

    *ok3*
  2. *
    **err = [stderr](proc)**
    `fail` =

    | ok | status | error |
    |----|--------|-------|
    | False | compile_failed | `err` |

    *fail*

## preflight
    + `task`
    + `root`="."
    + `out`=".marqdo"

Run Marqdo engineering preflight. Writes Context Pack under `.marqdo/agent/contexts/`.

**root = > resolve_root root=`root`**
**out = > resolve_out out=`out` root=`root`**

**gate = > ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*

> sys.env_set name="QDAGENT_TASK" value=`task`
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge preflight "$QDAGENT_TASK" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**

Marqdo CLI exits **2** when `decision=CREATE` and `create_allowed=false` (Reuse Gate
blocked) — stdout still carries the Context Pack JSON. Prefer parse-over-exit-code.

1. not `stdout`
  **err = [stderr](proc)**
  1. not `err`
    **err = "preflight produced no JSON (exit " + `code` + ")"**
  `fail` =

  | ok | status | error |
  |----|--------|-------|
  | False | preflight_failed | `err` |

  *fail*

**pf = > json.parse text=`stdout`**
**path = > json.get value=`pf` key="context_path"**
**decision = > json.get value=`pf` key="decision"**
1. not `decision`
  **err = [stderr](proc)**
  1. not `err`
    **err = `stdout`**
  `fail2` =

  | ok | status | error |
  |----|--------|-------|
  | False | preflight_failed | `err` |

  *fail2*

**allowed = > json.get value=`pf` key="create_allowed"**
**status = > json.get value=`pf` key="status"**
**pol = > policy.match task=`task` root=`root`**
**pol_hits = [matches](pol)**
**pol_n = [count](pol)**
**pf = > table.put in=`pf` at="policies" value=`pol_hits`**
**pf = > table.put in=`pf` at="policy_count" value=`pol_n`**
`result` =

| ok | status | decision | create_allowed | context_path | preflight | policies | policy_count |
|----|--------|----------|----------------|--------------|-----------|----------|-------------:|
| True | `status` | `decision` | `allowed` | `path` | `pf` | `pol_hits` | `pol_n` |

*result*

## summarize
    + `preflight`

Human-readable summary lines from a preflight map (for CLI / UI).

**decision = > json.get value=`preflight` key="decision"**
**allowed = > json.get value=`preflight` key="create_allowed"**
**path = > json.get value=`preflight` key="context_path"**
**text = "decision=" + `decision` + " create_allowed=" + `allowed` + " context=" + `path`**
*text*

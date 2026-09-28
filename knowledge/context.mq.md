---
title: knowledge/context
description: >-
  Engineering Context Pack lifecycle — Task → Preflight → .mq.md pack.
  Zero LLM. Consumes Marqdo EKC CLI (does not reimplement resolver).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import table:lib/table.mq.md
---

## ensure_graph
    + `root`="."
    + `out`=".marqdo"

Ensure EKC projections exist. Missing graph → compile first (never skip EFI).

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
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | status | error |
  |----|--------|-------|
  | False | preflight_failed | `err` |

  *fail*

**pf = > json.parse text=`stdout`**
**path = > json.get value=`pf` key="context_path"**
**decision = > json.get value=`pf` key="decision"**
**allowed = > json.get value=`pf` key="create_allowed"**
**status = > json.get value=`pf` key="status"**
`result` =

| ok | status | decision | create_allowed | context_path | preflight |
|----|--------|----------|----------------|--------------|-----------|
| True | `status` | `decision` | `allowed` | `path` | `pf` |

*result*

## summarize
    + `preflight`

Human-readable summary lines from a preflight map (for CLI / UI).

**decision = > json.get value=`preflight` key="decision"**
**allowed = > json.get value=`preflight` key="create_allowed"**
**path = > json.get value=`preflight` key="context_path"**
**text = "decision=" + `decision` + " create_allowed=" + `allowed` + " context=" + `path`**
*text*

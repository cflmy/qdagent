---
title: knowledge/resolver
description: >-
  Resolve engineering candidates via Marqdo find/reuse — no second EKC.
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import ctx:context.mq.md
---

## find
    + `query`
    + `root`="."
    + `out`=".marqdo"
    + `limit`=20

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*

> sys.env_set name="QDAGENT_QUERY" value=`query`
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_FIND_LIMIT" value=`limit`
`args` =

| a |
|---|
| "-c" |
| marqdo find "$QDAGENT_QUERY" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --limit "$QDAGENT_FIND_LIMIT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*

**hits = > json.parse text=`stdout`**
`result` =

| ok | hits |
|----|------|
| True | `hits` |

*result*

## reuse
    + `task`
    + `root`="."
    + `out`=".marqdo"

REUSE / ADAPT / CREATE via Marqdo reuse (+ context pack).

**gate = > ctx.ensure_graph root=`root` out=`out`**
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
| marqdo reuse --preflight --json "$QDAGENT_TASK" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*

**body = > json.parse text=`stdout`**
**decision = > json.get value=`body` key="decision"**
**allowed = > json.get value=`body` key="create_allowed"**
`result` =

| ok | decision | create_allowed | reuse |
|----|----------|----------------|-------|
| True | `decision` | `allowed` | `body` |

*result*

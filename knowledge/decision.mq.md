---
title: knowledge/decision
description: >-
  Record REUSE/ADAPT/CREATE into Marqdo reuse_metrics via CLI
  (`marqdo knowledge record`). No second metrics store.
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import ctx:context.mq.md
---

## record
    + `decision`
    + `root`="."
    + `out`=".marqdo"
    + `duplicated`=False

**root = > ctx.resolve_root root=`root`**
**out = > ctx.resolve_out out=`out` root=`root`**

> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_DECISION" value=`decision`

1. `duplicated`
  `args` =

  | a |
  |---|
  | "-c" |
  | marqdo knowledge record "$QDAGENT_DECISION" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --duplicated --json |

2. *
  `args` =

  | a |
  |---|
  | "-c" |
  | marqdo knowledge record "$QDAGENT_DECISION" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --json |

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
1. not `body`
  `ok_text` =

  | ok | stdout |
  |----|--------|
  | True | `stdout` |

  *ok_text*

`result` =

| ok | metrics |
|----|---------|
| True | `body` |

*result*

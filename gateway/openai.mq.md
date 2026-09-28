---
title: gateway/openai
description: >-
  Thin OpenAI-compatible request adapter — HTTP concerns stay outside;
  domain work delegates to agent/qdagent (no Python Agent loop).
import qd:../agent/qdagent.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
---

## classify
    + `text`

Heuristic task mode from user text.

**mode = "ask"**
1. `text`
  **mode = "build"**
*mode*

## chat
    + `message`
    + `mode`=""
    + `root`="."
    + `out`=".marqdo"

Map one user message to qdagent.run. Returns a map suitable for gateway JSON.

1. `mode` == ""
  **mode = > classify text=`message`**

**out = > qd.run task=`message` mode=`mode` root=`root` out=`out`**
**ok = [ok](out)**
1. not `ok`
  *out*

**result = > json.get value=`out` key="result"**
1. not `result`
  **result = > json.stringify value=`out`**

**slug = > json.get value=`out` key="slug"**
**decision = > json.get value=`out` key="decision"**
`ret` =

| ok | content | run_id | decision | mode | raw |
|----|---------|--------|----------|------|-----|
| True | `result` | `slug` | `decision` | `mode` | `out` |

*ret*

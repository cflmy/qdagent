---
title: gateway/openai
description: >-
  Thin OpenAI-compatible request adapter — HTTP concerns stay outside;
  domain work delegates to agent/qdagent (no Python Agent loop).
  Upstream path always runs `precheck` first (EFI gate).
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

## precheck
    + `message`

Pure request gate before Agent / upstream. No state, no Agent loop.
Returns `{decision, reason, code}` — `deny` must short-circuit callers.

**decision = "proceed"**
**reason = "ok"**
**code = "ok"**

1. not `message`
  **decision = "deny"**
  **reason = "empty_message"**
  **code = "empty_message"**

1. `decision` == "proceed"
  **parts = > split value=`message` sep="own the agent loop"**
  **n = > len value=`parts`**
  1. `n` > 1
    **decision = "deny"**
    **reason = "forbidden: python-openai-gateway-owned-the-agent-loop"**
    **code = "forbidden_agent_loop"**

1. `decision` == "proceed"
  **parts2 = > split value=`message` sep="第二套 Agent Runtime"**
  **n2 = > len value=`parts2`**
  1. `n2` > 1
    **decision = "deny"**
    **reason = "forbidden: second agent runtime"**
    **code = "forbidden_second_runtime"**

1. `decision` == "proceed"
  **parts3 = > split value=`message` sep="bypass eng_preflight"**
  **n3 = > len value=`parts3`**
  1. `n3` > 1
    **decision = "deny"**
    **reason = "forbidden: bypass eng_preflight"**
    **code = "forbidden_bypass_efi"**

`ret` =

| decision | reason | code |
|----------|--------|------|
| `decision` | `reason` | `code` |

*ret*

## chat
    + `message`
    + `mode`=""
    + `root`="."
    + `out`=".marqdo"

Map one user message to qdagent.run. Precheck first; deny never reaches Agent.

**gate = > precheck message=`message`**
**gd = [decision](gate)**
1. `gd` == "deny"
  **reason = [reason](gate)**
  **code = [code](gate)**
  `blocked` =

  | ok | content | run_id | decision | mode | error | code |
  |----|---------|--------|----------|------|-------|------|
  | False | `reason` |  | deny | `mode` | precheck_denied | `code` |

  *blocked*

1. `mode` == ""
  **mode = > classify text=`message`**

**agent_out = > qd.run task=`message` mode=`mode` root=`root` out=`out`**
**ok = [ok](agent_out)**
1. not `ok`
  *agent_out*

**result = > json.get value=`agent_out` key="result"**
1. not `result`
  **result = > json.stringify value=`agent_out`**

**slug = > json.get value=`agent_out` key="slug"**
**decision = > json.get value=`agent_out` key="decision"**
`ret` =

| ok | content | run_id | decision | mode | raw |
|----|---------|--------|----------|------|-----|
| True | `result` | `slug` | `decision` | `mode` | `agent_out` |

*ret*

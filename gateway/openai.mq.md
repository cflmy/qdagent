---
title: gateway/openai
description: >-
  Thin OpenAI-compatible request adapter — HTTP concerns stay outside;
  domain work delegates to agent/qdagent (no Python Agent loop).
  Upstream path always runs `precheck` first (EFI gate + optional product Preflight).
import qd:../agent/qdagent.mq.md
import pf:../agent/preflight.mq.md
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
    + `root`="."
    + `out`=".marqdo"
    + `with_preflight`=False

Request gate before Agent / upstream. Denylist for second-runtime bypass;
optional product Preflight so EFI chat always has a Context Pack handle.

**decision = "proceed"**
**reason = "ok"**
**code = "ok"**
**context_path = ""**
**pf_decision = ""**

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

1. `decision` == "proceed"
  1. `with_preflight`
    **pack = > pf.run task=`message` root=`root` out=`out`**
    **pok = [ok](pack)**
    1. not `pok`
      **decision = "deny"**
      **reason = "preflight_failed"**
      **code = "preflight_failed"**
    2. *
      **context_path = [context_path](pack)**
      **pf_decision = [decision](pack)**
      1. not `context_path`
        **decision = "deny"**
        **reason = "missing_context_pack"**
        **code = "missing_context_pack"**

`ret` =

| decision | reason | code | context_path | pf_decision |
|----------|--------|------|--------------|-------------|
| `decision` | `reason` | `code` | `context_path` | `pf_decision` |

*ret*

## chat
    + `message`
    + `mode`=""
    + `root`="."
    + `out`=".marqdo"

Map one user message to qdagent.run. Precheck first (with product Preflight);
deny never reaches Agent.

**gate = > precheck message=`message` root=`root` out=`out` with_preflight=True**
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
**ctx = [context_path](gate)**
`ret` =

| ok | content | run_id | decision | mode | context_path | raw |
|----|---------|--------|----------|------|--------------|-----|
| True | `result` | `slug` | `decision` | `mode` | `ctx` | `agent_out` |

*ret*

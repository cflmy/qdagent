---
markup: occlusion
title: gateway/openai
description: >-
  Thin OpenAI-compatible request adapter — HTTP concerns stay outside;
  domain work delegates to agent/qdagent (no Python Agent loop).
  Upstream path always runs `precheck` first (EFI gate + optional product Preflight).
import:
  qd: ../agent/qdagent.mq.md
  pf: ../agent/preflight.mq.md
  auth: auth.mq.md
  session: ../execution/session.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
---

## classify
    + `text`

Heuristic task mode from user text. Default ASK; BUILD only on explicit cues.

**mode = "ask"**
1. `text`
  **parts = > split value=`text` sep="BUILD"**
  **n = > len value=`parts`**
  1. `n` > 1
    **mode = "build"**
  **parts2 = > split value=`text` sep="构建"**
  **n2 = > len value=`parts2`**
  1. `n2` > 1
    **mode = "build"**
  **parts3 = > split value=`text` sep="实现"**
  **n3 = > len value=`parts3`**
  1. `n3` > 1
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
    **pok = [ok](access(pack, "ok"))**
    1. not `pok`
      **decision = "deny"**
      **reason = "preflight_failed"**
      **code = "preflight_failed"**
    2. *
      **context_path = [context_path](access(pack, "context_path"))**
      **pf_decision = [decision](access(pack, "decision"))**
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
    + `session_id`=""
    + `authorization`=""
    + `api_key`=""
    + `payload`=None

Map one user message to qdagent.run. Auth gate first (design §20/§46: credential
vs QDAGENT_API_KEY + tracing headers X-QDAgent-*), then precheck (with product
Preflight); deny never reaches Agent.

**authres = > auth.check authorization=`authorization` api_key=`api_key` payload=`payload`**
**aok = > json.get value=`authres` key="ok"**
1. not `aok`
  **areason = > json.get value=`authres` key="reason"**
  `authdeny` =

  | ok | content | run_id | decision | mode | error | code |
  |----|---------|--------|----------|------|-------|------|
  | False | `areason` |  | deny | `mode` | unauthorized | unauthorized |

  *authdeny*

**gate = > precheck message=`message` root=`root` out=`out` with_preflight=True**
**gd = [decision](access(gate, "decision"))**
1. `gd` == "deny"
  **reason = [reason](access(gate, "reason"))**
  **code = [code](access(gate, "code"))**
  `blocked` =

  | ok | content | run_id | decision | mode | error | code |
  |----|---------|--------|----------|------|-------|------|
  | False | `reason` |  | deny | `mode` | precheck_denied | `code` |

  *blocked*

1. `mode` == ""
  **mode = > classify text=`message`**

**agent_out = > qd.run task=`message` mode=`mode` root=`root` out=`out` session_id=`session_id`**
**ok = [ok](access(agent_out, "ok"))**
1. not `ok`
  *agent_out*

**result = > json.get value=`agent_out` key="result"**
**err = > json.get value=`agent_out` key="error"**
**run_mode = > json.get value=`agent_out` key="mode"**
**st = > json.get value=`agent_out` key="status"**
1. not `result`
  1. `err`
    **result = `err`**
  2. *
    **result = > json.stringify value=`agent_out`**

**slug = > json.get value=`agent_out` key="slug"**
**decision = > json.get value=`agent_out` key="decision"**
**sid = > json.get value=`agent_out` key="session_id"**
1. not `sid`
  **sid = `session_id`**
1. not `sid`
  **linked = > session.link session_id="" surface="api" workbook_slug=`slug` run_id=`slug`**
  **sid = [session_id](access(linked, "session_id"))**
**ctx = [context_path](access(gate, "context_path"))**
**live_ok = True**
1. `run_mode` == "error"
  **live_ok = False**
2. `st` == "error"
  **live_ok = False**
3. *
  **_ = 1**
`ret` =

| ok | content | run_id | decision | mode | status | error | context_path | session_id | raw |
|----|---------|--------|----------|------|--------|-------|--------------|------------|-----|
| `live_ok` | `result` | `slug` | `decision` | `mode` | `st` | `err` | `ctx` | `sid` | `agent_out` |

*ret*

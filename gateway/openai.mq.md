---
markup: occlusion
title: gateway/openai
description: >-
  Thin OpenAI-compatible request adapter — HTTP concerns stay outside;
  domain work delegates to agent/qdagent (no Python Agent loop).
  Upstream path always runs `precheck` first (EFI gate + optional product Preflight).
  Passes full messages + explicit model selection into qd.run (Q02).
import:
  qd: ../agent/qdagent.mq.md
  pf: ../agent/preflight.mq.md
  auth: auth.mq.md
  session: ../execution/session.mq.md
  registry: ../lib/registry.mq.md
  turns: ../execution/turns.mq.md
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
    + `message`=""
    + `messages`=None
    + `mode`=""
    + `root`="."
    + `out`=".marqdo"
    + `session_id`=""
    + `model_id`=""
    + `selection`=None
    + `turn_id`=""
    + `workspace_id`=""
    + `authorization`=""
    + `api_key`=""
    + `payload`=None
    + `stream`=False

Map conversation to qdagent.run. Auth gate first, then precheck; deny never reaches Agent.
Full `messages` preferred over last-user-only. Explicit selection freezes the model for this turn.
`stream=True` (or payload.stream) enables live token SSE via Marqdo M02 EventBus.

**authres = > auth.check authorization=`authorization` api_key=`api_key` payload=`payload`**
**aok = > json.get value=`authres` key="ok"**
1. not `aok`
  **areason = > json.get value=`authres` key="reason"**
  `authdeny` =

  | ok | content | run_id | decision | mode | error | code |
  |----|---------|--------|----------|------|-------|------|
  | False | `areason` |  | deny | `mode` | unauthorized | unauthorized |

  *authdeny*

1. `payload`
  **pm = > json.get value=`payload` key="messages"**
  1. `pm`
    **messages = `pm`**
  **pmodel = > json.get value=`payload` key="model"**
  1. `pmodel`
    1. not `model_id`
      **model_id = `pmodel`**
  **psel = > json.get value=`payload` key="selection"**
  1. `psel`
    **selection = `psel`**
  **psid = > json.get value=`payload` key="session_id"**
  1. `psid`
    **session_id = `psid`**
  **ptid = > json.get value=`payload` key="turn_id"**
  1. `ptid`
    **turn_id = `ptid`**
  **pws = > json.get value=`payload` key="workspace_id"**
  1. `pws`
    **workspace_id = `pws`**
  **ps = > json.get value=`payload` key="stream"**
  1. `ps` == True
    **stream = True**
  2. `ps` == "true"
    **stream = True**

1. `messages`
  **message = > qd.compose_messages messages=`messages` fallback=`message`**
1. not `message`
  **message = ""**

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

1. `model_id` == "qdagent"
  **model_id = ""**
2. `model_id` == "qdagent-fast"
  **model_id = ""**

1. not `selection`
  1. `model_id`
    **selection = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"" + `model_id` + "\"}"**

1. not `turn_id`
  **created = > turns.create session_id=`session_id` workspace_id=`workspace_id` model_id=`model_id` payload=`payload`**
  **turn_id = [turn_id](access(created, "turn_id"))**

**agent_out = > qd.run task=`message` mode=`mode` root=`root` out=`out` session_id=`session_id` model_id=`model_id` selection=`selection` turn_id=`turn_id` workspace_id=`workspace_id` messages=`messages` stream=`stream`**
**ok = [ok](access(agent_out, "ok"))**
1. not `ok`
  > turns.complete turn_id=`turn_id` state="failed" usage_state="unknown" error="agent_failed"
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
**model_pub = > json.get value=`agent_out` key="model"**
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

1. `live_ok`
  > turns.complete turn_id=`turn_id` state="completed" usage_state="unknown"
2. *
  > turns.complete turn_id=`turn_id` state="failed" usage_state="unknown" error=`err`

`ret` =

| ok | content | run_id | decision | mode | status | error | context_path | session_id | turn_id | model | raw |
|----|---------|--------|----------|------|--------|-------|--------------|------------|---------|-------|-----|
| `live_ok` | `result` | `slug` | `decision` | `mode` | `st` | `err` | `ctx` | `sid` | `turn_id` | `model_pub` | `agent_out` |

*ret*

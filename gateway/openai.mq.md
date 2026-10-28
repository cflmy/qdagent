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
  workbench: ../lib/workbench.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
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

Bind `patt` before the payload branch so later `1. patt` is a local check,
not an implicit required parameter of `chat` (would fail every isolated worker).

**patt = None**

**authres = > auth.check authorization=`authorization` api_key=`api_key` payload=`payload`**
**aok = > json.get value=`authres` key="ok"**
1. not `aok`
  **areason = > json.get value=`authres` key="reason"**
  `authdeny` =

  | ok | content | run_id | decision | mode | error | code | turn_id | model |
  |----|---------|--------|----------|------|-------|------|---------|-------|
  | False | `areason` |  | deny | `mode` | unauthorized | unauthorized |  |  |

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
  **patt = > json.get value=`payload` key="context_attachments"**

1. `messages`
  **message = > qd.compose_messages messages=`messages` fallback=`message`**
1. not `message`
  **message = ""**

Verify ContextAttachment pins against live digests (QA-16). Stale keeps frozen
revision — never silent-refresh. Inject a short system note when any pin is stale/missing.

1. `patt`
  **vfy = > workbench.resources_verify_attachments payload=`payload`**
  **vok = > json.get value=`vfy` key="ok"**
  1. `vok`
    **vdata = > json.get value=`vfy` key="data"**
    1. not `vdata`
      **vdata = > json.get value=`vfy` key="result"**
    **vstale = > json.get value=`vdata` key="stale"**
    **vmiss = > json.get value=`vdata` key="missing"**
    1. `vstale`
      **vnote = "[context_attachments] " + `vstale` + " stale pin(s); frozen revision kept (no silent refresh)."**
      1. `messages`
        `vmsg` =

        | role | content |
        |------|---------|
        | system | `vnote` |

        **messages = > table.append list=`messages` item=`vmsg`**
      2. *
        **message = `message` + "\n\n" + `vnote`**
    2. `vmiss`
      **vnote2 = "[context_attachments] " + `vmiss` + " missing pin(s); do not invent content."**
      1. `messages`
        `vmsg2` =

        | role | content |
        |------|---------|
        | system | `vnote2` |

        **messages = > table.append list=`messages` item=`vmsg2`**
      2. *
        **message = `message` + "\n\n" + `vnote2`**

Denylist-only gate here. Product Preflight (`pf.run` / knowledge preflight) runs
once inside `qd.run` → `ask`/`build`/`learn`. Duplicating it here added ~8s of
silent lag before the first SSE event (Context Pack from this call was unused).

**gate = > precheck message=`message` root=`root` out=`out` with_preflight=False**
**gd = > json.get value=`gate` key="decision"**
1. `gd` == "deny"
  **reason = > json.get value=`gate` key="reason"**
  **code = > json.get value=`gate` key="code"**
  `blocked` =

  | ok | content | run_id | decision | mode | error | code | turn_id | model |
  |----|---------|--------|----------|------|-------|------|---------|-------|
  | False | `reason` |  | deny | `mode` | precheck_denied | `code` |  |  |

  *blocked*

Classify on the **latest user turn** only — never on the full composed transcript
(history containing「实现」must not force BUILD). Unknown modes (e.g. leaked
`selection.mode=manual`) fall back to ASK so chat never hits Reuse Gate by accident.

**classify_text = `message`**
1. `messages`
  **classify_text = > qd.latest_user_message messages=`messages` fallback=`message`**
1. `mode` == ""
  **mode = > classify text=`classify_text`**
1. not `mode` == "ask"
  1. not `mode` == "build"
    1. not `mode` == "learn"
      **mode = "ask"**

1. `model_id` == "qdagent"
  **model_id = ""**
2. `model_id` == "qdagent-fast"
  **model_id = ""**

1. not `selection`
  1. `model_id`
    **selection = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"" + `model_id` + "\"}"**

**subscribe_only = False**
1. `turn_id`
  **existing = > turns.get turn_id=`turn_id`**
  **eok = > json.get value=`existing` key="ok"**
  1. `eok`
    **eturn = > json.get value=`existing` key="turn"**
    **est = > json.get value=`eturn` key="state"**
    1. not `est` == "completed"
      1. not `est` == "cancelled"
        1. not `est` == "failed"
          1. not `est` == "interrupted"
            **subscribe_only = True**
1. not `turn_id`
  **created = > turns.create session_id=`session_id` workspace_id=`workspace_id` model_id=`model_id` payload=`payload`**
  **cok = > json.get value=`created` key="ok"**
  1. not `cok`
    **ccode = > json.get value=`created` key="code"**
    1. `ccode` == "request_id.conflict"
      `conflict` =

      | ok | content | run_id | decision | mode | error | code | turn_id | model |
      |----|---------|--------|----------|------|-------|------|---------|-------|
      | False | same request_id different payload |  | deny | `mode` | request_id.conflict | request_id.conflict |  |  |

      *conflict*
  **turn_id = > json.get value=`created` key="turn_id"**
  1. not `turn_id`
    **turn_id = > json.get value=`created` key="id"**
  2. *
    **_ = 1**
  **reused = > json.get value=`created` key="reused"**
  1. `reused`
    **rst = > json.get value=`created` key="state"**
    1. not `rst` == "completed"
      1. not `rst` == "cancelled"
        1. not `rst` == "failed"
          **subscribe_only = True**

1. `subscribe_only`
  Resume / second observer: do not re-run the model; replay turn_events.
  **ev = > turns.events turn_id=`turn_id` after_seq=0 stream=True**
  **events_url = "/api/app/turns/" + `turn_id` + "/events"**
  `resume_ret` =

  | ok | content | run_id | decision | mode | status | error | context_path | session_id | turn_id | model | events_url | raw | subscribe_only |
  |----|---------|--------|----------|------|--------|-------|--------------|------------|---------|-------|------------|-----|----------------|
  | True |  |  | resume | `mode` | running |  |  | `session_id` | `turn_id` |  | `events_url` | `ev` | True |

  *resume_ret*

**agent_out = > qd.run task=`message` mode=`mode` root=`root` out=`out` session_id=`session_id` model_id=`model_id` selection=`selection` turn_id=`turn_id` workspace_id=`workspace_id` messages=`messages` stream=`stream`**
**ao_s = > json.stringify value=`agent_out`**
**ao_obj = > text.starts_with text=`ao_s` prefix="{"**
**ok = None**
1. `ao_obj`
  **ok = > json.get value=`agent_out` key="ok"**
2. *
  **ok = False**
  1. not `agent_out`
    **agent_out = > json.parse text="{\"ok\":false,\"error\":\"agent_out_empty\",\"result\":\"\"}"**
  2. *
    **agent_out = > json.parse text="{\"ok\":false,\"error\":\"agent_out_not_map\",\"result\":" + `ao_s` + "}"**
1. not `ok`
  1. `turn_id`
    > turns.complete turn_id=`turn_id` state="failed" usage_state="unknown" error="agent_failed"
  2. *
    **_ = 1**
  **fail_content = > json.get value=`agent_out` key="result"**
  1. not `fail_content`
    **fail_content = > json.get value=`agent_out` key="error"**
  2. *
    **_ = 1**
  1. not `fail_content`
    **fail_content = > json.stringify value=`agent_out`**
  2. *
    **_ = 1**
  1. `fail_content` == "reuse_gate_blocked"
    **fail_content = "Reuse Gate 阻断：Preflight 判定 CREATE 但 create_allowed=false。日常对话应走 ASK；工程构建请用明确的 BUILD/构建 指令，或先复用已有能力。"**
  2. *
    **_ = 1**
  `agent_fail` =

  | ok | content | run_id | decision | mode | status | error | context_path | session_id | turn_id | model | raw |
  |----|---------|--------|----------|------|--------|-------|--------------|------------|---------|-------|-----|
  | False | `fail_content` |  |  | `mode` | error | agent_failed |  | `session_id` | `turn_id` |  | `agent_out` |

  *agent_fail*

**result = > json.get value=`agent_out` key="result"**
**err = > json.get value=`agent_out` key="error"**
**run_mode = > json.get value=`agent_out` key="mode"**
**st = > json.get value=`agent_out` key="status"**
**outcome = > json.get value=`agent_out` key="outcome"**
1. not `outcome`
  1. `run_mode` == "live"
    **outcome = "succeeded"**
  2. *
    **outcome = "failed"**
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
  **sid = > json.get value=`linked` key="session_id"**
**ctx = > json.get value=`gate` key="context_path"**
**live_ok = True**
1. `run_mode` == "error"
  **live_ok = False**
2. `run_mode` == "gated_error"
  **live_ok = False**
3. `st` == "error"
  **live_ok = False**
4. `outcome` != "succeeded"
  **live_ok = False**
5. *
  **_ = 1**

**ust = > json.get value=`agent_out` key="usage_state"**
1. not `ust`
  **ust = "unknown"**
1. `live_ok`
  1. `turn_id`
    > turns.complete turn_id=`turn_id` state="completed" usage_state=`ust`
  2. *
    **_ = 1**
2. *
  1. `turn_id`
    > turns.complete turn_id=`turn_id` state="failed" usage_state=`ust` error=`err`
  2. *
    **_ = 1**

`ret` =

| ok | content | run_id | decision | mode | status | outcome | error | context_path | session_id | turn_id | model | raw |
|----|---------|--------|----------|------|--------|---------|-------|--------------|------------|---------|-------|-----|
| `live_ok` | `result` | `slug` | `decision` | `mode` | `st` | `outcome` | `err` | `ctx` | `sid` | `turn_id` | `model_pub` | `agent_out` |

*ret*

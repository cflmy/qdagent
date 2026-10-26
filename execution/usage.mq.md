---
markup: occlusion
title: execution/usage
description: >-
  Per-call usage ledger (Q03). Unknown usage stays null — never coerced to 0.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  time: lib/time.mq.md
---

## record
    + `call_id`
    + `attempt_id`="1"
    + `run_id`=""
    + `turn_id`=""
    + `session_id`=""
    + `workspace_id`=""
    + `purpose`="answer"
    + `model_id`=""
    + `model_snapshot`=""
    + `status`="completed"
    + `input_tokens`=None
    + `output_tokens`=None
    + `total_tokens`=None
    + `usage_state`="unknown"
    + `measurement_source`="provider_omitted"
    + `revision`=1

Upsert one attempt. Unique (call_id, attempt_id). Numeric nulls stay null.

1. not `call_id`
  `need` =

  | ok | error |
  |----|-------|
  | False | call_id required |

  *need*

**store = > db.open**
**u = > time.now_unix**
**rid = `call_id` + ":" + `attempt_id`**
**existing = > `store`.get table="model_calls" id=`rid`**
1. `existing`
  **crev = [revision](access(existing, "revision"))**
  1. `revision` < `crev`
    `stale` =

    | ok | error | code |
    |----|-------|------|
    | False | stale revision | revision.conflict |

    *stale*
  **row = > table.empty_map**
  **row = > table.put in=`row` at="status" value=`status`**
  **row = > table.put in=`row` at="usage_state" value=`usage_state`**
  **row = > table.put in=`row` at="measurement_source" value=`measurement_source`**
  **row = > table.put in=`row` at="revision" value=`revision`**
  **row = > table.put in=`row` at="updated_at" value=`u`**
  1. `input_tokens` != None
    **row = > table.put in=`row` at="input_tokens" value=`input_tokens`**
  1. `output_tokens` != None
    **row = > table.put in=`row` at="output_tokens" value=`output_tokens`**
  1. `total_tokens` != None
    **row = > table.put in=`row` at="total_tokens" value=`total_tokens`**
  1. `model_snapshot`
    **row = > table.put in=`row` at="model_snapshot" value=`model_snapshot`**
  > `store`.update table="model_calls" id=`rid` row=`row`
  `ok` =

  | ok | id | call_id | attempt_id | usage_state |
  |----|----|---------|------------|-------------|
  | True | `rid` | `call_id` | `attempt_id` | `usage_state` |

  *ok*

1. not `model_snapshot`
  1. `model_id`
    **model_snapshot = "{\"model_id\":\"" + `model_id` + "\"}"**
`ins` =

| id | call_id | attempt_id | run_id | turn_id | session_id | workspace_id | purpose | model_id | model_snapshot | status | input_tokens | output_tokens | total_tokens | usage_state | measurement_source | revision | started_at | created_at | updated_at |
|----|---------|------------|--------|---------|------------|--------------|---------|----------|----------------|--------|--------------|---------------|--------------|-------------|--------------------|----------|------------|------------|------------|
| `rid` | `call_id` | `attempt_id` | `run_id` | `turn_id` | `session_id` | `workspace_id` | `purpose` | `model_id` | `model_snapshot` | `status` | `input_tokens` | `output_tokens` | `total_tokens` | `usage_state` | `measurement_source` | `revision` | `u` | `u` | `u` |

> `store`.insert table=model_calls rows=`ins`
`okins` =

| ok | id | call_id | attempt_id | usage_state |
|----|----|---------|------------|-------------|
| True | `rid` | `call_id` | `attempt_id` | `usage_state` |

*okins*

## record_from_agent
    + `agent_out`=None
    + `run_id`=""
    + `session_id`=""
    + `turn_id`=""
    + `workspace_id`=""
    + `purpose`="answer"
    + `model_id`=""
    + `model_snapshot`=""

Best-effort extract usage from Marqdo agent outcome. Missing fields → usage_state=unknown (not 0).

1. not `run_id`
  **run_id = "anon-"**
**call_id = "call-" + `run_id`**
**input_tokens = None**
**output_tokens = None**
**total_tokens = None**
**usage_state = "unknown"**
**measurement_source = "provider_omitted"**
**status = "completed"**

**ao_s = > json.stringify value=`agent_out`**
**ao_map = > text.starts_with text=`ao_s` prefix="{"**
1. `ao_map`
  **usage = > json.get value=`agent_out` key="usage"**
  1. not `usage`
    **usage = > json.get value=`agent_out` key="token_usage"**
  1. `usage`
    **pt = > json.get value=`usage` key="prompt_tokens"**
    **ct = > json.get value=`usage` key="completion_tokens"**
    **tt = > json.get value=`usage` key="total_tokens"**
    1. `pt` != None
      **input_tokens = `pt`**
    1. `ct` != None
      **output_tokens = `ct`**
    1. `tt` != None
      **total_tokens = `tt`**
    1. `input_tokens` != None
      **usage_state = "final"**
      **measurement_source = "provider_usage"**
    2. `total_tokens` != None
      **usage_state = "final"**
      **measurement_source = "provider_usage"**
  **st = > json.get value=`agent_out` key="status"**
  1. `st` == "error"
    **status = "failed"**
  **tc = > json.get value=`agent_out` key="token_cost"**
  1. `tc` != None
    1. `total_tokens` == None
      1. `usage_state` == "unknown"
        **measurement_source = "token_cost_as_tokens_not_currency"**
2. *
  **_ = 1**

*> record call_id=`call_id` attempt_id="1" run_id=`run_id` turn_id=`turn_id` session_id=`session_id` workspace_id=`workspace_id` purpose=`purpose` model_id=`model_id` model_snapshot=`model_snapshot` status=`status` input_tokens=`input_tokens` output_tokens=`output_tokens` total_tokens=`total_tokens` usage_state=`usage_state` measurement_source=`measurement_source`*

## query
    + `session_id`=""
    + `workspace_id`=""
    + `model_id`=""
    + `limit`=50
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="session_id"**
  1. `ps`
    **session_id = `ps`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **pm = > json.get value=`payload` key="model_id"**
  1. `pm`
    **model_id = `pm`**
  **pl = > json.get value=`payload` key="limit"**
  1. `pl`
    **limit = `pl`**

**store = > db.open**
**rows = > `store`.select table="model_calls" limit=`limit` order="-started_at"**
**out = > table.empty_list**
**known_total = 0**
**unknown_count = 0**
**partial_count = 0**
1. `rows`
  - [r](遍历 rows 为 r)
    **keep = True**
    1. `session_id`
      **rs = [session_id](access(r, "session_id"))**
      1. not `rs` == `session_id`
        **keep = False**
    1. `workspace_id`
      **rw = [workspace_id](access(r, "workspace_id"))**
      1. not `rw` == `workspace_id`
        **keep = False**
    1. `model_id`
      **rm = [model_id](access(r, "model_id"))**
      1. not `rm` == `model_id`
        **keep = False**
    1. `keep`
      **us = [usage_state](access(r, "usage_state"))**
      **tt = [total_tokens](access(r, "total_tokens"))**
      1. `us` == "unknown"
        **unknown_count = `unknown_count` + 1**
      2. `us` == "partial"
        **partial_count = `partial_count` + 1**
        1. `tt`
          **known_total = `known_total` + `tt`**
      3. *
        1. `tt`
          **known_total = `known_total` + `tt`**
      **display = > format_row row=`r`**
      **item = > table.put in=`r` at="display" value=`display`**
      **out = > table.append list=`out` item=`item`**

**coverage = "complete"**
1. `unknown_count` > 0
  **coverage = "partial_unknown"**
1. `partial_count` > 0
  1. `coverage` == "complete"
    **coverage = "partial"**

`summary` =

| known_total_tokens | unknown_calls | partial_calls | coverage | note |
|--------------------|---------------|---------------|----------|------|
| `known_total` | `unknown_count` | `partial_count` | `coverage` | "unknown never shown as 0" |

`ret` =

| ok | calls | summary |
|----|-------|---------|
| True | `out` | `summary` |

*ret*

## format_row
    + `row`

Human display for one call. Unknown must not become "0 tokens".

**us = > json.get value=`row` key="usage_state"**
**tt = > json.get value=`row` key="total_tokens"**
**it = > json.get value=`row` key="input_tokens"**
**ot = > json.get value=`row` key="output_tokens"**
1. not `us`
  **us = "unknown"**
**summary = "用量未知"**
**forbid_zero = True**
1. `us` == "zero_calls"
  **summary = "本轮未调用模型 · 0 tokens"**
  **forbid_zero = False**
2. `us` == "final"
  1. `tt` != None
    **summary = "" + `tt` + " tokens"**
    **forbid_zero = False**
  2. *
    1. `it` != None
      **summary = "至少 " + `it` + " tokens"**
      **forbid_zero = True**
3. `us` == "partial"
  1. `it` != None
    **summary = "至少 " + `it` + " tokens · 另有用量未知"**
  2. *
    **summary = "用量部分未知"**
  **forbid_zero = True**
4. `us` == "unknown"
  **summary = "用量未知"**
  **forbid_zero = True**

`disp` =

| summary | forbid_zero | usage_state |
|---------|-------------|-------------|
| `summary` | `forbid_zero` | `us` |

*disp*

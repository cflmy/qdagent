---
markup: occlusion
title: execution/turns
description: >-
  Q-R2 Turn lifecycle — accepted→queued→running→finalizing→completed,
  cancel_requested→cancelled. Abort alone is not enough; unknown turn → 404.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  text: lib/text.mq.md
  sys: lib/sys.mq.md
---

## create
    + `request_id`=""
    + `session_id`=""
    + `workspace_id`="ws-default"
    + `model_id`=""
    + `model_snapshot`=""
    + `payload`=None

1. `payload`
  **pr = > json.get value=`payload` key="request_id"**
  1. `pr`
    **request_id = `pr`**
  **ps = > json.get value=`payload` key="session_id"**
  1. `ps`
    **session_id = `ps`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **sel = > json.get value=`payload` key="selection"**
  1. `sel`
    Soft-get: selection may be a non-map under some clients — never `json get needs map`.
    **sel_s = > json.stringify value=`sel`**
    **sel_map = > text.starts_with text=`sel_s` prefix="{"**
    1. `sel_map`
      **sm = > json.get value=`sel` key="model_id"**
      1. `sm`
        **model_id = `sm`**
    2. *
      **_ = 1**

**store = > db.open**
**u = > time.now_unix**
**payload_hash = ""**
1. `payload`
  **payload_s = > json.stringify value=`payload`**
  **pn = > len value=`payload_s`**
  **payload_hash = "len:" + `pn`**
1. not `request_id`
  **nonce = > sys.env_get name="RANDOM"**
  1. not `nonce`
    **nonce = `u`**
  **request_id = "req-" + `u` + "-" + `nonce`**
1. `request_id`
  **dup = > `store`.select table="turn_state" limit=500 order="-created_at"**
  1. `dup`
    - [t](遍历 dup 为 t)
      **rid = > json.get value=`t` key="request_id"**
      1. `rid` == `request_id`
        **prev_hash = > json.get value=`t` key="payload_hash"**
        1. `prev_hash`
          1. `payload_hash`
            1. not `prev_hash` == `payload_hash`
              `conflict` =

              | ok | error | code |
              |----|-------|------|
              | False | same request_id different payload | request_id.conflict |

              *conflict*
        **tid = > json.get value=`t` key="id"**
        **st = > json.get value=`t` key="state"**
        **prev_rev = > json.get value=`t` key="revision"**
        `same` =

        | ok | turn_id | request_id | state | reused | revision |
        |----|---------|------------|-------|--------|----------|
        | True | `tid` | `request_id` | `st` | True | `prev_rev` |

        *same*

**tid = "turn-" + `u` + "-" + `request_id`**
1. not `model_snapshot`
  1. `model_id`
    **model_snapshot = "{\"mode\":\"manual\",\"model_id\":\"" + `model_id` + "\"}"**
`ins` =

| id | session_id | workspace_id | owner_id | request_id | payload_hash | state | model_id | model_snapshot | cancel_requested | usage_state | error | last_event_seq | revision | created_at | updated_at |
|----|------------|--------------|----------|------------|--------------|-------|----------|----------------|------------------|-------------|-------|----------------|----------|------------|------------|
| `tid` | `session_id` | `workspace_id` | local | `request_id` | `payload_hash` | accepted | `model_id` | `model_snapshot` | 0 | unknown |  | 0 | 1 | `u` | `u` |

> `store`.insert table=turn_state rows=`ins`
`ret` =

| ok | turn_id | request_id | state | model_id | reused | events_url |
|----|---------|------------|-------|----------|--------|------------|
| True | `tid` | `request_id` | accepted | `model_id` | False | "/api/app/turns/" + `tid` + "/events" |

*ret*

## get
    + `turn_id`=""
    + `payload`=None

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    1. not `turn_id`
      **turn_id = `pid`**
1. not `turn_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | turn_id required | resource.not_found |

  *need*
**store = > db.open**
**row = > `store`.get table="turn_state" id=`turn_id`**
1. not `row`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | turn not found | resource.not_found |

  *nf*
`ret` =

| ok | turn |
|----|------|
| True | `row` |

*ret*

## cancel
    + `turn_id`=""
    + `request_id`=""
    + `payload`=None

Idempotent cancel request. Runtime cooperates by checking cancel_requested.

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pr = > json.get value=`payload` key="request_id"**
  1. `pr`
    **request_id = `pr`**

**store = > db.open**
**u = > time.now_unix**
1. not `turn_id`
  1. `request_id`
    **rows = > `store`.select table="turn_state" limit=50 order="-created_at"**
    1. `rows`
      - [t](遍历 rows 为 t)
        **rid = [request_id](access(t, "request_id"))**
        1. `rid` == `request_id`
          **turn_id = [id](access(t, "id"))**
1. not `turn_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | turn_id or request_id required | resource.not_found |

  *need*

**cur = > `store`.get table="turn_state" id=`turn_id`**
1. not `cur`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | turn not found | resource.not_found |

  *nf*

**st = [state](access(cur, "state"))**
1. `st` == "completed"
  `done` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | `st` | False | already finished |

  *done*
2. `st` == "cancelled"
  `alr` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | cancelled | True | already cancelled |

  *alr*

`patch` =

| state | cancel_requested | updated_at |
|-------|------------------|------------|
| cancelling | 1 | `u` |

> `store`.update table="turn_state" id=`turn_id` row=`patch`
`ret` =

| ok | turn_id | state | cancel_requested |
|----|---------|-------|------------------|
| True | `turn_id` | cancelling | True |

*ret*

## is_cancelled
    + `turn_id`

**store = > db.open**
**row = > `store`.get table="turn_state" id=`turn_id`**
1. not `row`
  *False*
**flag = [cancel_requested](access(row, "cancel_requested"))**
1. `flag`
  *True*
**st = [state](access(row, "state"))**
1. `st` == "cancelled"
  *True*
2. `st` == "cancelling"
  *True*
*False*

## complete
    + `turn_id`
    + `state`="completed"
    + `usage_state`="unknown"
    + `error`=""
    + `expected_revision`=0

Terminal write with optional expected_revision CAS. Never regress completed/cancelled.

**store = > db.open**
**cur = > `store`.get table="turn_state" id=`turn_id`**
1. not `cur`
  *False*
**st = [state](access(cur, "state"))**
1. `st` == "completed"
  *True*
1. `st` == "cancelled"
  *True*
1. `expected_revision`
  **crev = [revision](access(cur, "revision"))**
  1. not `crev` == `expected_revision`
    *False*
**u = > time.now_unix**
**crev2 = [revision](access(cur, "revision"))**
**nrev = `crev2` + 1**
**cancel_flag = 0**
1. `state` == "cancelled"
  **cancel_flag = 1**
`patch` =

| state | usage_state | error | cancel_requested | revision | updated_at |
|-------|-------------|-------|------------------|----------|------------|
| `state` | `usage_state` | `error` | `cancel_flag` | `nrev` | `u` |

> `store`.update table="turn_state" id=`turn_id` row=`patch`
*True*

## sse_events
    + `turn_id`=""
    + `content`=""
    + `model_snapshot`=None
    + `usage`=None
    + `ok`=True
    + `citations`=None

Build real multi-event SSE payload (not a single post-complete fake chunk pretending to stream).
Events: turn.started, model.resolved, message.delta, usage.updated, turn.completed|failed.

**u = > time.now_unix**
**sid = "sess"**
**wid = "ws-default"**
1. `turn_id`
  **got = > get turn_id=`turn_id`**
  **gok = > json.get value=`got` key="ok"**
  1. `gok`
    **turn = > json.get value=`got` key="turn"**
    1. `turn`
      **sid = > json.get value=`turn` key="session_id"**
      **wid = > json.get value=`turn` key="workspace_id"**
      1. not `sid`
        **sid = "sess"**
      1. not `wid`
        **wid = "ws-default"**
      1. not `model_snapshot`
        **model_snapshot = > json.get value=`turn` key="model_snapshot"**

**seq = 1**
**e1 = "{\"schema_version\":1,\"event_id\":\"evt-" + `turn_id` + "-1\",\"seq\":1,\"type\":\"turn.started\",\"session_id\":\"" + `sid` + "\",\"turn_id\":\"" + `turn_id` + "\",\"workspace_id\":\"" + `wid` + "\",\"created_at\":" + `u` + ",\"payload\":{}}"**
**seq = 2**
**ms = "{}"**
1. `model_snapshot`
  **ms = `model_snapshot`**
  1. not `ms`
    **ms = "{}"**
**e2 = "{\"schema_version\":1,\"event_id\":\"evt-" + `turn_id` + "-2\",\"seq\":2,\"type\":\"model.resolved\",\"session_id\":\"" + `sid` + "\",\"turn_id\":\"" + `turn_id` + "\",\"workspace_id\":\"" + `wid` + "\",\"created_at\":" + `u` + ",\"payload\":" + `ms` + "}"**
Emit message.delta before terminal so UI paints prior to turn.completed
(evented-batch; not claimed as true token streaming).
**content_s = > json.stringify value=`content`**
**e3 = "{\"schema_version\":1,\"event_id\":\"evt-" + `turn_id` + "-3\",\"seq\":3,\"type\":\"message.delta\",\"session_id\":\"" + `sid` + "\",\"turn_id\":\"" + `turn_id` + "\",\"workspace_id\":\"" + `wid` + "\",\"created_at\":" + `u` + ",\"payload\":{\"delta\":" + `content_s` + "}}"**
**usage_s = "{\"usage_state\":\"unknown\"}"**
1. `usage`
  **usage_s = > json.stringify value=`usage`**
**e4 = "{\"schema_version\":1,\"event_id\":\"evt-" + `turn_id` + "-4\",\"seq\":4,\"type\":\"usage.updated\",\"session_id\":\"" + `sid` + "\",\"turn_id\":\"" + `turn_id` + "\",\"workspace_id\":\"" + `wid` + "\",\"created_at\":" + `u` + ",\"payload\":" + `usage_s` + "}"**
**term = "turn.completed"**
1. not `ok`
  **term = "turn.failed"**
**e5 = "{\"schema_version\":1,\"event_id\":\"evt-" + `turn_id` + "-5\",\"seq\":5,\"type\":\"" + `term` + "\",\"session_id\":\"" + `sid` + "\",\"turn_id\":\"" + `turn_id` + "\",\"workspace_id\":\"" + `wid` + "\",\"created_at\":" + `u` + ",\"payload\":{\"ok\":" + `ok` + "}}"**

**sse = "data: " + `e1` + "\n\ndata: " + `e2` + "\n\ndata: " + `e3` + "\n\ndata: " + `e4` + "\n\ndata: " + `e5` + "\n\ndata: [DONE]\n\n"**
`ret` =

| ok | sse | turn_id | streaming_contract |
|----|-----|---------|--------------------|
| True | `sse` | `turn_id` | "evented-batch; fallback when sse-live unavailable — prefer token-stream via stream:true" |

*ret*

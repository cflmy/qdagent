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
  fs: lib/fs.mq.md
  net: lib/net.mq.md
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

| id | session_id | workspace_id | owner_id | request_id | payload_hash | state | model_id | model_snapshot | cancel_requested | usage_state | error | last_event_seq | result_ref | recovery_action | runtime_task_id | runtime_cancel_token | revision | created_at | updated_at |
|----|------------|--------------|----------|------------|--------------|-------|----------|----------------|------------------|-------------|-------|----------------|------------|-----------------|-----------------|----------------------|----------|------------|------------|
| `tid` | `session_id` | `workspace_id` | local | `request_id` | `payload_hash` | accepted | `model_id` | `model_snapshot` | 0 | unknown |  | 0 |  |  |  |  | 1 | `u` | `u` |

> `store`.insert table=turn_state rows=`ins`
`ret` =

| ok | turn_id | request_id | state | model_id | reused | events_url |
|----|---------|------------|-------|----------|--------|------------|
| True | `tid` | `request_id` | accepted | `model_id` | False | "/api/app/turns/" + `tid` + "/events" |

*ret*

## get
    + `turn_id`=""
    + `payload`=None

Q-A3: always return state/result_ref/last_seq/answer_revision plus a message
snapshot when events exist. Terminal get still fills projection — never bare state.

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
**snap = > build_message_snapshot turn_id=`turn_id`**
**st = > json.get value=`row` key="state"**
**last_seq = > json.get value=`row` key="last_event_seq"**
1. not `last_seq`
  **last_seq = 0**
**result_ref = > json.get value=`row` key="result_ref"**
**rev = > json.get value=`row` key="revision"**
1. not `rev`
  **rev = 0**
**answer_revision = > json.get value=`snap` key="answer_revision"**
1. not `answer_revision`
  **answer_revision = `rev`**
**message_snapshot = > json.get value=`snap` key="text"**
1. not `message_snapshot`
  **message_snapshot = ""**
**recovery_options = > recovery_options_for state=`st` recovery_action=`row`**
`ret` =

| ok | turn | state | last_seq | result_ref | answer_revision | message_snapshot | recovery_options | events_url |
|----|------|-------|----------|------------|-----------------|------------------|------------------|------------|
| True | `row` | `st` | `last_seq` | `result_ref` | `answer_revision` | `message_snapshot` | `recovery_options` | "/api/app/turns/" + `turn_id` + "/events" |

*ret*

## build_message_snapshot
    + `turn_id`

Rebuild answer projection from durable message.delta events (read-only; no tool exec).

**store = > db.open**
**text = ""**
**answer_revision = 0**
**rows = > `store`.select table="turn_events" limit=2000 order="seq"**
1. `rows`
  - [r](遍历 rows 为 r)
    **rid = > json.get value=`r` key="turn_id"**
    1. `rid` == `turn_id`
      **etype = > json.get value=`r` key="type"**
      **rseq = > json.get value=`r` key="seq"**
      1. `etype` == "message.delta"
        **body_s = > json.get value=`r` key="body"**
        1. `body_s`
          **body = > json.parse text=`body_s`**
          **pl = > json.get value=`body` key="payload"**
          1. not `pl`
            **pl = `body`**
          **delta = > json.get value=`pl` key="delta"**
          1. not `delta`
            **delta = > json.get value=`pl` key="text"**
          **kind = > json.get value=`pl` key="kind"**
          **ptype = > json.get value=`pl` key="type"**
          **ch = > json.get value=`pl` key="channel"**
          1. `ptype` == "preflight"
            **_ = 1**
          2. `kind` == "plan"
            **_ = 1**
          3. `kind` == "reasoning"
            **_ = 1**
          4. `ch`
            1. `ch` == "answer"
              1. `delta`
                **text = `text` + `delta`**
                1. `rseq`
                  **answer_revision = `rseq`**
            2. *
              Non-answer channels never enter chat projection.
              **_ = 1**
          5. `delta`
            Missing channel → answer (compat).
            **text = `text` + `delta`**
            1. `rseq`
              **answer_revision = `rseq`**
`out` =

| text | answer_revision |
|------|-----------------|
| `text` | `answer_revision` |

*out*

## recovery_options_for
    + `state`=""
    + `recovery_action`=None

Map durable turn state → UI recovery_options (Chinese labels). Observe ≠ write.

**ra = ""**
1. `recovery_action`
  **ra = > json.get value=`recovery_action` key="recovery_action"**
1. not `ra`
  **ra = ""**
**opts = > table.empty_list**
`opt_reconnect` =

| action | label | effect |
|--------|-------|--------|
| reconnect | 重新连接 | events_only |

`opt_continue` =

| action | label | effect |
|--------|-------|--------|
| continue | 继续执行 | new_attempt |

`opt_view` =

| action | label | effect |
|--------|-------|--------|
| reconnect | 查看已完成步骤 | events_only |

1. `state` == "interrupted"
  **opts = > table.append list=`opts` item=`opt_reconnect`**
  **opts = > table.append list=`opts` item=`opt_continue`**
2. `state` == "running"
  **opts = > table.append list=`opts` item=`opt_reconnect`**
3. `state` == "queued"
  **opts = > table.append list=`opts` item=`opt_reconnect`**
4. `state` == "accepted"
  **opts = > table.append list=`opts` item=`opt_reconnect`**
5. `state` == "failed"
  1. `ra` == "resume_events"
    **opts = > table.append list=`opts` item=`opt_continue`**
6. `state` == "completed"
  终端已完成：正文已在会话里，不再挂「查看已完成步骤」噪声按钮。
7. `state` == "cancelled"
  已取消同理：无恢复动作。
*opts*

## recover
    + `turn_id`=""
    + `action`="reconnect"
    + `expected_revision`=0
    + `idempotency_key`=""
    + `payload`=None

Q-A3 server recovery gate. `reconnect` = events only (no tool re-exec).
`continue` = explicit new attempt under CAS; original terminal row stays immutable.
Never blind-retry writes; ledger via recovery_action + resumed_from.

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pa = > json.get value=`payload` key="action"**
  1. `pa`
    **action = `pa`**
  **er = > json.get value=`payload` key="expected_revision"**
  1. `er`
    **expected_revision = `er`**
  **ik = > json.get value=`payload` key="idempotency_key"**
  1. `ik`
    **idempotency_key = `ik`**
1. not `turn_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | turn_id required | resource.not_found |

  *need*
1. not `action`
  **action = "reconnect"**

**store = > db.open**
**cur = > `store`.get table="turn_state" id=`turn_id`**
1. not `cur`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | turn not found | resource.not_found |

  *nf*

**st = > json.get value=`cur` key="state"**
**crev = > json.get value=`cur` key="revision"**
1. not `crev`
  **crev = 0**
**u = > time.now_unix**

Idempotent continue before CAS — same key returns prior child even if parent revision moved.
1. `action` == "continue"
  1. `idempotency_key`
    **dup0 = > `store`.select table="turn_state" limit=200 order="-created_at"**
    1. `dup0`
      - [t0](遍历 dup0 为 t0)
        **rid0 = > json.get value=`t0` key="request_id"**
        1. `rid0` == `idempotency_key`
          **child0 = > json.get value=`t0` key="id"**
          **cst0 = > json.get value=`t0` key="state"**
          **child_url0 = "/api/app/turns/" + `child0` + "/events"**
          `reuse0` =

          | ok | action | effect | turn_id | resumed_from | state | revision | events_url | allow_run | reused | note |
          |----|--------|--------|---------|--------------|-------|----------|------------|-----------|--------|------|
          | True | continue | new_attempt | `child0` | `turn_id` | `cst0` | `crev` | `child_url0` | True | True | idempotent continue |

          *reuse0*

1. `expected_revision`
  1. not `crev` == `expected_revision`
    `cas` =

    | ok | error | code | revision |
    |----|-------|------|----------|
    | False | revision mismatch | revision.conflict | `crev` |

    *cas*

**events_url = "/api/app/turns/" + `turn_id` + "/events"**

Observe-only reconnect: never spawn tools or mutate terminal state.
Bind the result map before the branch so `*reconnect_out*` is never an
implicit required parameter / undefined local (same class as gateway `patt`).

**reconnect_out = None**
1. `action` == "reconnect"
  `reconnect_out` =

  | ok | action | effect | turn_id | state | revision | events_url | allow_run | note |
  |----|--------|--------|---------|-------|----------|------------|-----------|------|
  | True | reconnect | events_only | `turn_id` | `st` | `crev` | `events_url` | False | reconnect does not re-POST user task |

  *reconnect_out*

1. `action` == "continue"
  1. `st` == "completed"
    `term` =

    | ok | error | code | state |
    |----|-------|------|-------|
    | False | terminal turn is immutable; start a new user message | turn.already_terminal | `st` |

    *term*
  2. `st` == "cancelled"
    `term2` =

    | ok | error | code | state |
    |----|-------|------|-------|
    | False | cancelled turn is immutable; start a new user message | turn.already_terminal | `st` |

    *term2*
  3. `st` == "failed"
    **ra0 = > json.get value=`cur` key="recovery_action"**
    1. not `ra0` == "resume_events"
      1. not `ra0` == "continue_granted"
        `nofail` =

        | ok | error | code | state |
        |----|-------|------|-------|
        | False | failed turn has no continue grant; reconnect to inspect | turn.continue_denied | `st` |

        *nofail*
  4. `st` == "interrupted"
    **_ = 1**
  5. *
    `norun` =

    | ok | error | code | state |
    |----|-------|------|-------|
    | False | continue only for interrupted (or granted failed); use reconnect | turn.continue_denied | `st` |

    *norun*

  Idempotent continue: same idempotency_key returns prior child turn.
  1. `idempotency_key`
    **dup = > `store`.select table="turn_state" limit=200 order="-created_at"**
    1. `dup`
      - [t](遍历 dup 为 t)
        **rid = > json.get value=`t` key="request_id"**
        1. `rid` == `idempotency_key`
          **child = > json.get value=`t` key="id"**
          **cst = > json.get value=`t` key="state"**
          **child_url = "/api/app/turns/" + `child` + "/events"**
          `reuse` =

          | ok | action | effect | turn_id | resumed_from | state | revision | events_url | allow_run | reused | note |
          |----|--------|--------|---------|--------------|-------|----------|------------|-----------|--------|------|
          | True | continue | new_attempt | `child` | `turn_id` | `cst` | `crev` | `child_url` | True | True | idempotent continue |

          *reuse*

  **sid = > json.get value=`cur` key="session_id"**
  **wid = > json.get value=`cur` key="workspace_id"**
  **mid = > json.get value=`cur` key="model_id"**
  **ms = > json.get value=`cur` key="model_snapshot"**
  1. not `sid`
    **sid = ""**
  1. not `wid`
    **wid = "ws-default"**
  1. not `idempotency_key`
    **nonce = > sys.env_get name="RANDOM"**
    1. not `nonce`
      **nonce = `u`**
    **idempotency_key = "recover-" + `turn_id` + "-" + `u` + "-" + `nonce`**
  **payload_hash = "resumed_from:" + `turn_id`**
  **child_id = "turn-" + `u` + "-" + `idempotency_key`**
  `ins` =

  | id | session_id | workspace_id | owner_id | request_id | payload_hash | state | model_id | model_snapshot | cancel_requested | usage_state | error | last_event_seq | result_ref | recovery_action | runtime_task_id | runtime_cancel_token | revision | created_at | updated_at |
  |----|------------|--------------|----------|------------|--------------|-------|----------|----------------|------------------|-------------|-------|----------------|------------|-----------------|-----------------|----------------------|----------|------------|------------|
  | `child_id` | `sid` | `wid` | local | `idempotency_key` | `payload_hash` | accepted | `mid` | `ms` | 0 | unknown |  | 0 |  | resumed_from:`turn_id` |  |  | 1 | `u` | `u` |

  > `store`.insert table=turn_state rows=`ins`
  **nrev = `crev` + 1**
  `parent_patch` =

  | recovery_action | revision | updated_at |
  |-----------------|----------|------------|
  | continue_granted | `nrev` | `u` |

  > `store`.update table="turn_state" id=`turn_id` row=`parent_patch`
  **child_url = "/api/app/turns/" + `child_id` + "/events"**
  `cont` =

  | ok | action | effect | turn_id | resumed_from | state | revision | events_url | allow_run | reused | note |
  |----|--------|--------|---------|--------------|-------|----------|------------|-----------|--------|------|
  | True | continue | new_attempt | `child_id` | `turn_id` | accepted | `nrev` | `child_url` | True | False | original turn immutable; client must not silent-retry tools |

  *cont*

`bad` =

| ok | error | code |
|----|-------|------|
| False | unknown recovery action | invalid_arguments |

*bad*

## cancel
    + `turn_id`=""
    + `request_id`=""
    + `expected_revision`=0
    + `payload`=None

CAS cancel → cancelling, then bridge `/_runtime/tasks/{id}/cancel` (and cancel-token file).
Unknown turn → 404. Terminal → already_terminal (ok).

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pr = > json.get value=`payload` key="request_id"**
  1. `pr`
    **request_id = `pr`**
  **er = > json.get value=`payload` key="expected_revision"**
  1. `er`
    **expected_revision = `er`**

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
**crev = [revision](access(cur, "revision"))**
1. `expected_revision`
  1. not `crev` == `expected_revision`
    `cas` =

    | ok | error | code | revision |
    |----|-------|------|----------|
    | False | revision mismatch | revision.conflict | `crev` |

    *cas*
1. `st` == "completed"
  `done` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | `st` | False | already_terminal |

  *done*
2. `st` == "cancelled"
  `alr` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | cancelled | True | already_terminal |

  *alr*
3. `st` == "interrupted"
  `intr` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | interrupted | False | already_terminal |

  *intr*
4. `st` == "cancelling"
  > bridge_runtime_cancel turn=`cur`
  `prog` =

  | ok | turn_id | state | cancel_requested | note |
  |----|---------|-------|------------------|------|
  | True | `turn_id` | cancelling | True | cancel_in_progress |

  *prog*

**nrev = `crev` + 1**
`patch` =

| state | cancel_requested | revision | updated_at |
|-------|------------------|----------|------------|
| cancelling | 1 | `nrev` | `u` |

> `store`.update table="turn_state" id=`turn_id` row=`patch`
**cur2 = > `store`.get table="turn_state" id=`turn_id`**
> bridge_runtime_cancel turn=`cur2`
`ret` =

| ok | turn_id | state | cancel_requested | revision |
|----|---------|-------|------------------|----------|
| True | `turn_id` | cancelling | True | `nrev` |

*ret*

## bridge_runtime_cancel
    + `turn`=None

Write cancel-token file (if known) and POST `/_runtime/tasks/{runtime_task_id}/cancel`.

1. not `turn`
  *False*
**tok = > json.get value=`turn` key="runtime_cancel_token"**
1. `tok`
  > fs.write path=`tok` text="cancelled"
**tid = > json.get value=`turn` key="runtime_task_id"**
1. `tid`
  **port_s = > sys.env_get name="QDAGENT_PORT"**
  1. not `port_s`
    **port_s = "7431"**
  **url = "http://127.0.0.1:" + `port_s` + "/_runtime/tasks/" + `tid` + "/cancel"**
  **_ = > net.http_post url=`url` body="{}" content_type="application/json"**
*True*

## bind_runtime
    + `turn_id`=""
    + `payload`=None

Capture worker `MARQDO_TASK_ID` / `MARQDO_CANCEL_TOKEN` onto the turn for cancel bridge.

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
1. not `turn_id`
  *False*
**task = > sys.env_get name="MARQDO_TASK_ID"**
**tok = > sys.env_get name="MARQDO_CANCEL_TOKEN"**
1. not `task`
  1. not `tok`
    *False*
**store = > db.open**
**u = > time.now_unix**
`patch` =

| runtime_task_id | runtime_cancel_token | state | updated_at |
|-----------------|----------------------|-------|------------|
| `task` | `tok` | running | `u` |

> `store`.update table="turn_state" id=`turn_id` row=`patch`
*True*

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
1. `state` == "completed"
  > append_event turn_id=`turn_id` type="turn.completed" payload=None
2. `state` == "cancelled"
  > append_event turn_id=`turn_id` type="turn.cancelled" payload=None
3. `state` == "failed"
  > append_event turn_id=`turn_id` type="turn.failed" payload=None
4. `state` == "interrupted"
  > append_event turn_id=`turn_id` type="turn.interrupted" payload=None
*True*

## append_event
    + `turn_id`=""
    + `type`="message.delta"
    + `payload`=None
    + `event`=None
    + `publish`=True

Persist then optionally `sys.stream_publish`. Updates `last_event_seq`. Terminal types also set `result_ref`.

1. `event`
  **etype = > json.get value=`event` key="type"**
  1. `etype`
    **type = `etype`**
  **etid = > json.get value=`event` key="turn_id"**
  1. `etid`
    1. not `turn_id`
      **turn_id = `etid`**
  **ep = > json.get value=`event` key="payload"**
  1. `ep`
    1. not `payload`
      **payload = `ep`**
1. not `turn_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | turn_id required | resource.not_found |

  *need*

**store = > db.open**
**cur = > `store`.get table="turn_state" id=`turn_id`**
1. not `cur`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | turn not found | resource.not_found |

  *nf*

**prev = > json.get value=`cur` key="last_event_seq"**
1. not `prev`
  **prev = 0**
**seq = `prev` + 1**
**u = > time.now_unix**
**eid = "evt-" + `turn_id` + "-" + `seq`**
**sid = > json.get value=`cur` key="session_id"**
**wid = > json.get value=`cur` key="workspace_id"**
1. not `sid`
  **sid = ""**
1. not `wid`
  **wid = "ws-default"**
**body_map = > table.empty_map**
1. `event`
  **body_map = `event`**
2. *
  **pl = `payload`**
  1. not `pl`
    **pl = > table.empty_map**
  **body_map = > table.put in=`body_map` at="schema_version" value=1**
  **body_map = > table.put in=`body_map` at="event_id" value=`eid`**
  **body_map = > table.put in=`body_map` at="seq" value=`seq`**
  **body_map = > table.put in=`body_map` at="type" value=`type`**
  **body_map = > table.put in=`body_map` at="turn_id" value=`turn_id`**
  **body_map = > table.put in=`body_map` at="session_id" value=`sid`**
  **body_map = > table.put in=`body_map` at="workspace_id" value=`wid`**
  **body_map = > table.put in=`body_map` at="created_at" value=`u`**
  **body_map = > table.put in=`body_map` at="payload" value=`pl`**
**body_map = > table.put in=`body_map` at="event_id" value=`eid`**
**body_map = > table.put in=`body_map` at="seq" value=`seq`**
**body_s = > json.stringify value=`body_map`**
**row_id = `turn_id` + ":" + `seq`**
`ins` =

| id | turn_id | seq | event_id | type | body | created_at |
|----|---------|-----|----------|------|------|------------|
| `row_id` | `turn_id` | `seq` | `eid` | `type` | `body_s` | `u` |

> `store`.insert table=turn_events rows=`ins`
`seq_patch` =

| last_event_seq | updated_at |
|----------------|------------|
| `seq` | `u` |

> `store`.update table="turn_state" id=`turn_id` row=`seq_patch`
1. `type` == "turn.completed"
  `rf` =

  | result_ref | updated_at |
  |------------|------------|
  | `eid` | `u` |

  > `store`.update table="turn_state" id=`turn_id` row=`rf`
2. `type` == "turn.failed"
  `rf2` =

  | result_ref | updated_at |
  |------------|------------|
  | `eid` | `u` |

  > `store`.update table="turn_state" id=`turn_id` row=`rf2`
3. `type` == "turn.cancelled"
  `rf3` =

  | result_ref | updated_at |
  |------------|------------|
  | `eid` | `u` |

  > `store`.update table="turn_state" id=`turn_id` row=`rf3`
4. `type` == "turn.interrupted"
  `rf4` =

  | result_ref | recovery_action | updated_at |
  |------------|-----------------|------------|
  | `eid` | resume_events | `u` |

  > `store`.update table="turn_state" id=`turn_id` row=`rf4`
1. `publish`
  > sys.stream_publish event=`body_map`
`ret` =

| ok | turn_id | seq | event_id | event |
|----|---------|-----|----------|-------|
| True | `turn_id` | `seq` | `eid` | `body_map` |

*ret*

## events
    + `turn_id`=""
    + `after_seq`=0
    + `last_event_id`=""
    + `payload`=None
    + `stream`=True

Replay persisted events after `after_seq` / Last-Event-ID. Live-tail until terminal (control lane).

1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pa = > json.get value=`payload` key="after_seq"**
  1. `pa`
    **after_seq = `pa`**
  **pl = > json.get value=`payload` key="last_event_id"**
  1. `pl`
    **last_event_id = `pl`**
1. `last_event_id`
  **parts = > split value=`last_event_id` sep="-"**
  **n = > len value=`parts`**
  1. `n` > 0
    **tail = [last](access(parts, n))**
    1. `tail`
      **after_seq = `tail`**
1. not `turn_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | turn_id required | resource.not_found |

  *need*

**store = > db.open**
**cur = > `store`.get table="turn_state" id=`turn_id`**
1. not `cur`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | turn not found | resource.not_found |

  *nf*

**cursor = `after_seq`**
1. not `cursor`
  **cursor = 0**
**remain = 1**
1. `stream`
  **remain = 120**
**sse = ""**
**terminal = False**
- `remain` > 0
  **emitted = 0**
  **rows = > `store`.select table="turn_events" limit=500 order="seq"**
  1. `rows`
    - [r](遍历 rows 为 r)
      **rid = > json.get value=`r` key="turn_id"**
      1. `rid` == `turn_id`
        **rseq = > json.get value=`r` key="seq"**
        1. `rseq` > `cursor`
          **body = > json.get value=`r` key="body"**
          **etype = > json.get value=`r` key="type"**
          **eid = > json.get value=`r` key="event_id"**
          1. `body`
            **sse = `sse` + "id: " + `eid` + "\nevent: " + `etype` + "\ndata: " + `body` + "\n\n"**
            **emitted = `emitted` + 1**
            1. `stream`
              **ev = > json.parse text=`body`**
              1. `ev`
                > sys.stream_publish event=`ev`
          **cursor = `rseq`**
          1. `etype` == "turn.completed"
            **terminal = True**
          2. `etype` == "turn.failed"
            **terminal = True**
          3. `etype` == "turn.cancelled"
            **terminal = True**
          4. `etype` == "turn.interrupted"
            **terminal = True**
  **trow = > `store`.get table="turn_state" id=`turn_id`**
  **tst = > json.get value=`trow` key="state"**
  1. `tst` == "completed"
    **terminal = True**
  2. `tst` == "cancelled"
    **terminal = True**
  3. `tst` == "failed"
    **terminal = True**
  4. `tst` == "interrupted"
    **terminal = True**
  1. `terminal`
    **remain = 0**
  2. not `stream`
    **remain = 0**
  3. *
    > time.sleep_ms ms=250
    **remain = `remain` - 1**
1. `terminal`
  **sse = `sse` + "data: [DONE]\n\n"**
`ret` =

| ok | sse | turn_id | last_seq | terminal | streaming_contract |
|----|-----|---------|----------|----------|--------------------|
| True | `sse` | `turn_id` | `cursor` | `terminal` | "turn_events replay; Last-Event-ID / after_seq" |

*ret*

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

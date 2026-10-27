---
markup: occlusion
title: agent/tools/task_status
description: >-
  Q-A6 task.status — publish milestone status from real turn state only.
  Does not forge execution results.
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
---

## run
    + `turn_id`=""
    + `task_id`=""
    + `status`="running"
    + `detail`=""

Allowed status: pending | running | done | blocked.

1. not `turn_id`
  `err` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | turn_id required |

  *err*
1. not `task_id`
  `err2` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | task_id required |

  *err2*
1. not `status`
  **status = "running"**
1. `status` == "pending"
  **_ = 1**
2. `status` == "running"
  **_ = 1**
3. `status` == "done"
  **_ = 1**
4. `status` == "blocked"
  **_ = 1**
5. *
  `bad` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | status must be pending|running|done|blocked |

  *bad*

**got = > turns.get turn_id=`turn_id`**
**ok = > json.get value=`got` key="ok"**
1. not `ok`
  `nf` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | turn not found |

  *nf*

**delta = `task_id` + " → " + `status`**
1. `detail`
  **delta = `delta` + ": " + `detail`**
**esc = > json.stringify value=`delta`**
**payload = > json.parse text="{\"channel\":\"progress\",\"kind\":\"plan_act\",\"name\":\"" + `task_id` + "\",\"status\":\"" + `status` + "\",\"delta\":" + `esc` + "}"**
> turns.append_event turn_id=`turn_id` type="message.delta" payload=`payload`
`out` =

| ok | status | turn_id | task_id | task_status | note |
|----|--------|---------|---------|-------------|------|
| True | succeeded | `turn_id` | `task_id` | `status` | status event only — not proof of tool success |

*out*

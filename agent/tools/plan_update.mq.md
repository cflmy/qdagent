---
markup: occlusion
title: agent/tools/plan_update
description: >-
  Q-A6 plan.update — record milestone text as a progress/plan event.
  Does not claim execution completion; status stays planning evidence only.
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
---

## run
    + `turn_id`=""
    + `milestones`=None
    + `text`=""

1. not `turn_id`
  `err` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | turn_id required |

  *err*

**body = `text`**
1. `milestones`
  **body = > json.stringify value=`milestones`**
1. not `body`
  `empty` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | milestones or text required |

  *empty*

**esc = > json.stringify value=`body`**
**payload = > json.parse text="{\"channel\":\"progress\",\"kind\":\"plan\",\"delta\":" + `esc` + "}"**
> turns.append_event turn_id=`turn_id` type="message.delta" payload=`payload`
`out` =

| ok | status | turn_id | note |
|----|--------|---------|------|
| True | succeeded | `turn_id` | plan update is not execution evidence |

*out*

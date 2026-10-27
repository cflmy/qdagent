---
markup: occlusion
title: db/turn_events
description: >-
  Durable turn event log. UNIQUE(turn_id, seq) and UNIQUE(event_id).
  Authority for Last-Event-ID replay (does not re-run the model).
---

## schema

`fields` =

| 字段 | 类型 | 可空 |
|------|------|------|
| id | text | false |
| turn_id | text | false |
| seq | integer | false |
| event_id | text | false |
| type | text | false |
| body | text | false |
| created_at | integer | false |

*`fields`*

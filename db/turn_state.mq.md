---
markup: occlusion
---

## schema

`fields` =

| 字段 | 类型 | 可空 |
|------|------|------|
| id | text | false |
| session_id | text | true |
| workspace_id | text | true |
| owner_id | text | true |
| request_id | text | true |
| payload_hash | text | true |
| state | text | false |
| model_id | text | true |
| model_snapshot | text | true |
| cancel_requested | integer | false |
| usage_state | text | true |
| error | text | true |
| last_event_seq | integer | true |
| result_ref | text | true |
| recovery_action | text | true |
| runtime_task_id | text | true |
| runtime_cancel_token | text | true |
| revision | integer | false |
| created_at | text | true |
| updated_at | text | true |

*`fields`*

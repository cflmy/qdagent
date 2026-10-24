---
markup: occlusion
---

## schema

`fields` =

| 字段 | 类型 | 可空 |
|------|------|------|
| id | text | false |
| call_id | text | false |
| attempt_id | text | false |
| run_id | text | true |
| turn_id | text | true |
| session_id | text | true |
| workspace_id | text | true |
| purpose | text | true |
| model_id | text | true |
| model_snapshot | text | true |
| status | text | true |
| input_tokens | integer | true |
| output_tokens | integer | true |
| total_tokens | integer | true |
| cached_input_tokens | integer | true |
| reasoning_output_tokens | integer | true |
| usage_state | text | true |
| measurement_source | text | true |
| revision | integer | false |
| started_at | text | true |
| created_at | text | true |
| updated_at | text | true |

*`fields`*

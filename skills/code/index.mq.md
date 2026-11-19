---
markup: occlusion
title: Marqdo 代码开发
description: 生成可审阅的 Marqdo 源码草稿；发布须另外经过官方编译与独立验证
agent_effects: model
import:
  model: ../../agent/model.mq.md
  result: lib/result.mq.md
  json: lib/json.mq.md
  io: ../../agent/io.mq.md
  table: lib/table.mq.md
---

代码生成与执行有清晰边界。模型可以提出函数实现，但不能自签验收、授予权限、改测试案例或将生成的源码直接安装为 SKILL。建议先检索现有函数的语义身份与契约，只有确实缺少能力才进入生成。软件工程过程可由 workflows/software-development 继续承担。

## run

| 参数 | 类型 | 说明 |
|---|---|---|



We **answer = model.ask(role="chat")**.
1. not access(`answer`,"ok")
  Return *`answer`*.
We **source = json.get(value=access(`answer`,"value"),key="text")**.
We **checked = io.native(operation="agent_source_check",payload=table.put(in=None,at="source",value=`source`))**.
1. not access(`checked`,"ok")
  `invalid` =

  | status | source | diagnostic |
  |---|---|---|
  | "draft_invalid" | `source` | `checked` |

  Return *result.ok(value=`invalid`)*.
`draft` =

| status | source | compiler | assurance |
|---|---|---|---|
| "draft_needs_independent_review" | `source` | access(`checked`,"value") | "syntax_checked_only" |

Return *result.ok(value=`draft`)*.

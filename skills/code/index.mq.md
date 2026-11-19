---
markup: occlusion
title: Marqdo 代码开发
description: 生成可审阅的 Marqdo 源码草稿；发布须另外经过官方编译与独立验证
agent_effects: model
import:
  model: ../../agent/model.mq.md
  result: lib/result.mq.md
  json: lib/json.mq.md
---

代码生成与执行有清晰边界。模型可以提出函数实现，但不能自签验收、授予权限、改测试案例或将生成的源码直接安装为 SKILL。建议先检索现有函数的语义身份与契约，只有确实缺少能力才进入生成。软件工程过程可由 workflows/software-development 继续承担。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 模型与任务身份 |
| goal | text | 一次函数开发目标 |

Use `context`, `goal`。

We **request = "仅为下述职责提出一份可读 Marqdo .mq.md 源码草稿，必须包含输入、返回、约束，不能声称已测试或证明。无需重新写整个系统。\n" + `goal`**.
We **answer = model.ask(context=`context`,prompt=`request`,role="chat")**.
1. not access(`answer`,"ok")
  Return *`answer`*.
`draft` =

| status | source | assurance |
|---|---|---|
| "draft_needs_compiler_review" | json.get(value=access(`answer`,"value"),key="text") | "unverified" |

Return *result.ok(value=`draft`)*.

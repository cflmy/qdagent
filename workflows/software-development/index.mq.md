---
markup: occlusion
title: 软件开发工作簿
description: 可选的 Marqdo 工作流，而非智能体内核的必经四阶段。
import:
  workflow: ext/ai/workflow.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  io: ../../agent/io.mq.md
  author: author.mq.md
  result: lib/result.mq.md
---

工程活动需要持续确认边界、实际源码、独立案例和可追溯的效果收据。步骤来自当前项目的 Marqdo 工作簿，冻结的规格与实现代码不共享模型私有过程；模型失败不能跳过审查。这里创建检查点与步骤说明，后续显式 tick 而非后台无限循环。

## run

| 参数 | 类型 | 说明 |
|---|---|---|



**steps = > json.parse text=[{"id":"contract","kind":"model","prompt":"Confirm the minimal public function contract","options":["clarify","ready"]},{"id":"approval","kind":"input","question":"Approve the scoped development work?","options":["approve","deny"]},{"id":"end","kind":"return"}]**.
We **revision = io.native(operation="agent_source_revision",payload=table.put(in=None,at="path",value="workflows/software-development/index.mq.md"))**.
1. not access(`revision`,"ok")
  Return *`revision`*.
We **source_revision = access(`revision`,"value")**.
We **actor = io.current()**.
1. not access(`actor`,"ok")
  Return *`actor`*.
We **trusted = access(`actor`,"value")**.
We **run_id = access(`trusted`,"id")**.
We **opened = workflow.open(id=`run_id`,steps=`steps`,source_revision=`source_revision`,session_id=access(`trusted`,"id"),principal_ref=access(`trusted`,"owner"))**.
1. not json.get(value=`opened`,key="ok")
  Return *`opened`*.
`pending_workflow` =

| status | checkpoint | next |
|---|---|---|
| "workflow_waiting_model" | `opened` | "advance" |

Return *result.ok(value=`pending_workflow`)*.

## advance

| 参数 | 类型 | 说明 |
|---|---|---|



We **revision = io.native(operation="agent_source_revision",payload=table.put(in=None,at="path",value="workflows/software-development/index.mq.md"))**.
1. not access(`revision`,"ok")
  Return *`revision`*.
We **actor = io.current()**.
1. not access(`actor`,"ok")
  Return *`actor`*.
We **trusted = access(`actor`,"value")**.
Return *workflow.tick(id=access(`trusted`,"id"),source_revision=access(`revision`,"value"),session_id=access(`trusted`,"id"),principal_ref=access(`trusted`,"owner"))*.

## draft
    + `contract`

| 参数 | 类型 | 说明 |
|---|---|---|
| contract | text | 已审阅的函数边界 |

Use `contract`。

Return *author.propose()*.

## check
    + `source`

| 参数 | 类型 | 说明 |
|---|---|---|
| source | text | 实际需要核验的 Marqdo 草稿 |

Use `source`。

Return *author.inspect(source=`source`)*.

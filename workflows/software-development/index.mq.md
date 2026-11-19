---
markup: occlusion
title: 软件开发工作簿
description: 可选的 Marqdo 工作流，而非智能体内核的必经四阶段。
import:
  workflow: ext/ai/workflow.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

工程活动需要持续确认边界、实际源码、独立案例和可追溯的效果收据。步骤来自当前项目的 Marqdo 工作簿，冻结的规格与实现代码不共享模型私有过程；模型失败不能跳过审查。这里创建检查点与步骤说明，后续显式 tick 而非后台无限循环。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信会话与工作根 |
| goal | text | 用户确认的开发目标 |

Use `context`, `goal`。

We **steps = json.parse(text='[{"id":"contract","kind":"model","prompt":"Confirm the minimal public function contract","options":["clarify","ready"]},{"id":"approval","kind":"input","question":"Approve the scoped development work?","options":["approve","deny"]},{"id":"end","kind":"return"}]')**.
We **run_id = access(`context`,"task_id")**.
Return *workflow.open(id=`run_id`,steps=`steps`,source_revision="agent-v3",session_id=access(`context`,"task_id"),principal_ref=access(`context`,"owner"))*.

## advance
    + `context`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信运行身份 |

Use `context`。

Return *workflow.tick(id=access(`context`,"task_id"),source_revision="agent-v3",session_id=access(`context`,"task_id"),principal_ref=access(`context`,"owner"))*.

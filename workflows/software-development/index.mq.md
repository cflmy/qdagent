---
markup: occlusion
title: 软件开发工作簿
description: 可选的 Marqdo 工作流，而非智能体内核的必经四阶段。
import:
  workflow: ext/ai/workflow.mq.md
  table: lib/table.mq.md
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

`steps` =

| @ | id | kind | prompt | options |
|---|---|---|---|---|
| 1 | "contract" | "model" | "针对当前目标确定最小可验收的函数契约；只选择是否需要澄清" | "clarify,ready" |
| 2 | "implementation" | "input" | "审阅来源、输入输出和计划后批准进行实现" | "approve,deny" |
| 3 | "verification" | "input" | "独立查看源码、冻结用例与真实执行收据后确认验收" | "accept,reject" |

We **run_id = access(`context`,"run_id")**.
Return *workflow.open(id=`run_id`,steps=`steps`,source_revision="agent-v3",session_id=access(`context`,"task_id"),principal_ref=access(`context`,"owner"))*.

## advance
    + `context`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信运行身份 |

Use `context`。

Return *workflow.tick(id=access(`context`,"run_id"),source_revision="agent-v3",session_id=access(`context`,"task_id"),principal_ref=access(`context`,"owner"))*.

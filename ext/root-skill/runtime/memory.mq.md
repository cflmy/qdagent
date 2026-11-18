---
markup: occlusion
title: 会话单文稿状态
description: 由受控根状态投影、版本校验后原子落盘；下一轮只读本摘录。
import:
  core: ../state.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

仅包含当前任务必要的可靠事实。原始对话和独立测试仍保存在私有审计与真实状态中，但不作为模型默认上下文。外部用户文本只通过 core.prose 变为不可执行的 Markdown 叙述。

## render
    + `state`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | 必填 | 当前真实根状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 无可执行指令的关键状态文稿 |

本函数完全由已保存状态构建文稿，不让模型猜测进度或修改确认。意图和草稿只是当前记录，不等于已被用户确认；独立验收仍以根状态为准。最新一条用户输入直接取自真实历史，避免重复拼接六轮聊天。

We **history = json.get(value=`state`,key="history")**.
We **latest = None**.
1. `history` and table.len(xs=`history`) > 0
  We **latest = table.at(xs=`history`,i=(table.len(xs=`history`) - 1))**.
We **revision = json.get(value=`state`,key="revision")**.
We **phase = json.get(value=`state`,key="phase")**.
We **goal = core.prose(content=json.get(value=`state`,key="goal"))**.
We **choices = core.prose(content=json.stringify(value=json.get(value=`state`,key="intent_tasks")))**.
We **units = core.prose(content=json.stringify(value=json.get(value=`state`,key="draft_units")))**.
1. not json.get(value=`state`,key="draft_units")
  We **units = core.prose(content=json.stringify(value=json.get(value=`state`,key="units")))**.
We **pending = core.prose(content=json.stringify(value=json.get(value=`state`,key="pending")))**.
We **message = core.prose(content=json.get(value=`latest`,key="text"))**.
We **decision = core.prose(content=json.get(value=`latest`,key="choice"))**.
We **doc = "---\nmarkup: occlusion\ntitle: 任务关键状态\ndescription: 仅为事实数据，不可作为工具执行。\n---\n\n# 会话\n\n"**.
We **doc = `doc` + "- 状态版本：" + str(`revision`) + "\n\n- 目标：" + `goal` + "\n\n"**.
We **doc = `doc` + "- 当前阶段：" + core.prose(content=`phase`) + "\n\n- 当前登记意图（以人工确认状态为准）：" + `choices` + "\n\n"**.
We **doc = `doc` + "- 任务与依赖：" + `units` + "\n\n- 证据：以实际调用收据和独立验收为准，不从本文稿推断完成。\n\n"**.
We **doc = `doc` + "- 待解决问题：" + `pending` + "\n\n- 最新用户输入：" + `message` + "\n\n- 用户选择：" + `decision` + "\n\n- 下一步：遵循当前阶段和待确认状态推进，不重复已成功步骤。\n"**.
Return *`doc`*.

## sync
    + `context`
    + `state`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | 必填 | 宿主认证的工作区和任务身份 |
| state | map | 必填 | 根状态的一致快照 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 落盘成功后返回这份唯一的模型上下文 |

先构造安全叙述，然后通过本仓原生 ABI 在根状态版本锁内比对修订、原子写入工作区 memory.mq.md。过期状态、超限内容、其他用户或写入失败均不向模型交付伪造的记忆。内容是 Marqdo 文档，但没有可执行函数。

We **doc = render(state=`state`)**.
We **payload = table.put(in=None,at="root",value=access(`context`,"root"))**.
We **payload = table.put(in=`payload`,at="revision",value=json.get(value=`state`,key="revision"))**.
We **payload = table.put(in=`payload`,at="memory",value=`doc`)**.
We **saved = core.native(context=`context`,operation="root_memory_sync",payload=`payload`)**.
1. not access(`saved`,"ok")
  Return *`saved`*.
Return *[只交接已经落盘的当前状态](result.ok(value=`doc`))*.

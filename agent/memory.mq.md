---
markup: occlusion
title: 唯一跨轮模型记忆
description: 由可信状态生成无执行权的 memory.mq.md，不重放聊天历史。
import:
  session: session.mq.md
  io: io.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

此文稿只将真实状态投影为 Markdown。身份、批准、原始收据和证明不存入模型记忆。模型每轮只读取这份投影，不能通过修改它获取权限。

## sync

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 原生 CAS 保存的只读记忆文稿 |

We **saved = session.status()**.
1. not access(`saved`,"ok")
  Return *`saved`*.
We **state = access(`saved`,"value")**.
We **goal = json.stringify(value=json.get(value=`state`,key="goal"))**.
We **phase = json.stringify(value=json.get(value=`state`,key="phase"))**.
We **selected = json.stringify(value=json.get(value=`state`,key="selected_skill"))**.
We **body = "# 任务关键事实\n\n- 用户目标：" + str(`goal`) + "\n- 阶段：" + str(`phase`) + "\n- 已选能力：" + str(`selected`) + "\n\n这只是无执行权的状态投影。\n"**.
We **args = table.put(in=None,at="revision",value=access(`state`,"revision"))**.
Return *io.native(operation="agent_memory_sync",payload=table.put(in=`args`,at="memory",value=`body`))*.

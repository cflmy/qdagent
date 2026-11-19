---
markup: occlusion
title: 任务唯一模型记忆投影
description: 将已核验的状态投影成不可执行 Markdown，不存储聊天回放。
import:
  session: session.mq.md
  context: context.mq.md
  io: io.mq.md
  table: lib/table.mq.md
---

记忆来自真正的状态修订，原始对话和证据日志不进入默认模型提示。memory.mq.md 不含可执行函数，也不被解释器作为新的授权事实。写入使用原生版本核对、锁及原子替换；冲突失败而不是默默保留旧记忆。

## sync
    + `context`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信用户与任务根 |

Use `context`。

We **loaded = session.status(context=`context`)**.
1. not access(`loaded`,"ok")
  Return *`loaded`*.
We **state = access(`loaded`,"value")**.
We **body = context.memory(state=`state`)**.
We **args = table.put(in=None,at="revision",value=access(`state`,"revision"))**.
Return *io.native(context=`context`,operation="agent_memory_sync",payload=table.put(in=`args`,at="memory",value=`body`))*.

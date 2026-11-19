---
markup: occlusion
title: Marqdo 三源模型调用
description: 只传当前用户输入、memory.mq.md 和正在执行的文稿。
import:
  io: io.mq.md
  memory: memory.mq.md
  table: lib/table.mq.md
---

模型调用是普通 Marqdo 函数，不是第二套 Agent Loop。没有 prompt、messages、sources、外部 context 或历史参数。原生传输严格核对三个实际来源；role/step 仅用于日志和额度，不是模型消息内容。

## ask
    + `role`="chat"
    + `step`=1

| 参数 | 类型 | 说明 |
|---|---|---|
| role | text | route / chat；仅用于传输计量 |
| step | number | 当前调用序号 |

Use `role`="chat", `step`=1。

We **memo = memory.sync()**.
1. not access(`memo`,"ok")
  Return *`memo`*.
We **args = table.put(in=None,at="role",value=`role`)**.
Return *io.native(operation="agent_model_turn",payload=table.put(in=`args`,at="step",value=`step`))*.

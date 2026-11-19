---
markup: occlusion
title: 即时回答
description: 处理无需外部操作的解释、对话、归纳与简短写作
agent_effects: model
import:
  model: ../../agent/model.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

聊天不是一项软件开发项目。不生成新文稿或运行 shell，不先要求用户确认。当前文本就是模型本轮必要上下文；无法核实的新近事实应明确声明限制并进入真实研究能力。不同账号和轮次不共享隐式对话。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信模型身份 |
| goal | text | 用户本轮需求 |

Use `context`, `goal`。

We **short = "请直接回答下列请求。不能声称执行了没有实际执行的操作。需要联网事实或修改资源时明确需要调用其他 SKILL。\n\n" + `goal`**.
We **response = model.ask(context=`context`,prompt=`short`,role="chat")**.
1. not access(`response`,"ok")
  Return *`response`*.
Return *[只返回模型实际回答而非虚构工具收据](json.get(value=access(`response`,"value"),key="text"))*.

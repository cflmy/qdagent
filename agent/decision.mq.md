---
markup: occlusion
title: 单次候选选择
description: 纯模型文本通过候选白名单核对，不生成执行程序。
import:
  model: model.mq.md
  context: context.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

优先避免模型：只有一个候选时直接选取。多候选才请求短模型输出精确 ID，失败就返回 incomplete，不猜测路径或用最相似字符串替代。动态候选由官方编译器检验，路由时不会把知识全文或函数体注入上下文。

## choose
    + `context`
    + `goal`
    + `candidates`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信调用 |
| goal | text | 真实用户目标 |
| candidates | list | 已过滤可用能力 |

Use `context`, `goal`, `candidates`。

1. table.len(xs=`candidates`) == 0
  Return *result.error(code="agent.no_skill",message="没有匹配的已安装能力",operation="choose")*.
1. table.len(xs=`candidates`) == 1
  Return *result.ok(value=access(table.at(xs=`candidates`,i=0),"id"))*.
We **packet = context.routing_prompt(goal=`goal`,candidates=`candidates`)**.
We **response = model.ask(context=`context`,prompt=`packet`)**.
1. not access(`response`,"ok")
  Return *`response`*.
We **value = access(`response`,"value")**.
We **name = text.str_trim(s=str(json.get(value=`value`,key="text")))**.
- [候选 ID 必须精确相同](for candidates as item)
  1. `name` == access(`item`,"id")
    Return *result.ok(value=`name`)*.
Return *result.error(code="agent.route_invalid",message="模型没有输出可验证的候选 ID",operation="choose")*.

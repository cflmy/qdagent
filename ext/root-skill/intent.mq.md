---
markup: occlusion
title: 根 SKILL · intent
import:
  core: state.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  re: lib/re.mq.md
  hash: lib/hash.mq.md
  plugin: lib/plugin.mq.md
---

本模块是根 SKILL 的实际实现。公开入口见 [根流程](index.mq.md)，当前阶段的工程规范见 guides/。参数、返回和失败条件紧邻每个函数，调用不依赖隐藏的聊天规则。

## clarify_intent

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| summary | text | required | 模型对当前目标的理解 |
| question | text | required | 现在需要用户回答的一个问题 |
| choices | list | required | 二到六个可选文字，用户始终可以自由输入 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 待用户回答的意图卡片，阶段仍为 intent。 |

Use `context`, `summary`, `question`, `choices`。

意图拆解本身是一个函数。先阅读用户原话和已有答复，再用一个有区分度的问题缩小目标。
选项必须是用户能理解的选择，不把实现细节强加给用户；自由输入始终可用。每次只挂起
一个问题，答复后可再次调用本函数，多轮澄清不会自动批准。当前问题与摘要一同保留，
确认按钮所批准的是这个确切版本。模型不能传入 confirmed 或 actor 字段，也不能通过
发出一句“用户已经同意”前进。没有待回答问题和真实回复的意图不能进入基本方案。
失败会保留原问题；重复或并发调用不能用新的问题悄悄覆盖用户正在填写的内容。

A question is a persistent user interface contract. Its summary, choices and revision stay together while the user edits the response. Continuing clarification and confirming intent are separate user actions; neither is inferred from elapsed time or a model's confidence.

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "intent" or json.get(value=`state`,key="pending")
  Return *result.error(code="root.stage",message="当前阶段不允许覆盖意图问题",operation="clarify_intent")*.
1. table.len(xs=`choices`) < 2 or table.len(xs=`choices`) > 6 or `question` == "" or `summary` == ""
  Return *result.error(code="root.question",message="需要明确问题、摘要和二到六个选项",operation="clarify_intent")*.

`pending_view` =

| kind | summary | question | choices |
|---|---|---|---|
| "intent" | `summary` | `question` | `choices` |

We **patch = table.put(in=None,at="summary",value=`summary`)**.
We **patch = table.put(in=`patch`,at="pending",value=`pending_view`)**.
Return *core.save(context=`context`,state=table.merge(a=`state`,b=`patch`))*.

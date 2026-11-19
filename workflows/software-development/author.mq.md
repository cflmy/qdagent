---
markup: occlusion
title: 软件开发 · 生成和语法审查
description: 可读源码与真实官方编译诊断，不自动授予执行权。
import:
  model: ../../agent/model.mq.md
  io: ../../agent/io.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

仅负责生成一个确切职责的 Marqdo 草稿，并通过官方 parser 核验能否形成函数。程序测试、接口副作用和用户发布许可仍由独立阶段负责。模型生成代码不是来源证明，编译通过不是行为正确，调用前需要重新核对实际源码哈希和执行授权。

## propose
    + `context`
    + `contract`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信当前任务 |
| contract | text | 经用户确认的当前函数契约 |

Use `context`, `contract`。

We **prompt = "实现以下单个 Marqdo 函数契约。输出可单独保存的 .mq.md 文稿；保留可读说明，不输出未授权操作，不擅自修改冻结规格。\n" + `contract`**.
Return *model.ask(context=`context`,prompt=`prompt`,role="chat")*.

## inspect
    + `context`
    + `source`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信工程 |
| source | text | 待检查的可读源码 |

Use `context`, `source`。

We **params = table.put(in=None,at="source",value=`source`)**.
Return *io.native(context=`context`,operation="agent_source_check",payload=`params`)*.

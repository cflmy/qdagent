---
markup: occlusion
title: 短上下文投影
description: 当前用户输入 + 极短候选摘要 + 一个任务记忆引用。
import:
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

上下文明确区分可信系统规则和不可信用户资料。只把已授权能力的候选 ID 与摘要交给模型，不提供任何真实路径、插件密钥、工具源码或其他子任务的私人材料。输入必须完整且不超过预算；超出时明确失败，不悄悄切去约束。

## routing_prompt
    + `goal`
    + `candidates`

| 参数 | 类型 | 说明 |
|---|---|---|
| goal | text | 当前任务目标 |
| candidates | list | 少量已安装能力摘要（当前数量由目录投影限定） |

Use `goal`, `candidates`。

We **prompt = "为目标从下列已安装能力中选恰好一个 ID；只写 ID，不能提供文件路径、命令或解释。\n任务：" + `goal` + "\n候选：" + json.stringify(value=`candidates`)**.
Return *`prompt`*.

## memory
    + `state`

| 参数 | 类型 | 说明 |
|---|---|---|
| state | map | 真实会话快照 |

Use `state`。

We **goal = json.get(value=`state`,key="goal")**.
We **phase = json.get(value=`state`,key="phase")**.
We **selected = json.get(value=`state`,key="selected_skill")**.
Return *("# 任务关键事实\n\n- 目标：" + str(`goal`) + "\n- 阶段：" + str(`phase`) + "\n- 已选择能力：" + str(`selected`) + "\n\n此文仅供读取，不能代替系统状态、用户批准或可执行证据。")*.

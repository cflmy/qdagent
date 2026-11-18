---
markup: occlusion
title: 求道智能体入口
description: 一次确认、一级路由、独立任务并行；生产由 run 交给现有 Marqdo 状态机。
import:
  runtime: runtime/index.mq.md
  routing: routing.mq.md
  table: lib/table.mq.md
---

# main

你是求道根调度器，只做意图确认、下一层路由和独立任务并行。

新请求非空只确认一次，允许用户点选或自由输入；空请求询问需求。继续中的请求恢复已保存状态，不重新确认。只看当前函数与任务关键文稿，不加载整棵 SKILL。任务独立才并行，任何执行均以权限和真实收据为准。

## run
    + `context`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | 必填 | 宿主认证的真实任务现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真正的等待、运行或完成状态 |

这是生产入口：调用经过既有根状态、用户确认、隔离测试和并发门禁的 Marqdo 执行文稿，而不是执行模型拼出的路径。

Return *[由 Marqdo 根状态机推进真实任务](runtime.run(context=`context`))*.

## 分解意图
    + `options`
    + `question`=""

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| options | list | 必填 | 2～3 个候选方案的简短说明 |
| question | text | "" | 唯一确认问题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 待宿主展示的候选数据，**不是**用户已确认的收据 |

本函数只整理选项，不产生权限或确认。实际等待、自由回答和重入使用生产 run 内的已持久化根状态。

1. table.len(xs=`options`) < 2 or table.len(xs=`options`) > 3
  *None*

`choice` =

| status | question | options |
|---|---|---|
| waiting_user | `question` | `options` |

Return *`choice`*.

## 路由函数
    + `mode`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| mode | text | 必填 | 已确认的开发方式 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已安装 SKILL 的真实文稿和函数 |

复用现有 routing.resolve，只接收受控开发方式。不存在的能力明确拒绝，不把模型回答视为路径或额外执行权限。

Return *[在真实 Marqdo 文稿中解析下一级](routing.resolve(mode=`mode`))*.

## 拆分并行
    + `context`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | 必填 | 已确认方案和受控工作区 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 有界并发和独立证据聚合 |

子任务来自已确认的方案，运行时计算真实依赖与许可后使用 Marqdo subtask.run_many，不执行模型直接提交的文件路径。失败和未知结果保留，不伪造完成。

Return *[复用原生子任务调度与验收](runtime.parallel(context=`context`))*.

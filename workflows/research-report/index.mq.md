---
markup: occlusion
title: 研究报告复合工作流
description: 真实资料检索、逐份阅读、引用核验和独立撰写
import:
  research: ../../skills/research/index.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

先做真实搜索，然后明确挑选来源、读取并核验，才能撰写引用。并行只用于彼此独立的来源；写作必须等待所需来源就绪。没有实际阅读来源就返回 needs_source_read，不允许编造“已阅读”或虚假引用。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信研究范围 |
| goal | text | 具体报告需求 |

Use `context`, `goal`。

Return *research.run(context=`context`,goal=`goal`)*.

## read
    + `context`
    + `url`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 已批准的外联身份 |
| url | text | 先前实际检索到的公开页面 URL |

Use `context`, `url`。

Return *research.open(context=`context`,url=`url`)*.

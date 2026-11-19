---
markup: occlusion
title: 可重建能力目录
description: 不维护第二套手工工具 Schema，源文稿及官方语义解析是权威。
import:
  io: io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

新 SKILL 只需安装到 skills/<slug>/index.mq.md。原生边界枚举受信任的代码仓库、经 Marqdo 官方 parser 检查导出 run 函数、从文稿的 capability 表获取少量路由元数据，再由受信任的宿主启用配置约束。运行时返回 ID、来源摘要和所需效果；没有主模型可直接生成的绝对文件路径。

## discover
    + `context`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 已认证的用户与项目 |

Use `context`。

Return *io.native(context=`context`,operation="agent_catalog_list",payload=table.empty_map())*.

## resolve
    + `context`
    + `skill`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 已认证的用户与项目 |
| skill | text | 精确能力 ID |

Use `context`, `skill`。

Return *io.native(context=`context`,operation="agent_catalog_resolve",payload=table.put(in=None,at="skill",value=`skill`))*.

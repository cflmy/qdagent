---
markup: occlusion
title: 可重建能力目录
description: 不维护第二套手工工具 Schema，源文稿及官方语义解析是权威。
import:
  io: io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

新 SKILL 只需安装到 skills/<slug>/index.mq.md。原生边界枚举受信任的代码仓库、经 Marqdo 官方 parser 检查导出 run 函数、从同一文稿的 description 和 agent_effects 文件头读取少量路由元数据，再由受信任的宿主启用配置约束。运行时返回 ID、来源摘要和所需效果；没有主模型可直接生成的绝对文件路径。

## discover

| 参数 | 类型 | 说明 |
|---|---|---|



Return *io.native(operation="agent_catalog_list",payload=table.empty_map())*.

## resolve
    + `skill`

| 参数 | 类型 | 说明 |
|---|---|---|
| skill | text | 精确能力 ID |

Use `skill`。

Return *io.native(operation="agent_catalog_resolve",payload=table.put(in=None,at="skill",value=`skill`))*.

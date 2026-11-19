---
markup: occlusion
title: 受控能力调用
description: 执行身份、源码、函数和权限一律在 ABI 内从已安装能力解析。
import:
  io: io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

模型只能提供经过验证的能力 ID。执行器重新读取此 ID 对应的文稿内容和版本，核验可调用 run、所需效果与宿主授权，再由官方 Marqdo CLI 运行。不能直接以模型提供的路径调用 subprocess；超时、未知副作用和失败记录为未完成，绝不自动重放。

## call
    + `context`
    + `skill`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信身份 |
| skill | text | 已验证的能力 ID |
| goal | text | 当前用户目标 |

Use `context`, `skill`, `goal`。

We **payload = table.put(in=None,at="skill",value=`skill`)**.
Return *io.native(context=`context`,operation="agent_skill_call",payload=table.put(in=`payload`,at="goal",value=`goal`))*.

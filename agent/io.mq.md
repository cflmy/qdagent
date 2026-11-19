---
markup: occlusion
title: Agent 宿主边界
description: Marqdo 规则不写入系统语言；此文稿只连接可信 qdagent ABI。
import:
  plugin: lib/plugin.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
---

所有身份、模型账户、文件根和进程资源来自宿主。输出模型内容永远不等于授权。调用失败不自动转换为成功。本文件不持有路由或领域业务策略。

## native

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信上下文 |
| operation | text | 固定 ABI 入口 |
| payload | map | 已验证的操作参数 |

Use `context`, `operation`, `payload`。

We **path = sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so"**.
We **_ = plugin.load(path=`path`)**.
We **request = table.put(in=`payload`,at="operation",value=`operation`)**.
We **request = table.put(in=`request`,at="context",value=`context`)**.
Return *qdagent_transport(request=`request`)*.

## event

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 当前可信任务 |
| kind | text | 实际事件类型 |
| data | map | 有界事件数据 |

Use `context`, `kind`, `data`。

We **args = table.put(in=None,at="kind",value=`kind`)**.
Return *native(context=`context`,operation="runtime_event",payload=table.put(in=`args`,at="data",value=`data`))*.

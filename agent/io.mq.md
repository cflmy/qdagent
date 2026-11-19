---
markup: occlusion
title: Marqdo 宿主资源接口
description: 从可信执行进程隐式获取身份，普通函数不传 context。
import:
  plugin: lib/plugin.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
---

普通 Marqdo 函数只关心业务参数。受信身份、运行编号和资源位置在宿主中保存，不属于模型可见文本，也不是普通函数参数。

## current

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 宿主签发的运行身份，仅给资源调用使用 |

We **path = sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so"**.
We **_ = plugin.load(path=`path`)**.
Return *qdagent_transport(request=table.put(in=None,at="operation",value="runtime_context"))*.

## native
    + `operation`
    + `payload`

| 参数 | 类型 | 说明 |
|---|---|---|
| operation | text | 允许的原生 ABI 操作 |
| payload | map | 该操作的实际参数 |

Use `operation`, `payload`。

We **identity = current()**.
1. not access(`identity`,"ok")
  Return *`identity`*.
We **request = table.put(in=`payload`,at="operation",value=`operation`)**.
We **request = table.put(in=`request`,at="context",value=access(`identity`,"value"))**.
Return *qdagent_transport(request=`request`)*.

## input

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前真实用户输入 |

Return *native(operation="agent_user_input",payload=table.empty_map())*.

## event
    + `kind`
    + `data`

| 参数 | 类型 | 说明 |
|---|---|---|
| kind | text | 事件种类 |
| data | map | 有界事件数据 |

Use `kind`, `data`。

We **args = table.put(in=None,at="kind",value=`kind`)**.
Return *native(operation="runtime_event",payload=table.put(in=`args`,at="data",value=`data`))*.

---
markup: occlusion
type: endpoint
path: /api/chat/stop
method: POST
request: none
response: json
title: 停止当前任务
import:
  gateway: gateway.mq.md
  table: lib/table.mq.md
  request: request.mq.md
---

HTTP 查询只承载普通数据。实际操作由可信工程服务选择会话和执行入口；过期请求、关闭的能力和无效参数保留失败。普通 Markdown 回复不会作为源代码执行。

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| gen | any | 0 | 请求代数 |
| session | text | "default" | 独立任务身份 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实会话协议与可读投影 |

Use `gen`=0, `session`="default" and `principal`="local"。输入默认值服务于首次打开，任务请求明确携带会话与代数。回应包含所选会话，前端必须先验证身份再更新阅读面；一个任务的迟到结果不能写入另一个任务。

We **args = [单个参数也明确是记录](table.put(in=None, at="gen", value=`gen`))**.

`dispatch` =

| session | member | arguments |
|---|---|---|
| `session` | "stop" | `args` |

Return *[执行真实会话控制](gateway.invoke(member="dispatch", arguments=`dispatch`, principal=`principal`))*.

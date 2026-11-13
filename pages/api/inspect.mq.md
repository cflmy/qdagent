---
markup: occlusion
type: endpoint
path: /api/inspect
method: GET
request: query
response: json
title: 已认证的文件检查
import:
  gateway: gateway.mq.md
  table: lib/table.mq.md
---
检查区只阅读当前会话文件，Marqdo 文件交给原生只读 View，模型输出不会变成应用程序。
# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 当前任务 |
| epoch | any | 0 | 视图序号 |
| request_id | any | 0 | 文件请求序号 |
| action | text | "files" | 阅读动作 |
| path | text | "" | 相对路径 |
| artifact | text | "" | 产物身份 |
| principal | text | "local" | 宿主认证主体 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 已检查所有权的只读结果 |

Use `session`="default", `epoch`=0, `request_id`=0, `action`="files", `path`="", `artifact`="" and `principal`="local"。身份由宿主覆盖，路径只在该任务根解析。此入口不调用模型、不执行文件、不变更插件开关。两个序号保证会话和文件切换后的迟到结果不会混入当前阅读。服务函数固定，不能通过参数选择可执行文件或扩大文件根。

`args` =

| session | epoch | request_id | action | path | artifact |
|---|---|---|---|---|---|
| `session` | `epoch` | `request_id` | `action` | `path` | `artifact` |

Return *[固定阅读服务](gateway.invoke(member="inspect",arguments=`args`,principal=`principal`))*.

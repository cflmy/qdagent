---
markup: occlusion
title: 上传到认证后的当前工作区
type: endpoint
path: /api/upload
method: POST
request: json
response: json
import:
  gateway: gateway.mq.md
---

文件数据交给可信工程服务，身份由原生认证宿主覆盖注入。端点不接受服务器路径，不执行上传内容。

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| action | text | "single" | 分块阶段 |
| total | any | 0 | 文件总大小 |
| upload_id | text | "" | 真实上传身份 |
| offset | any | 0 | 当前偏移 |
| name | text | "" | 显示名 |
| data_url | text | "" | Base64 文件 |
| session | text | "default" | 会话 |
| epoch | any | 0 | 切换序号 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实上传 Result |

Use `action`="single", `total`=0, `upload_id`="", `offset`=0 and `name`="", `data_url`="", `session`="default", `epoch`=0 and `principal`="local"。只有经过登录且同源的 POST 能进入这个端点。原生请求限制和应用字节上限同时生效；服务核验会话归属后才接触工作目录。读取按钮、显示进度和保存文件分别是不同阶段，不以选择文件冒充保存完成。

JSON contains ordinary data. The gateway supplies the trusted project and verified principal; the browser cannot switch either through a body field. The underlying call returns the actual filesystem result with the same session and view epoch, allowing stale UI responses to be ignored without undoing an already completed upload.

`args` =

| name | data_url | session | epoch | action | total | upload_id | offset |
|---|---|---|---|---|---|---|---|
| `name` | `data_url` | `session` | `epoch` | `action` | `total` | `upload_id` | `offset` |

Return *[复用工程服务和 Marqdo 文件能力](gateway.invoke(member="upload", arguments=`args`, principal=`principal`))*.

---
markup: occlusion
title: 当前用户的模型配置
type: endpoint
path: /api/models
method: POST
request: json
response: json
import:
  gateway: gateway.mq.md
  table: lib/table.mq.md
---

只有认证后的同源 POST 处理模型配置，API Key 只在请求体内传递。操作身份由原生宿主覆盖注入，不能靠 JSON 字段指定另一个用户。

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| action | text | "save" | save 或 remove |
| id | text | "" | 删除身份 |
| label | text | "" | 显示名 |
| model | text | "" | 模型名 |
| endpoint | text | "" | 公开 HTTPS 根 |
| protocol | text | "openai" | 协议 |
| api_key | text | "" | 仅保存用凭据 |
| thinking | any | False | 思考开关 |
| epoch | any | 0 | 切换序号 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 无凭据的模型配置响应 |

Use `action`="save", `id`="", `label`="", `model`="", `endpoint`="", `protocol`="openai", `api_key`="", `thinking`=False, `epoch`=0 and `principal`="local"。保存和删除进入固定服务函数，不能提交任意调用名。响应只包含公开身份与列表，不回显参数。配置表单的数据不是智能体执行指令，也不授予工具权限。

Credentials travel in the authenticated JSON body, never the URL. The backend validates provider settings and encrypts the key before persistence. Errors remain errors and do not switch a task to a fallback provider. The view epoch belongs only to response filtering and cannot select a filesystem root or account.

1. `action` == "remove"
  We **args = table.put(in=None, at="id", value=`id`)**.
  We **args = table.put(in=`args`, at="epoch", value=`epoch`)**.
  Return *[只删除自己的配置](gateway.invoke(member="remove_model", arguments=`args`, principal=`principal`))*.

`args` =

| label | model | endpoint | protocol | api_key | thinking | epoch |
|---|---|---|---|---|---|---|
| `label` | `model` | `endpoint` | `protocol` | `api_key` | `thinking` | `epoch` |

Return *[凭据仅进入加密保存器](gateway.invoke(member="save_model", arguments=`args`, principal=`principal`))*.

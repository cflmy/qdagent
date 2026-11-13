---
markup: occlusion
title: 独立模型目录
type: endpoint
path: /api/model_catalog
method: GET
request: query
response: json
import:
  gateway: gateway.mq.md
  table: lib/table.mq.md
---

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| epoch | any | 0 | 视图序号 |
| principal | text | "local" | 认证宿主注入的账号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 去除凭据的模型选择目录 |

Use `epoch`=0 and `principal`="local"。请求只读取当前账号可选配置。身份由宿主覆盖，客户端不能指定其他账号；目录与会话恢复独立，历史锁或档案渲染不会阻止用户打开模型选择。配置操作继续经过现有同源 POST，目录读取不会保存、删除或测试模型，也不会触发工具执行。未认证请求仍由统一身份中间件处理；错误保留为错误，不能替换成无模型的成功结果。返回的默认项仅是配置身份，不是已经成功推理的证据。

We **args = table.put(in=None,at="epoch",value=`epoch`)**.
Return *[读取当前账号的公开模型](gateway.invoke(member="model_catalog",arguments=`args`,principal=`principal`))*.

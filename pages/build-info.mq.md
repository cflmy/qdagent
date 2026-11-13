---
markup: occlusion
type: endpoint
path: /build-info
method: GET
request: query
response: json
title: 公开部署指纹
import:
  fs: lib/fs.mq.md
  table: lib/table.mq.md
---
部署指纹帮助核对代理域名与实际实例，仅返回客户端源码摘要和固定修订标识，不输出源码、配置、身份、数据库或凭据。

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| probe | text | "" | 原样回显的诊断请求身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前实例客户端摘要及修订 |

Use `probe`=""。诊断请求只读取固定的公开客户端源码摘要，调用者不能选择文件路径。回显是 JSON 数据，不作为 HTML、SQL 或程序执行。通过同一个 probe 比对本机与域名响应，可以确认代理有没有指向另一个实例。此接口不验证登录，也不暴露任何账号或模型密钥；健康探针仍使用既有 healthz。

We **out = table.put(in=None,at="revision",value="qdagent-20261113-reference-layout-v3")**.
We **out = table.put(in=`out`,at="client_sha256",value=fs.file_hash(path="public/client.mq.md"))**.
Return *[返回不含用户数据的实际部署指纹](table.put(in=`out`,at="probe",value=`probe`))*.

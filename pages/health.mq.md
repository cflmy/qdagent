---
markup: occlusion
type: endpoint
path: /healthz
method: GET
request: none
response: json
title: 只读健康端点
import:
  table: lib/table.mq.md
---

此路由只暴露服务是否在线，不能读取会话、插件偏好或工作文件。认证入口与 API 另有服务端保护。

# main

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 固定服务标识与实际在线响应 |

路由能够执行说明 HTTP 宿主已完成准备。它不检查用户登录、不建立模型请求，也不返回数据库位置或身份配置。容器健康探针只访问本机这一条公开路由，重启和重建不会因此制造任务或修改用户历史。

Return *[当前服务实际在线](table.put(in=table.put(in=None, at="ok", value=True), at="service", value="qdagent"))*.

---
markup: occlusion
type: endpoint
path: /api/artifact_preview
method: GET
request: query
response: html
title: 受认证的文件交付
import:
  gateway: gateway.mq.md
  table: lib/table.mq.md
---
文件交付复用会话所有权与实际 Marqdo 函数。这里没有公共文件路径、独立用户数据库或模型代码执行。
# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 真实任务 |
| id | text | "" | 产物身份 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 所有权检查后的真实材料 |

Use `session`="default", `id`="" and `principal`="local"。所有字段都是数据；身份由原生认证覆盖。入口固定选择服务函数，不接受路径、源码或效果权限。实际文件由已有工作根约束读取，界面只展示并下载真实内容，失败保留明确诊断。

The API exposes an artifact identity rather than a local path. Authentication remains in the existing host boundary and ownership remains in the Marqdo service. A user document cannot turn this endpoint into a source loader or an arbitrary file server. The source preview is safe display content, while binary transport uses the registered byte response adapter.

We **args = table.put(in=None,at="session",value=`session`)**.
We **args = table.put(in=`args`,at="id",value=`id`)**.
Return *[经过可信会话服务](gateway.invoke(member="artifact_preview",arguments=`args`,principal=`principal`))*.

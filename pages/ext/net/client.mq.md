---
markup: occlusion
title: 网络插件的只读 HTTP 客户端
import:
  net: lib/net.mq.md
  re: lib/re.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

本地拓展新增客户端入口，复用原生网络能力。标准库本身不可关闭；智能体是否获得网络
工具，由应用注册表控制。返回数据不插入对话 DOM，也不把远端正文当作新的执行指令。

## get

| 参数 | 类型 | 说明 |
|---|---|---|
| url | text | 明确的 HTTP 或 HTTPS 地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，包含真实状态、地址与有界正文 |

Use `url`。一万二千字符的观察上限避免挤满模型上下文。状态和正文来自真正请求，
不是模拟页面；没有 Shell、Python 或浏览器脚本。HTTP 失败仍保留实际状态，调用者自行
判断它是否满足任务。启用此工具不意味着远端材料具有指挥智能体的权限。

The response is data for inspection. HTML received from a remote server is never mounted as active assistant UI, and a non-success HTTP status remains visible in the returned record.

1. not re.is_match(text=`url`, pattern="^https?://")
  Return *[需要明确网络地址](result.error(code="net.url", message="需要 HTTP 或 HTTPS 地址", operation="get"))*.
We **response = [真实只读请求](net.http_get(url=`url`))**.
We **response = [限制正文观察](json.set(map=`response`, key="body", value=re.find(text=json.get(value=`response`, key="body"), pattern="(?s)^.{0,12000}")))**.
Return *[保留实际响应](result.ok(value=`response`))*.

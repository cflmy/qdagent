---
markup: occlusion
title: 容器只读健康检查
import:
  net: lib/net.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

只检查当前容器的统一端口，不绕过登录读取用户数据。失败立即退出，Docker 根据真实进程状态标记健康。

## check

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实健康检查结果 |

只有本机 healthz 返回成功才退出零。它不请求身份提供商、不创建会话、不把用户数据纳入健康响应。检查使用现有网络能力，不依赖 Shell、curl 或 Python 脚本。The health probe reports readiness of the running HTTP host, not a fabricated login or completed model task.

We **response = [检查当前容器](net.http_get(url="http://127.0.0.1:7964/healthz"))**.
1. access(`response`,"status") != 200
  We **_ = [失败退出](sys.exit(code=1))**.
We **body = json.parse(text=access(`response`,"body"))**.
1. not access(`body`,"ok")
  We **_ = sys.exit(code=1)**.
Return *True*.

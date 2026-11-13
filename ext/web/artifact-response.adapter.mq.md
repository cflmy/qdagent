---
markup: occlusion
title: Web ABI 升级：原生字节附件响应
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
  security: ../security/qdagent-adapter.mq.md
---

业务与宿主边界分开：Marqdo 负责决定读哪份文件，ABI 只负责把标准字节记录变成 HTTP 附件。后续上游提供同类响应时可以删除这个本地适配，不改变任务与产物接口。

## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 已测试并安装的 Web 原生产物 |

现有端点只能输出 JSON、文本、HTML 或事件流，无法把 Marqdo 原生 bytes 记录交付为办公附件。这是已经确认的宿主传输缺口。这个适配器只增加 response: bytes 的响应边界；用户归属、文件选择、摘要校验和读取仍由 .mq.md 完成，不向 Go 中搬迁业务流程。

The adapter is a local extension update, never an edit to the neighboring Marqdo source. It first applies the existing security package to the copied Web source, copies a generic bytes writer and tests, then applies one exact dispatch case. The writer accepts a bounded native bytes record, validates base64, MIME type and attachment filename, and sends a private no-store response with nosniff and sandbox headers. It does not read a file or trust a client-provided path.

Existing authentication and same-origin checks run before the Marqdo endpoint. Failed business results do not become successful binary responses. The maximum response is one MiB for this initial text-office delivery capability; general request limits remain unchanged. Larger streaming output should be a separately reviewed host operation rather than a global body-limit increase.

Installation runs the existing security regression and build before replacing either runtime library. Source helpers remain versioned in this package, so a clean local plugin rebuild reproduces the response capability. The application image packages that tested artifact and does not compile at production startup.

We **prepared = [保留已有认证边界](security.patch())**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **_ = [复制仅负责响应的 ABI 辅助](fs.copy_file(src="ext/web/native/qdagent_bytes.go",dest=".marqdo/web-native/internal/httpx/qdagent_bytes.go"))**.
We **_ = [复制真实响应回归](fs.copy_file(src="ext/web/native/qdagent_bytes_test.go",dest=".marqdo/web-native/internal/httpx/qdagent_bytes_test.go"))**.
We **path = ".marqdo/web-native/internal/httpx/routes_artifact.go"**.
We **source = fs.read_text(path=`path`)**.
1. not text.contains(text=`source`,sub="writeQdagentBytes(w,value)")
  We **_ = [唯一锚点新增响应分派](fs.text_patch(path=`path`,find="switch route.Response {\n\tcase \"text\":",replace="switch route.Response {\n\tcase \"bytes\":\n\t\twriteQdagentBytes(w,value)\n\tcase \"text\":"))**.
Return *[安全回归通过后安装插件](security.install())*.

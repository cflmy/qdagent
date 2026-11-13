---
markup: occlusion
title: 独立站点的真实 HTTP 协议回归
import:
  net: lib/net.mq.md
  json: lib/json.mq.md
  url: lib/url.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
  capabilities: capabilities.mq.md
---

先通过开发手册 prepare_http 和 serve_test 启动隔离站点，再调用 run。测试实际访问端点，不模拟后端；它不接触正式端口，不把 HTTP 协议成功宣称为完整浏览器导航成功。

## request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| base | text | required | 隔离站点地址 |
| route | text | required | 固定端点 |
| arguments | map | required | 命名查询参数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | HTTP 与 JSON 两层都实际成功的正文 |

Use `base`, `route` and `arguments`。查询值经标准 URL 库编码，中文、Markdown 和换行只是数据。HTTP 200 并不代表应用成功，测试调用方仍需检查正文 ok 与身份。无效 JSON 保留真实错误，不把响应文字拼成页面或预期结果。

Each request goes to the running Web host and invokes its real endpoint source. This helper does not import the service directly, so a query-conversion or gateway mistake remains observable. The response body is parsed independently from its status code; an application-level denial is a valid protocol response for a negative assertion.


We **address = `base` + `route` + "?" + url.query_stringify(map=`arguments`)**.
1. `route` == "/api/chat" or `route` == "/api/chat/stop" or `route` == "/api/sessions" or `route` == "/api/plugins"
  We **response = [真实 POST 变更](net.http_post(url=`address`, body="{}"))**.
2. *
  We **response = [真实 GET 阅读](net.http_get(url=`address`))**.
1. access(`response`, "status") != 200
  Return *[保留真实 HTTP 失败](result.error(code="test.http", message=json.stringify(value=`response`), operation="get"))*.
Return *[解释实际 JSON 正文](json.parse(text=access(`response`, "body")))*.


## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| base | text | "http://127.0.0.1:17432" | 已启动的隔离服务 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 创建、恢复、开始、拉取与拒绝边界的真实结果 |

Use `base`="http://127.0.0.1:17432"。测试只创建自己的新任务，不重置已有档案。模型设为 none，协议回归不依赖模型速度或质量；真实模型写入与取消另有手动可观察任务。每个响应都核对当前会话，单参数 pull 与 stop 也必须传记录，不能误把一列表当成命名参数。

The first request creates a new task through the actual session endpoint. Beginning its turn must return a readable Markdown fragment with the server-selected session id and the supplied generation. A subsequent pull uses the HTTP query representation of that number and must recover the same completed snapshot. This is the integration boundary where a one-column data table can accidentally become a list, so a direct service unit test alone is insufficient.

The user question contains ordinary Markdown emphasis and a numbered list. Inspect the returned HTML for the corresponding rendered elements. No Marqdo compiler is allowed to interpret this conversation as branch syntax, and the test does not replace the result with a plain source preview. It verifies the production Markdown renderer reached through the real gateway.

A stale stop must return qdagent.stale_generation without rewriting the completed turn. A standard-library toggle must return qdagent.builtin_required, proving enforcement exists beyond a disabled UI control. Finally create another independent task and confirm its generation is zero rather than inherited from the first. The returned evidence comes from these actual responses; no browser fixture or success string substitutes for them.

This suite deliberately avoids toggling optional plugins on an arbitrary running server. Use the isolated capabilities suite for persisted switch mutations, and serve_test for the endpoint environment. HTTP routing, real model actions and WASM event persistence are separate proofs. A failure stops immediately, preserving the actual protocol diagnostic instead of continuing until a later success hides it.


We **args = table.put(in=None, at="title", value="HTTP 协议验收")**.
We **created = [真实创建会话](request(base=`base`, route="/api/sessions", arguments=`args`))**.
We **_ = [创建必须成功](capabilities.assert(condition=access(`created`, "ok"), message="HTTP session create failed"))**.
We **session = access(`created`, "session")**.

`start` =

| session | q | model | client_gen |
|---|---|---|---|
| `session` | "**普通 Markdown**\n\n1. 真实问题" | "none" | 41 |

We **began = [真实 begin](request(base=`base`, route="/api/chat", arguments=`start`))**.
We **_ = [Markdown 不进入程序解析](capabilities.assert(condition=access(`began`, "ok") and text.contains(text=access(`began`, "page_html"), sub="<strong>普通 Markdown</strong>") and text.contains(text=access(`began`, "page_html"), sub="<ol>"), message="Markdown or begin failed"))**.

`query` =

| session | gen |
|---|---|
| `session` | 41 |

We **pulled = [真实 pull](request(base=`base`, route="/api/chat/pull", arguments=`query`))**.
We **_ = [HTTP 代数与会话一致](capabilities.assert(condition=access(`pulled`, "ok") and access(`pulled`, "gen") == 41 and access(`pulled`, "session") == `session`, message="HTTP pull identity failed"))**.
We **query = table.put(in=`query`, at="gen", value=40)**.
We **stale = [旧代数不能停止](request(base=`base`, route="/api/chat/stop", arguments=`query`))**.
We **_ = [检查实际拒绝原因](capabilities.assert(condition=not access(`stale`, "ok") and json.get(value=access(`stale`, "error"), key="code") == "qdagent.stale_generation", message="stale stop failed"))**.
We **args = table.put(in=`query`, at="id", value="stdlib")**.
We **builtin = [固有能力服务端拒绝关闭](request(base=`base`, route="/api/plugins", arguments=`args`))**.
We **_ = [真实禁止停用](capabilities.assert(condition=not access(`builtin`, "ok"), message="builtin HTTP toggle accepted"))**.
We **other = [创建第二个独立会话](request(base=`base`, route="/api/sessions", arguments=table.put(in=None, at="title", value="HTTP 独立任务")))**.
We **_ = [新任务没有旧代数](capabilities.assert(condition=access(`other`, "ok") and access(`other`, "gen") == 0 and access(`other`, "session") != `session`, message="HTTP session isolation failed"))**.
Return *[真实端点回归通过](result.ok(value="HTTP create / Markdown / begin / pull / stale stop / builtin guard / independent session"))*.


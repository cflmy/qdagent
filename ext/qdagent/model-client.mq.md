---
markup: occlusion
title: 模型协议与真实思考文本
import:
  net: lib/net.mq.md
  plugin: lib/plugin.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
---

动作协议继续是 JSON，用户答案继续是普通 Markdown。模型接口返回的 thinking 或 reasoning_content 是显示材料，不是执行权限；没有返回时不造出一份思考过程。凭据不进入提示词、作业和执行事件。

## decode

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| body | text | required | 成功接口的 JSON 正文 |
| protocol | text | required | ollama 或 openai |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，value 为实际动作，thinking 为接口原文 |

Use `body` and `protocol`。Ollama 从 message.content 和 message.thinking 读取，OpenAI 兼容接口从第一条 choice 的 message.content 与 reasoning_content 或 reasoning 读取。也接受明确包在正文最前方的 think 标签和 JSON 围栏，但不从任意解释文字中猜测动作。

Only a successfully parsed decision envelope reaches the runner. The decoder does not execute a tool, infer a successful file write or manufacture a thought when a provider returns none. A thinking block is kept separate from the final answer and rendered by the same safe Markdown component. The final message may contain normal Markdown after the runner validates its envelope.

Different providers expose reasoning differently. OpenAI-compatible services keep their own model defaults; no undocumented vendor-specific reasoning switch is sent to every service. The Ollama profile switch maps to its actual think option. Returned reasoning is displayed whenever it exists, independently of whether that provider supports a switch.

The normalized result preserves two independent fields: value is the machine decision, and thinking is the provider's optional display text. The runner stores the full decision rather than only the word final, so expanding a model step can show what it actually returned. A missing reasoning field is an empty string, never a fabricated placeholder.

We **parsed = json.try_parse(text=`body`)**.
1. not access(`parsed`,"ok")
  Return *[接口不是 JSON](result.error(code="qdagent.model_response", message="模型接口未返回有效 JSON", operation="decode"))*.
We **data = access(`parsed`,"value")**.
We **message = json.get(value=`data`, key="message")**.
1. `protocol` == "openai"
  We **choices = json.get(value=`data`, key="choices")**.
  1. not `choices`
    Return *[没有可读消息](result.error(code="qdagent.model_response", message="模型接口没有返回 choice", operation="decode"))*.
  We **message = json.get(value=access(`choices`,1), key="message")**.
We **content = json.get(value=`message`, key="content")**.
We **thinking = json.get(value=`message`, key="thinking")**.
1. not `thinking`
  We **thinking = json.get(value=`message`, key="reasoning_content")**.
1. not `thinking`
  We **thinking = json.get(value=`message`, key="reasoning")**.
1. not `thinking`
  We **thinking = ""**.
1. not `content`
  Return *[实际空答不能当作成功](result.error(code="qdagent.model_empty", message="模型未返回动作正文", operation="decode"))*.
We **block = re.find(text=`content`, pattern="(?s)^\\s*<think>.*?</think>")**.
1. `block`
  1. `thinking` == ""
    We **thinking = re.replace(text=`block`, pattern="(?s)^\\s*<think>|</think>$", with="")**.
  We **content = re.replace(text=`content`, pattern="(?s)^\\s*<think>.*?</think>", with="")**.
We **content = re.replace(text=text.str_trim(s=`content`), pattern="^\x60{3}(json)?\\s*|\\s*\x60{3}$", with="")**.
We **decision = json.try_parse(text=`content`)**.
1. not access(`decision`,"ok")
  Return *[不能猜测调用](result.error(code="qdagent.model_format", message="模型没有返回有效动作 JSON", operation="decode"))*.
We **out = result.ok(value=access(`decision`,"value"))**.
Return *[保留真实接口思考字段](table.put(in=`out`, at="thinking", value=`thinking`))*.

## decide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| config | map | required | 可信服务读取的私有模型配置 |
| messages | list | required | 实际任务消息 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际接口动作和思考；不返回凭据 |

Use `config` and `messages`。内置 Ollama 保持已有环境根地址，用户自定义接口一律经注册 Web ABI 的公开 HTTPS 请求能力。网络宿主检查 DNS 并连接已验证的公网地址，禁止私网、保留地址、代理和跳转，正常验证 TLS 证书。密钥仅用于 Authorization 请求头，不加入模型内容。

The provider response must be HTTP 200 and valid JSON. Errors expose a status or protocol explanation, not a credential-bearing request or arbitrary provider error body. The native request is bounded and cancellation still terminates the containing Marqdo workflow. Every actual tool operation remains a later registered call; receiving a model answer alone does not execute it.

Ollama uses the installed decision schema and explicit think option. OpenAI-compatible endpoints receive json_object response_format and the same ordinary messages. A root ending in the final chat path is accepted; otherwise the documented protocol path is appended. No shell command, Python client or alternative agent loop is introduced.

The credential is supplied only by the owner-checked server configuration, and the request URL is validated again by the native HTTPS boundary immediately before dialing. A configured URL that resolves to a private address cannot become a local service probe. HTTP redirects are reported as an error status instead of following to another origin. This request path is distinct from the administrator-owned built-in Ollama environment address.

The returned thinking field never contains a request header or a private configuration record.

We **protocol = access(`config`,"protocol")** and **endpoint = access(`config`,"endpoint")**.
We **payload = table.put(in=None, at="model", value=access(`config`,"model"))**.
We **payload = table.put(in=`payload`, at="messages", value=`messages`)**.
We **payload = table.put(in=`payload`, at="stream", value=False)**.
1. `protocol` == "ollama"
  We **schema = json.parse(text="{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"enum\":[\"tool\",\"final\"]},\"tool\":{\"type\":\"string\"},\"arguments\":{\"type\":\"object\"},\"message\":{\"type\":\"string\"}},\"required\":[\"type\",\"tool\",\"arguments\",\"message\"],\"additionalProperties\":false}")**.
  We **payload = table.put(in=`payload`, at="format", value=`schema`)**.
  We **payload = table.put(in=`payload`, at="think", value=(access(`config`,"thinking") == 1))**.
  1. not text.ends_with(text=`endpoint`, suffix="/api/chat")
    We **endpoint = `endpoint` + "/api/chat"**.
2. *
  We **payload = table.put(in=`payload`, at="response_format", value=table.put(in=None, at="type", value="json_object"))**.
  1. not text.ends_with(text=`endpoint`, suffix="/chat/completions")
    We **endpoint = `endpoint` + "/chat/completions"**.
We **body = json.stringify(value=`payload`)**.
1. json.get(value=`config`, key="builtin")
  We **response = net.http_post(url=`endpoint`, body=`body`)**.
2. *
  We **_ = plugin.load(path="ext/native/libweb.so")**.
  We **response = [注册 ABI 保护公网请求](qdagent_model_http(url=`endpoint`, body=`body`, api_key=access(`config`,"api_key")))**.
1. json.get(value=`response`, key="status") != 200
  Return *[错误正文不回显凭据](result.error(code="qdagent.model_http", message=("模型接口 HTTP " + str(json.get(value=`response`, key="status"))), operation="decide"))*.
Return *[协议正文独立解释](decode(body=access(`response`,"body"), protocol=`protocol`))*.

---
markup: occlusion
title: ext/qdagent/ollama_chat
description: >-
  本仓自研拓展：Ollama 原生 /api/chat（含关思考与 NDJSON 流式落盘）。补齐 ext/ai
  openai 兼容通路对推理模型与原生流式的缺口；提示词由调用方（求道助手 / agent）装配。
import:
  transport: ./transport.mq.md
  net: lib/net.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  result: lib/result.mq.md
---

ext/ai 的 openai-compatible 通路把对话收敛到 /v1/chat/completions，契约里没有 think 透传，
且 SSE 字段与本机 qwen3.5 的 reasoning 增量不一致。Ollama 原生 /api/chat 支持 think=false
与 NDJSON 流式行。

缺陷（必须用外工具）：Marqdo host 现有 `http_post_sse` 只消费 OpenAI SSE，不能按行读取
Ollama 原生 NDJSON，也无法在流式过程中把增量写入文件供 pull 轮询。因此 `stream_begin`
通过注册的 ABI v2 插件管理有界 curl NDJSON 进程，禁止拼接 Shell；请求体与累计解析仍是 Marqdo（json / try_parse / fs）。
整包 `chat` 走 lib/net，不经过 curl。

对话工程路径固定为 data/dialogue/proj/ 下的约定文件名，避免默认参数未注入作用域。


## chat

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| model | text | required | Ollama 模型标识，如 qwen3.5:4b-q4_K_M |
| prompt | text | required | 已装配好的提示词原文 |
| think | bool | False | 是否保留推理思考；推理模型建议关闭 |
| host | text | "http://127.0.0.1:11434" | Ollama 服务地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | text、finish、status |

整包模式只有一次 HTTP 请求，适合调用者明确接受等待完整响应的场景。它不是流式失败后的隐藏补救，也不负责作业文件、取消或浏览器轮询。模型是否存在、Ollama 是否可达以及返回的 HTTP 状态都来自实际服务。

| 请求或响应字段 | 处理方式 | 调用者应如何解释 |
|---|---|---|
| model | 原样传入 Ollama | 必须是已经安装的真实模型标识 |
| messages | 单条 user 消息，内容为已组装提示词 | 本函数不替调用者建立记忆或检索上下文 |
| think | 显式布尔开关 | 关闭思考不等于保证模型一定返回正文 |
| stream | 固定为 False | 返回值不是增量事件列表 |
| message.content | 返回 text | 这是模型正文，不是可直接执行的命令 |
| done_reason | 返回 finish | 保留模型结束原因供上层解释 |
| HTTP status | 返回 status | 收到响应不必然代表模型成功 |

提示词以 JSON 值编码，不拼进 Shell。返回正文仍应交给同一套 Marqdo 阅读与授权规则处理，不能因为它来自整包请求就获得自动执行权限。

Use `model`、`prompt`、`think`=False、`host`。整包 /api/chat，供非流式回退。
Effects: network.write.

1. not `host`
  We **host = [默认本机]("http://127.0.0.1:11434")**.
1. `think`
  We **think = True**.
2. *
  We **think = False**.
We **msg = [用户消息记录](table.put(in=None, at="role", value="user"))** and **msg = [附上消息正文](table.put(in=`msg`, at="content", value=`prompt`))**.
We **msgs = [消息列表](table.append(list=table.empty_list(), item=`msg`))**.
We **payload = [请求体](table.put(in=None, at="model", value=`model`))** and **payload = [写入思考开关](table.put(in=`payload`, at="think", value=`think`))** and **payload = [关闭流式](table.put(in=`payload`, at="stream", value=False))** and **payload = [附上消息列表](table.put(in=`payload`, at="messages", value=`msgs`))**.
We **resp = [发起对话请求](net.http_post(url=`host` + "/api/chat", body=json.stringify(value=`payload`)))**.
We **raw = [取响应体文本](json.get(value=`resp`, key="body"))** and **status = [取HTTP状态](json.get(value=`resp`, key="status"))**.
We **data = [解析响应体](json.parse(text=`raw`))**.
We **answer = [取消息记录](json.get(value=`data`, key="message"))** and **text = [取回答正文](json.get(value=`answer`, key="content"))** and **finish = [取结束原因](json.get(value=`data`, key="done_reason"))**.

`result` =

| text | finish | status |
|---|---|---|
| `text` | `finish` | `status` |

Return *result*.

## stream_begin

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| model | text | required | Ollama 模型标识 |
| prompt | text | required | 已由智能体装配的提示词 |
| host | text | required | Ollama 服务地址，如 http://127.0.0.1:11434 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，value 含 worker_pid、started 与 token |

流式启动把提示词与模型选择写成 JSON 请求体，再通过已经注册的 ABI v2 调用启动专用 worker。原生边界只管理 curl 的独立参数与生命周期，不能在插件里组织业务提示词或渲染答案。

| 运行文件或标识 | 作用 | 所属责任 |
|---|---|---|
| _stream_payload.json | 完整 Ollama 原生请求体 | Marqdo 编码与写入 |
| _stream_raw.ndjson | curl 接收的原始分块文本 | 专用传输 worker 写入 |
| transport.id | 当前生命周期令牌 | 插件核对旧 worker 是否仍有发布权 |
| transport.pid | 实际 curl 的 PID | 取消时同时检查进程名与固定输出路径 |
| transport.result.json | 真实退出成功与错误信息 | pull 据此区分传输失败与空回答 |
| done.flag | 当前传输已经结束 | 只说明传输状态，不代表一定有正文 |

启动成功返回 Result，其 value 带 worker_pid、started 和 token。上层必须先检查 ok 再保存 started=True；worker 之后仍可能因连接或模型错误退出。此函数不阻塞等待答案，也不把创建了进程当作模型完成。

Use `model`、`prompt`、`host`。写原生 /api/chat 请求体（think=false、stream=true），
后台 curl -N 把 NDJSON 写到约定 raw 文件；结束后写 done.flag。Effects: fs.write, process.exec.

We **payload_path = [请求体路径]("data/dialogue/proj/_stream_payload.json")**.
We **raw_path = [NDJSON 路径]("data/dialogue/proj/_stream_raw.ndjson")**.
We **done_path = [完成标记路径]("data/dialogue/proj/done.flag")**.
We **pid_path = [pid 路径]("data/dialogue/proj/stream.pid")**.
We **msg = [用户消息记录](table.put(in=None, at="role", value="user"))** and **msg = [附上消息正文](table.put(in=`msg`, at="content", value=`prompt`))**.
We **msgs = [消息列表](table.append(list=table.empty_list(), item=`msg`))**.
We **payload = [请求体](table.put(in=None, at="model", value=`model`))** and **payload = [关闭思考](table.put(in=`payload`, at="think", value=False))** and **payload = [打开流式](table.put(in=`payload`, at="stream", value=True))** and **payload = [附上消息列表](table.put(in=`payload`, at="messages", value=`msgs`))**.
We **_ = [写下请求体](fs.write_text(path=`payload_path`, text=json.stringify(value=`payload`)))**.
We **_ = [清空旧 NDJSON](fs.write_text(path=`raw_path`, text=""))**.
We **started = [通过注册插件拉起受控传输](transport.request(operation="begin", url=`host` + "/api/chat"))**.
1. not access(`started`, "ok")
  Return *started*.
Return *started*.

## accumulate

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 已到达的回答正文（可能仍在增长） |

按行 try_parse 约定 NDJSON 文件，拼 message.content；残缺末行跳过；写回 stream.txt。
Effects: fs.read, fs.write.

Ollama 把每次增量放在独立 JSON 行的 message.content 中。这里从固定 raw 文件读取并重建累计正文，而不是把每拍看到的整文件重复追加；因此同一文件被多次轮询不会把旧内容再次拼接进去。

| 输入形态 | 累计行为 | 对外含义 |
|---|---|---|
| raw 文件尚不存在 | 写回空累计正文 | 还没有可读的传输内容 |
| 文件为空 | 写回空累计正文 | 可以仍在连接，不等于失败 |
| 空白行 | 跳过 | 不制造额外回答字符 |
| 可解析的完整 JSON 行 | 读取 message.content 并连接 | 只使用真实正文增量 |
| 尚不完整的末行 | try_parse 失败后暂时跳过 | 下一拍文件补全后会重新读取 |
| 没有 message.content 的控制行 | 不追加正文 | 完成或控制信息不伪装成回答 |

累计函数不决定 done。完成标记和真实退出结果由传输层保存，pull 同时检查这些证据与累计正文。解析跳过策略适合增量文件，但不构成完整 NDJSON 校验器；若整个成功传输都没有可展示正文，上层会明确报空输出，而不是假造一个答案。

We **raw_path = [NDJSON 路径]("data/dialogue/proj/_stream_raw.ndjson")**.
We **out_path = [正文书路径]("data/dialogue/proj/stream.txt")**.
1. not [NDJSON 已存在](fs.exists(path=`raw_path`))
  We **_ = [空正文](fs.write_text(path=`out_path`, text=""))**.
  Return *""*.
We **raw = [读 NDJSON](fs.read_text(path=`raw_path`))**.
1. not `raw`
  We **_ = [空正文](fs.write_text(path=`out_path`, text=""))**.
  Return *""*.
We **lines = [按行切开](text.str_split(s=`raw`, sep="\n"))** and **acc = [累计从空]("")**.
- [逐行吸收增量](for lines as line)
  We **line = [去行空白](text.str_trim(s=`line`))**.
  1. not `line`
    **_ = 1**
  2. *
    We **tried = [可恢复解析](json.try_parse(text=`line`))**.
    1. access(`tried`, "ok")
      We **obj = [取对象](json.get(value=`tried`, key="value"))** and **msg = [取消息](json.get(value=`obj`, key="message"))** and **piece = [取增量](json.get(value=`msg`, key="content"))**.
      1. `piece`
        We **acc = [接上增量](`acc` + `piece`)**.
We **_ = [写回累计正文](fs.write_text(path=`out_path`, text=`acc`))**.
Return *acc*.

## stream_stop

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，成功表示本工程的受控传输已收到取消 |

先使旧传输令牌失效，再检查 curl 的 PID 与固定输出路径，发送终止信号并写入完成标记。
错误保留 Result，不宣称取消成功。Effects: plugin, fs, process.exec.

We **stopped = [停止此工程当前传输](transport.request(operation="stop", url=""))**.
1. not access(`stopped`, "ok")
  Return *stopped*.
Return *stopped*.

## decide

| 参数 | 类型 | 说明 |
|---|---|---|
| model | text | 实际 Ollama 模型身份 |
| messages | list | 任务、已用工具与观察上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，内部动作协议；最终 message 是普通 Markdown |

Use `model` and `messages`。只对机器动作使用原生 JSON 格式约束，不再约束用户回复为
Marqdo 代码。think=False 避免把内部推理混入动作，工具参数随后还会经过 ToolSpec 校验。
HTTP 状态和 JSON 解析都检查，格式失败不能被当作一次文件操作。

The model returns an internal decision envelope, while its final message is ordinary Markdown. The native HTTP result and the envelope are checked independently. A server response that is not JSON, an error status, or an empty message is reported rather than converted into a guessed action. No tool runs inside this transport adapter. Only the runner can accept a registered tool identifier and pass its arguments to the executor.

The JSON Schema constrains only the machine envelope: a decision type, a tool identity, an argument object and a readable message. It does not require Marqdo syntax inside the final answer. Tool-specific fields are still checked against the registered input schema after the response arrives. Keep message outside arguments; the existing native validator correctly rejects an unexpected parameter rather than guessing where it belongs.

We **format = [动作外壳使用明确 Schema](json.parse(text="{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"enum\":[\"tool\",\"final\"]},\"tool\":{\"type\":\"string\"},\"arguments\":{\"type\":\"object\"},\"message\":{\"type\":\"string\"}},\"required\":[\"type\",\"tool\",\"arguments\",\"message\"],\"additionalProperties\":false}"))**.

`payload` =

| model | messages | think | stream | format |
|---|---|---|---|---|
| `model` | `messages` | False | False | `format` |

We **response = [使用原生结构化响应](net.http_post(url=(base_url() + "/api/chat"), body=json.stringify(value=`payload`)))**.
1. json.get(value=`response`, key="status") != 200
  Return *[保留真实模型错误](result.error(code="qdagent.model_http", message=str(`response`), operation="decide"))*.
We **body = [检查响应 JSON](json.try_parse(text=json.get(value=`response`, key="body")))**.
1. not access(`body`, "ok")
  Return *body*.
We **content = [动作是公开协议内容](json.get(value=json.get(value=access(`body`, "value"), key="message"), key="content"))**.
We **decision = [不能执行不可解析的动作](json.try_parse(text=`content`))**.
1. not access(`decision`, "ok")
  Return *[错误动作不会执行](result.error(code="qdagent.model_format", message="模型没有返回有效动作 JSON", operation="decide"))*.
Return *[只返回待校验数据](result.ok(value=access(`decision`, "value")))*.




## base_url

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 可信模型服务地址 |

容器通过环境指定已有模型服务，默认本机地址保持直接开发兼容。地址不是模型给出的工具参数，不创建额外公开端口，也不把宿主网络设为容器运行模式。Use the host gateway for the existing Ollama service; the qdagent container publishes only its own authenticated application port.

We **value = sys.env_get(name="QDAGENT_OLLAMA_URL")**.
1. not `value`
  We **value = "http://127.0.0.1:11434"**.
Return *value*.

---
markup: occlusion
title: 对话作业核心
description: >-
  begin / pull / stop 共用的检索、智能体作答与阅读面片段，不是 Endpoint。
  提示词真相在 api/求道助手.mq.md（代码即文档 / agent 上下文），不写旁路 prompt 文件。
import:
  result: lib/result.mq.md
  kb: ../kb.mq.md
  assistant: 求道助手.mq.md
  ollama: ext/qdagent/ollama_chat.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
---

对话作业的共享能力。提示词由求道助手（智能体）装配；原生 NDJSON 流经
ollama_chat.stream_begin 落盘，pull 用 accumulate 解析增量。
站立真相源仍是求道助手编排文档。会话态文件（job/stream/ndjson/flag）是运行时数据，不是作者源码。


## next_turn

| 返回 | 类型 | 说明 |
|---|---|---|
| result | number | 下一回合号；按 turn.counter 递增 |

回合计数落在 data/dialogue/proj/turn.counter，纯 Marqdo 读写。Effects: fs.read, fs.write.

这里的计数只服务于本工程会话目录，不能当成全局任务 ID。读到旧值后递增并写回，缺失时从零开始；文件内容损坏会保留解析错误，不自动猜测上次编号。多进程同时 begin 的事务隔离尚未实现，因此上层仍应遵守单活动作业约定。

We **path = [计数文件]("data/dialogue/proj/turn.counter")**.
1. [计数已有](fs.exists(path=`path`))
  We **raw = [读计数](fs.read_text(path=`path`))** and **cur = [解析计数](json.parse(text=text.str_trim(s=`raw`)))**.
  1. not `cur`
    We **cur = 0**.
2. *
  We **cur = 0**.
We **n = `cur` + 1**.
We **_ = [写回计数](fs.write_text(path=`path`, text=str(`n`)))**.
Return *n*.

## reset_job

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，旧传输停止成功后才清空作业文件 |

新回合开始前擦掉上一回合的流式痕迹。Effects: fs.write, fs.remove.

清理之前必须取消旧的受控传输。仅把 NDJSON 清空而没有停止写入者，会让上一轮 curl 继续把旧答案写入新回合。插件的生命周期锁与令牌负责这一边界；停止失败时本函数直接返回，不能继续清理后报告成功。

| 文件或状态 | 本次处理 | 保留与清理的理由 |
|---|---|---|
| 旧受控 worker 与 curl | 先调用 stream_stop 并检查 Result | 新作业不能与上一写入者共享输出文件 |
| stream.txt | 写为空文本 | 清除上一轮累计正文，避免新问题显示旧答案 |
| _stream_raw.ndjson | 写为空文本 | 新请求从自己的原生流开始累计 |
| done.flag | 已存在才移除 | 新作业不能继承上一轮完成状态 |
| stop.flag | 已存在才移除 | 新回合不是上一回合的取消确认 |
| stream.pid | 兼容清理旧约定文件 | 真实进程身份已由 ABI 的 transport.pid 管理 |
| _stream_payload.json | 已存在才移除 | 下一次启动会写入完整的新模型请求 |
| session.mq.md | 不清理 | 对话历史属于用户档案，不能随传输重置删除 |
| current.json | 不在这里改写 | 新回合追加时由 dialogue 保存自己的稳定边界 |

这是传输状态的顺序重置，不是删除整个数据目录。新增状态文件时应先明确它属于作业、历史还是安装产物，再决定是否加入清理清单，不能用整目录移除掩盖状态管理不清晰的问题。

We **stopped = [先停止旧传输](ollama.stream_stop())**.
1. not access(`stopped`, "ok")
  Return *stopped*.
We **_ = [建立作业目录](fs.make_dirs(path="data/dialogue/proj"))**.
We **_ = [清空流正文](fs.write_text(path="data/dialogue/proj/stream.txt", text=""))**.
We **_ = [清空 NDJSON](fs.write_text(path="data/dialogue/proj/_stream_raw.ndjson", text=""))**.
1. [有完成标记](fs.exists(path="data/dialogue/proj/done.flag"))
  We **_ = [删完成标记](fs.remove_file(path="data/dialogue/proj/done.flag"))**.
1. [有停止标记](fs.exists(path="data/dialogue/proj/stop.flag"))
  We **_ = [删停止标记](fs.remove_file(path="data/dialogue/proj/stop.flag"))**.
1. [有 pid 文件](fs.exists(path="data/dialogue/proj/stream.pid"))
  We **_ = [删 pid](fs.remove_file(path="data/dialogue/proj/stream.pid"))**.
1. [有请求体](fs.exists(path="data/dialogue/proj/_stream_payload.json"))
  We **_ = [删请求体](fs.remove_file(path="data/dialogue/proj/_stream_payload.json"))**.
Return *[旧作业已停止并清理](result.ok(value=True))*.

## start_stream

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | required | 用户问题 |
| model | text | required | Ollama 模型标识 |
| kb | text | required | 知识库标识 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | pid；原生 NDJSON 后台传输已拉起 |

Use `q`, `model`, `kb`. 求道助手装配提示词后，交 ollama_chat.stream_begin
拉起 curl -N；pull 侧 accumulate 解析增量。Effects: plugin, fs, process.exec.

We **hits = [真实检索](retrieve(q=`q`, kb=`kb`))** and **hits_text = [知识上下文](context(hits=`hits`))**.
We **prompt = [智能体装配提示词](assistant.构建提示(q=`q`, model=`model`, hits_text=`hits_text`))**.
We **_ = [清空流正文](fs.write_text(path="data/dialogue/proj/stream.txt", text=""))**.
Return *[拉起原生流式传输](ollama.stream_begin(model=`model`, prompt=`prompt`, host="http://127.0.0.1:11434"))*.

## retrieve

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | required | 用户问题原文，作为检索词 |
| kb | text | required | 知识库标识；none / None / 空返回空命中 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 命中片段记录（file 与 text），未选择知识库时为空 |

Use `q` and `kb`. Effects: fs.read.

1. `kb` == "none"
  We **hits = [未选择知识库](table.empty_list())**.
2. `kb` == "None"
  We **hits = [空标识视为不检索](table.empty_list())**.
3. `kb` == ""
  We **hits = [空串视为不检索](table.empty_list())**.
4. not `kb`
  We **hits = [缺省视为不检索](table.empty_list())**.
5. *
  We **hits = [按问题检索知识库](kb.search(root=`kb`, q=`q`))**.
Return *hits*.

## compose

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | required | 用户问题原文 |
| model | text | required | 模型选择器标识 |
| hits | list | required | retrieve 返回的命中片段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | stage 与 reply（Marqdo 片段） |

Use `q`, `model` and `hits`. Effects: network.write.

1. `model` == "none"
  We **out = [检索式 Marqdo 回答](answer(q=`q`, hits=`hits`))**.
2. `model` == "echo"
  We **out = [检索式 Marqdo 回答](answer(q=`q`, hits=`hits`))**.
3. *
  We **out = [模型合成 Marqdo 回答](synth(q=`q`, model=`model`, hits=`hits`))**.
Return *out*.

## answer

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | required | 用户问题原文，未命中时回显 |
| hits | list | required | retrieve 返回的命中片段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | stage 与 reply（Marqdo 片段） |

此处使用的出处来自真实命中记录。没有上下文就明确表示未命中，并保留问题便于追查；不生成看起来像搜索结果的占位引用。返回的 stage 区分 empty 和 retrieval，调用者应按其含义解释，不把检索式输出描述成模型推理或已经执行的工具结果。

Use `q` and `hits`. Effects: pure.

We **ctx = [知识片段块](context(hits=`hits`))**.
1. not `ctx`
  We **body = [未命中叙述]("知识库中没有与问题直接相关的片段，暂无出处可引。问题原文：" + `q` + "\n")**.
  We **out = [未命中记录](table.put(in=None, at="stage", value="empty"))** and **out = [附上回退正文](table.put(in=`out`, at="reply", value=`body`))**.
2. *
  We **body = [检索叙述]("依据知识库检索，下列内容来自命中片段，出处写在方括号里。\n\n" + `ctx` + "\n")**.
  We **out = [检索记录](table.put(in=None, at="stage", value="retrieval"))** and **out = [附上检索正文](table.put(in=`out`, at="reply", value=`body`))**.
Return *out*.

## context

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| hits | list | required | retrieve 返回的命中片段记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 逐条带出处文件的片段块，空命中返回空串 |

Use `hits`. 用累加拼接代替 str_join，避免空列表宿主路径差异。Effects: pure.

1. not `hits`
  Return *[无命中]("")*.
We **ctx = [片段正文从空]("")**.
- [逐条拼接命中片段](for hits as hit)
  We **file = [取出处文件](json.get(value=`hit`, key="file"))** and **para = [取片段原文](json.get(value=`hit`, key="text"))**.
  1. not `ctx`
    We **ctx = [首条片段]("[" + `file` + "]" + "\n" + `para`)**.
  2. *
    We **ctx = [追加片段](`ctx` + "\n\n" + "[" + `file` + "]" + "\n" + `para`)**.
Return *ctx*.

## synth

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | required | 用户问题原文 |
| model | text | required | Ollama 模型标识 |
| hits | list | required | retrieve 返回的命中片段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | stage 与 reply（Marqdo 片段） |

Use `q`, `model` and `hits`. 委托求道助手；提示词来自其编排文档。Effects: plugin, network.write.

We **hits_text = [知识上下文](context(hits=`hits`))**.
We **out = [智能体作答](assistant.回答(q=`q`, model=`model`, hits_text=`hits_text`))**.
We **body = [取 Marqdo 片段](json.get(value=`out`, key="reply"))**.
1. not `body`
  Return *[回退检索式](answer(q=`q`, hits=`hits`))*.
Return *out*.

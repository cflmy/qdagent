---
markup: occlusion
title: 模型 SKILL
description: 使用 Marqdo 官方 LLM 扩展发送明确的模型消息，不实施智能体调度。
import:
  llm: ext/ai/llm.mq.md
  fs: lib/fs.mq.md
---

# model

模型 SKILL 是唯一触发真实模型请求的模块。

本 SKILL **不是 Agent 框架**。它不搜索工具、不判断应该运行哪个 SKILL，不读取隐式聊天历史，也不维护独立的角色或上下文模板。模型消息完全由下面可阅读、可执行的 Marqdo 函数定义；可通过本文件直接调用。

调用依赖 Marqdo 官方 `ext/ai/llm.mq.md`。该扩展负责 OpenAI-compatible HTTP 与模型配置，并非本仓库编写或启动的 Python/Go 服务。

## ask

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 当前用户实际输入 |
| memory | text | required | 调用方选择的记忆文本 |
| document | text | required | 当前正在执行的 Marqdo 文稿内容 |

Use `question`, `memory`, `document` as explicit model inputs.

下表就是全部模型可见内容，没有外部框架隐藏拼接的上下文。

`messages` =

| @ | role | content |
|---|---|---|
| 1 | system | `document` |
| 2 | user | `memory` |
| 3 | user | `question` |

We **handle = [建立官方 Marqdo LLM 资源](llm.create())**.
Return *[调用模型并返回真实结果与用量](`handle`.ask(messages=`messages`))*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 不经过聊天 SKILL 的直接模型请求 |

Use `question` as the current user message.

We **memory = [读取唯一可见记忆](fs.read_text(path="memory.mq.md"))**.
We **document = [读取当前模型 SKILL 源文稿](fs.read_text(path="skills/model/index.mq.md"))**.
Return *[独立运行模型 SKILL](ask(question=`question`,memory=`memory`,document=`document`))*.

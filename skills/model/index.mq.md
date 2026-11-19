---
markup: occlusion
title: 模型 · 唯一的推理入口
description: 用 Marqdo 官方 LLM 扩展发送清楚列明的消息；不负责聊天状态或工具分派。
import:
  llm: ext/ai/llm.mq.md
  fs: lib/fs.mq.md
---

# 模型

模型 SKILL 只负责一件事：把当前 Marqdo 文稿明确选定的材料交给模型，
并原样保留返回的结果、用量和错误。

它不替用户选择工具，不重放整个聊天记录，不自动读取仓库，
也没有隐藏的系统提示词。真正的网络调用依赖
[Marqdo 官方 LLM 扩展](https://github.com/cflmy/marqdo/blob/main/ext/ai/llm.mq.md)；这里不实现第二套模型 SDK。

## ask

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | 必填 | 用户本轮输入 |
| memory | text | 必填 | 用户明确保存的长期记忆 |
| history | text | 必填 | 本次终端保留的短期对话 |
| document | text | 必填 | 当前正在执行的 Marqdo 文稿 |

| 返回 | 类型 | 说明 |
|---|---|---|
| 模型结果 | map | 官方 LLMResult，包括回答、使用量及可能的错误 |

### 模型真正能看到什么

模型收到的全部内容就在下表中。它来源于调用方已经明确读取的文稿和数据，
没有外部 Agent 框架为每一轮额外拼接工具说明或完整历史。

`模型消息` =

| @ | role | content |
|---|---|---|
| 1 | system | `document` |
| 2 | user | `memory` |
| 3 | user | `history` |
| 4 | user | `question` |

为了执行这份消息表，我们先**模型资源 = [建立 Marqdo 官方模型句柄](llm.create())**。
随后返回*[发送上表内容并保留真实响应](`模型资源`.ask(messages=`模型消息`))*。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | 必填 | 直接测试模型 SKILL 时输入的问题 |

这个入口允许单独检查模型 SKILL，不需要启动终端聊天。
它只读持久记忆和自己的可执行文稿，不读取或构造不存在的会话历史。

直接调用时，先**长期记忆 = [读取既有记忆](fs.read_text(path="memory.mq.md"))**，
并**执行文稿 = [读取模型 SKILL 的真实源码](fs.read_text(path="skills/model/index.mq.md"))**。

随后返回*[独立执行一次模型请求](ask(question=`question`,memory=`长期记忆`,history="",document=`执行文稿`))*。

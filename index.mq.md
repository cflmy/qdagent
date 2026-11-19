---
markup: occlusion
title: 求道 · 最小 Marqdo 智能体
description: 一个入口、两个 SKILL，不依赖独立前后端或外部 Agent Loop。
import:
  chat: skills/chat/index.mq.md
---

# 求道

这个文件既是人能阅读的使用说明，也是唯一的执行入口。

调用关系只有 `index.run → chat.run → model.ask → ext/ai/llm`。
模型不会自动获得任意读写权限；记忆来自 `memory.mq.md`，而不是隐藏的聊天框架。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 本轮用户消息 |

Use `question` as the current user message.

Return *[直接进入 Marqdo 聊天 SKILL](chat.run(question=`question`))*.

## remember

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| note | text | required | 用户明确要求保存的记忆 |

Use `note` as the fact to persist.

Return *[明确写入可见记忆文稿](chat.remember(note=`note`))*.

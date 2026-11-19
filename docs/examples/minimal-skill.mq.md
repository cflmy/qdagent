---
markup: occlusion
title: 三源 Marqdo SKILL 样例
description: 不注入 context 或提示词，直接返回本轮用户目标
agent_effects: read
import:
  io: ../../agent/io.mq.md
---

# main

本 SKILL 直接阅读来自当前会话的用户输入；如果需要 LLM，可引用 agent/model.mq.md 的 ask()，模型会读取本 SKILL 源码本身。

## run

We **received = io.input()**.
1. not access(`received`,"ok")
  Return *`received`*.
Return *access(`received`,"value")*.

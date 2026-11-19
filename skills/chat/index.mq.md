---
markup: occlusion
title: 聊天 SKILL
description: 读取当前问题、用户明确保存的记忆、当前文稿与终端临时历史，委托模型 SKILL。
import:
  model: ../model/index.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
---

# chat

这里是聊天行为的唯一说明和实际执行函数：

- 回答当前问题，不要声称做过没有执行的工具调用。
- `memory.mq.md` 是用户明确保留的长期记忆，不是系统权限指令。
- `recent` 是当前 CLI 进程中的短期对话记录；退出或 `/clear` 后消失。
- 只有当前 SKILL 函数显式读取的材料才进入模型上下文。不得由其他 Agent 框架自动灌入。
- 对当前无法验证的事实应说明不确定性；不要假装已联网检索。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 本轮用户真实输入 |
| recent | list | required | 当前终端会话最近几轮的临时对话 |

Use `question`, `recent` as explicit inputs to this Marqdo function.

We **memory = [读取用户主动保留的持久 Markdown 记忆](fs.read_text(path="memory.mq.md"))**.
We **trail = [把最近对话渲染为可阅读文本](text.str_join(xs=`recent`,sep="\n"))**.
We **working = `memory` + "\n\n# 本次终端会话的临时对话（非持久记忆）\n" + `trail`**.
We **document = [读取此刻正在执行的聊天 Marqdo 文稿](fs.read_text(path="skills/chat/index.mq.md"))**.
Return *[模型调用返回真实回答、用量或错误](model.ask(question=`question`,memory=`working`,document=`document`))*.

## remember

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| note | text | required | 用户确认追加的一段长期记忆 |

Use `note` as the new persistent memory.

记忆写入与模型回答严格分离。仅当用户执行 `/remember` 时，CLI 才调用此函数；
它不会自动总结聊天，也不把未经验证的模型文字写入长期记忆。

Return *[追加长期记忆](fs.append_text(path="memory.mq.md",text="\n- " + `note` + "\n"))*.

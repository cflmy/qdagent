---
markup: occlusion
title: 求道 · Marqdo CLI 智能体
description: marqdo run index.mq.md 直接进入持续对话；所有循环与调用都属于 Marqdo。
import:
  chat: skills/chat/index.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
---

# main

这是求道的唯一启动入口。运行 `marqdo run index.mq.md` 直接进入交互终端。
当前项目不启动服务器、不安装外部 Agent 循环、不让 Python 或 Go 负责输入输出。
Marqdo 的 `input` 内建函数读取用户输入，循环与技能调用均在本文件内。

模型对话链路：当前用户输入 → `chat.run` → `model.ask` → Marqdo 官方 LLM 扩展。
本次进程的临时历史保留最近四轮，不自动写到磁盘；显式的 `/remember` 才写入 `memory.mq.md`。

## 终端执行流

下面的代码是可执行的 Marqdo 主流程，而不是一个等待外部框架调用的服务接口。

We **running = True**.
We **recent = table.empty_list()**.
> print text="求道 · Marqdo CLI"
> print text="输入消息开始对话；/help 查看命令，/exit 退出。"

- `running`
  We **raw = [读取终端下一行](input(prompt="你 >"))**.
  We **question = [清理两侧空格](text.str_trim(s=`raw`))**.
  1. not `question`
    We **running = False**.
  2. `question` == "/exit" or `question` == "/quit" or `question` == "/退出"
    We **running = False**.
  3. `question` == "/help"
    > print text="命令：/help 帮助 · /memory 查看记忆 · /remember 保存记忆 · /clear 清空临时历史 · /exit 退出"
  4. `question` == "/clear"
    We **recent = table.empty_list()**.
    > print text="求道 > 已清空本次终端会话的临时历史；磁盘记忆未修改。"
  5. `question` == "/memory"
    We **saved = fs.read_text(path="memory.mq.md")**.
    > print text=`saved`
  6. `question` == "/remember"
    We **note_raw = [询问确切需要保存的文本](input(prompt="记忆 >"))**.
    We **note = [只去掉两端空白](text.str_trim(s=`note_raw`))**.
    1. `note`
      We **record = [显式写入持久记忆](chat.remember(note=`note`))**.
      > print text="求道 > 已追加记忆到 memory.mq.md。"
    2. *
      > print text="求道 > 没有需要保存的记忆。"
  7. *
    We **reply = [Marqdo 聊天 SKILL 完成这一轮](chat.run(question=`question`,recent=`recent`))**.
    We **error = [检查模型真实错误](json.get(value=`reply`,key="error"))**.
    1. `error`
      We **warning = "求道 > 模型请求失败：" + str(`error`)**.
      > print text=`warning`
    2. *
      We **answer = [模型实际输出](json.get(value=`reply`,key="text"))**.
      We **shown = "求道 > " + str(`answer`)**.
      > print text=`shown`
      We **recent = [记住这一轮用户输入](table.append(list=`recent`,item="用户：" + `question`))**.
      We **recent = [记住这一轮模型回答](table.append(list=`recent`,item="求道：" + str(`answer`)))**.
      We **count = [当前历史条目数](table.len(xs=`recent`))**.
      1. `count` > 8
        We **start = `count` - 8**.
        We **recent = [只保留最后四个问答回合](table.slice(list=`recent`,start=`start`))**.

> print text="求道 > 再见。"

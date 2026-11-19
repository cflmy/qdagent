---
markup: occlusion
title: 求道 · 终端对话
description: 一份可以阅读、也可以通过 marqdo run 直接运行的对话手册。
import:
  chat: skills/chat/index.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
---

# main

求道从一份 Marqdo 文稿开始，而不是从一个隐藏的智能体框架开始。
运行 `marqdo run index.mq.md` 后，终端将持续接受消息，并把每次回答交给
[聊天 SKILL](skills/chat/index.mq.md)。聊天所需的模型调用则由
[模型 SKILL](skills/model/index.mq.md) 完成。这里不启动服务器，也不调用任何 Python 代理。

一段终端会话如何进行：

会话开始时，我们先**会话开启 = True**，并**近期对话 = table.empty_list()**。
近期对话只存在于本次进程中；它帮助求道理解刚才的谈话，退出后不会变成长久记忆。

> print text="求道 · Marqdo CLI"
> print text="直接输入消息开始对话；/help 查看命令，/exit 退出。"

只要会话仍在继续，就读取下一行输入。终端中的每一种命令都在下方清楚列出，
没有独立的命令分派服务或外部 Agent Loop。

- `会话开启`
  我们先**原始输入 = [从终端读取下一行](input(prompt="你 >"))**，
  再**用户消息 = [去除输入两侧的空白](text.str_trim(s=`原始输入`))**。

  1. not `用户消息`
    空行表示结束本次会话；这也使终端输入结束时无需另起守护程序。
    **会话开启 = False**。

  2. `用户消息` == "/exit" or `用户消息` == "/quit" or `用户消息` == "/退出"
    用户明确离开时，**会话开启 = False**。

  3. `用户消息` == "/help"
    直接说明当前支持的交互，不提供尚未实现的能力。
    > print text="/help 帮助 · /memory 查看记忆 · /remember 保存记忆 · /clear 清除临时对话 · /exit 退出"

  4. `用户消息` == "/memory"
    这里查看的是磁盘上真正保存的记忆，不是模型刚刚生成的聊天内容。
    **记忆正文 = [读取记忆文稿](fs.read_text(path="memory.mq.md"))**。
    > print text=`记忆正文`

  5. `用户消息` == "/remember"
    只有用户明确要求保存时，才询问要留下的内容。
    **记忆输入 = [询问需要长期保留的事实](input(prompt="记忆 >"))**，
    并**记忆条目 = [去除两侧空白](text.str_trim(s=`记忆输入`))**。

    1. `记忆条目`
      我们**保存结果 = [追加一条明确的长期记忆](chat.remember(note=`记忆条目`))**，
      写入成功后才向用户确认。
      > print text="求道 > 已写入 memory.mq.md。"
    2. *
      > print text="求道 > 没有要保存的内容。"

  6. `用户消息` == "/clear"
    清除的只是终端里的短期对话，绝不删除 `memory.mq.md`。
    **近期对话 = table.empty_list()**。
    > print text="求道 > 临时对话已清空，长期记忆保持不变。"

  7. *
    其余输入都是正常对话。我们先**回答记录 = [使用聊天 SKILL 回答当前问题](chat.run(question=`用户消息`,recent=`近期对话`))**，
    再**请求错误 = [检查模型调用是否报告失败](json.get(value=`回答记录`,key="error"))**。

    1. `请求错误`
      请求失败时，直接显示真实错误；失败内容不会进入近期对话。
      > print text="求道 > 模型请求失败：" + str(`请求错误`)
    2. *
      成功时，从回答记录中**回答正文 = [取得模型真正返回的文字](json.get(value=`回答记录`,key="text"))**，
      并显示给用户。
      > print text="求道 > " + str(`回答正文`)

      为了让下一轮能够理解刚才的内容，我们**近期对话 = [保留本轮用户消息](table.append(list=`近期对话`,item="用户：" + `用户消息`))**，
      再**近期对话 = [保留本轮真实回答](table.append(list=`近期对话`,item="求道：" + str(`回答正文`)))**。

      只保存最近四轮即可。我们先**条目数 = [计算已保存的消息数量](table.len(xs=`近期对话`))**：
      1. `条目数` > 8
        **起点 = `条目数` - 8**，然后**近期对话 = [保留最后八条消息](table.slice(list=`近期对话`,start=`起点`))**。

会话结束后，礼貌告别。持久记忆仍在原文件中，临时对话则随进程结束而消失。

> print text="求道 > 再见。"

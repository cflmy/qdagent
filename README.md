# 求道 · 两个 SKILL 的 Marqdo 终端智能体

求道的主入口就是一份可读、可执行的文稿：`index.mq.md`。
它负责持续读取用户输入、显示模型回答和管理少量临时对话。聊天原则由
[聊天文稿](skills/chat/index.mq.md) 说明，真实模型调用则完整保存在
[模型文稿](skills/model/index.mq.md) 里。

**不使用 Python、额外 Agent 框架、前后端服务或私有原生插件。**

## 启动

先安装 [Marqdo CLI](https://github.com/cflmy/marqdo) 和官方 LLM 扩展：

```sh
marqdo ext add llm
```

配置相应的 OpenAI-compatible API 环境变量（示例见 `.env.example`），
然后直接从仓库根目录启动：

```sh
marqdo run index.mq.md
```

Marqdo 原生 `input` 负责终端输入，主文稿自己的循环负责多轮对话。
如需约束读取的工作目录，可以运行 `marqdo run index.mq.md --fs-root .`。

## 终端会话

```text
求道 · Marqdo CLI
直接输入消息开始对话；/help 查看命令，/exit 退出。

你 > 你好！
求道 > 你好！有什么可以帮助你？

你 > /remember
记忆 > 我希望程序本身像一份文档一样清晰。
求道 > 已写入 memory.mq.md。

你 > /exit
求道 > 再见。
```

上面只表示终端交互的预期格式，**不是已经跑通的测试记录**。

| 终端输入 | 作用 |
|---|---|
| 普通消息 | 在终端继续对话，并保留最近四轮 |
| `/help` | 显示支持的命令 |
| `/memory` | 查看 `memory.mq.md` 的真实内容 |
| `/remember` | 明确追加一条长期记忆 |
| `/clear` | 清空进程内的临时对话，不影响磁盘 |
| `/exit`、`/quit`、`/退出` | 结束会话 |
| 空行 | 结束会话 |

## 从文稿中看见实际执行

```text
index.mq.md  ──── 自己的 input / while 会话循环
     │
     └── skills/chat/index.mq.md
              │ 读取 memory.mq.md
              │ 读取当前 chat 文稿
              │ 合并显式保留的短期历史
              │
              └── skills/model/index.mq.md
                       │ GFM 表格列出所有模型消息
                       └── Marqdo 官方 ext/ai/llm.mq.md
```

- `index.mq.md` 讲清终端会话和命令的生命周期；
- `chat` 文稿讲清问题、记忆、近期历史和当前文稿从哪里来；
- `model` 文稿直接把传给模型的角色与内容写成 GFM 表格。

本版把“每一行都像普通程序”改为“**先描述目的，再在句子中执行必要操作**”。
两份 SKILL 是正常的 `##` 函数，可被独立 `marqdo call` 调试，但正式入口始终是 `marqdo run`。

## 项目边界

仍然只有八个文件：`index.mq.md`、`memory.mq.md`、两份 SKILL、`README.md`、
`AGENTS.md`、`.env.example` 和 `.gitignore`。没有扩展产品栈。

本次对照了官方编写指南及语言语法，但当前工作环境没有 Marqdo CLI；
没有声称已通过编译、终端或联网对话测试。可在实际运行时先检查
`marqdo check index.mq.md --narrative-ratio`，再验证循环、文件权限和模型返回。

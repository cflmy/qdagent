# 求道 · 纯 Marqdo 终端智能体

**一个 CLI 入口、两个 SKILL，完全使用 Marqdo 执行。** 不需要 Python、Go、私有 Rust 插件、Web 后端或前端。

## 启动：只有这一条主命令

```bash
marqdo run index.mq.md
```

在仓库根目录启动后，Marqdo 直接运行 `# main`。其中 `input(prompt="你 >")` 不断从终端读取下一行，
内置 `while` 循环调用聊天 SKILL，模型通过 Marqdo 官方 LLM 扩展返回答案。

终端示意（示例文字，不是已经验证的模型回复）：

```text
求道 · Marqdo CLI
输入消息开始对话；/help 查看命令，/exit 退出。
你 > 你好
求道 > 你好！有什么需要帮助的吗？
你 > 你还记得我们刚才聊了什么？
求道 > 我们刚才互相问候了。
你 > /remember
记忆 > 用户喜欢用 Marqdo 文稿直接定义智能体。
求道 > 已追加记忆到 memory.mq.md。
你 > /exit
求道 > 再见。
```

## 环境配置

需要已安装的 [Marqdo CLI](https://github.com/cflmy/marqdo)，以及官方 LLM 扩展：

```bash
marqdo ext add llm
```

Marqdo LLM 扩展可从环境变量取得 OpenAI-compatible 模型配置（参见 `.env.example`）：

```bash
export OPENAI_API_KEY='your-key'
export OPENAI_BASE_URL='https://api.openai.com/v1'
export OPENAI_MODEL='your-model-name'
marqdo run index.mq.md
```

`marqdo run` 使用自身的运行时权限机制，**不是** `marqdo call --effects` 的语法。
如果要限定文件根，可使用 `marqdo run index.mq.md --fs-root .`。
没有 Python dotenv 脚本、没有 HTTP 服务器、没有额外命令包装器。

## 终端命令

| 输入 | 行为 |
|---|---|
| 普通文本 | 发送一轮模型对话，然后继续等待下一行 |
| `/help` | 显示命令清单 |
| `/memory` | 打印磁盘中唯一的长期记忆文稿 |
| `/remember` | 提示用户输入一条确切记忆，追加到 `memory.mq.md` |
| `/clear` | 清空当前进程的临时历史，不修改长期记忆 |
| `/exit`、`/quit`、`/退出` | 正常结束会话 |
| 空行 / Ctrl-D | 结束会话（当前极简版本） |
| Ctrl-C | 由 Marqdo 的终端输入处理器终止 |

当前版本接收**单行消息**，模型回复在本轮调用完成后一次性显示；没有增量 token 流、交互式多行输入或额外 UI，便于保持最小闭环。

## 执行链路完全在文稿中

```text
marqdo run index.mq.md
           │
     # main 内置 input + while
           │
    skills/chat/index.mq.md
        ├─ read memory.mq.md
        ├─ read skills/chat/index.mq.md
        └─ read 本次 CLI 最近四轮
           │
    skills/model/index.mq.md
        └─ handle.ask(messages=GFM表)
           │
    Marqdo 官方 ext/ai/llm.mq.md
           │
    OpenAI-compatible / Ollama-compatible HTTP
```

**最近四轮**（用户与求道共最多 8 条）是当前 `index.mq.md` 的内存列表，借助
`table.append`、`table.slice` 显式管理。它不写入磁盘，也不会从外部框架偷偷拼进模型。
聊天 SKILL 用 `text.str_join` 把它明确投影到当轮的短期工作记忆。
长期记忆只来自仓库根目录的 `memory.mq.md`；它也只能由用户的 `/remember` 显式改变。

模型 SKILL 的消息表仍然由 `.mq.md` 自己生成，实际模型来源是：
当前用户问题、选中的工作记忆和当前执行的聊天文稿。
未来按需加载其他上下文时，也应优先扩展 Marqdo 函数，而不是重新引入 Agent 框架。

## 仓库范围与开发说明

```text
index.mq.md
memory.mq.md
skills/
  chat/index.mq.md
  model/index.mq.md
README.md
AGENTS.md
.env.example
.gitignore
```

此分支只维护以上 8 个文件，不新增 `server/`、`frontend/`、`worker/`、Python 脚本、
另一个 Agent Loop 或手工工具注册表。两个 SKILL 也可以使用 `marqdo call`
分别检查函数，但**正式对话入口始终为 `marqdo run index.mq.md`**。

这是实验源码。本次对照过上游的 `input`、while 和 `llm.create/ask` 接口，
但没有在这里运行真实终端或联网模型测试；还需要在本机验证当前 Marqdo 版本的实际行为。

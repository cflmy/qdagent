# 求道 · 最小 Marqdo 智能体

**只有两个 SKILL：model 和 chat。没有前端、后端、Python、独立 Rust 插件和外部 Agent 框架。**

所有智能体逻辑都以真正可调用的 Marqdo 文稿呈现：

```text
index.mq.md  (run / remember)
     │
     ▼
skills/chat/index.mq.md  (run / remember)
     │  ├─ 读取 memory.mq.md
     │  └─ 读取自身完整 .mq.md 源码
     ▼
skills/model/index.mq.md (ask / run)
     │  明确的 GFM 表格定义模型 messages
     ▼
Marqdo 官方 ext/ai/llm.mq.md
     │
OpenAI-compatible API / Ollama-compatible endpoint
```

## 目录

```text
index.mq.md
memory.mq.md
skills/
  chat/index.mq.md
  model/index.mq.md
AGENTS.md
README.md
.env.example
.gitignore
```

不保留 `agent/`、`workflows/`、`ext/`、`server/`、`frontend/`、`worker/`、`deploy/`、`scripts/` 或测试基础设施。底层模型协议直接使用已安装的 Marqdo 扩展，不复制官方基础库。

## 如何直接运行

安装 [Marqdo CLI](https://github.com/cflmy/marqdo) 并安装官方 LLM 扩展（**不是本项目的外部 Agent 框架**）：

```sh
marqdo ext add llm
```

在当前仓库根目录设置模型所需的环境变量，兼容 OpenAI Chat Completions 协议。例如：

```sh
export OPENAI_API_KEY='your-key'
export OPENAI_BASE_URL='https://api.openai.com/v1'
export OPENAI_MODEL='your-model-name'
```

也可以手工根据 `.env.example` 配置；此最小项目没有 Python `dotenv` 脚本。

**直接开始一轮对话：**

```sh
marqdo call index.mq.md run 'question=你好，请介绍求道智能体。' --fs-root . --effects fs.read,environment.read,network.write,plugin
```

第二轮仍运行同一入口，输入换成新的消息：

```sh
marqdo call index.mq.md run 'question=继续介绍它与传统 Agent 框架的区别。' --fs-root . --effects fs.read,environment.read,network.write,plugin
```

**显式保存一条跨轮记忆**（仅此操作写文件）：

```sh
marqdo call index.mq.md remember 'note=用户希望每一步模型调用都能在 Marqdo 文稿中找到。' --fs-root . --effects fs.write
```

**跳过 chat，直接调用 model SKILL：**

```sh
marqdo call skills/model/index.mq.md run 'question=请回答一个简单问题。' --fs-root . --effects fs.read,environment.read,network.write,plugin
```

模型配置与请求方法使用上游 `llm.create()` 和 `handle.ask(messages=...)`，而不是本仓库的服务端代理。命令中的 effects 是 Marqdo 自身的显式能力许可；请按实际安装版本检查可用的 effect 名称与扩展加载方式。

## 三项上下文只是当前最小闭环

本版本在 `skills/chat/index.mq.md` 内显式读取：本轮用户问题、`memory.mq.md`、正在执行的聊天 SKILL 源码；在 `skills/model/index.mq.md` 用原生 GFM 表格将它们送给模型。**没有隐藏的外部 Agent 上下文拼接。**

未来模型要自主追加特定知识时，应当先在 Marqdo 文稿内设计读哪些片段、为何读取、如何验证；不因此引入前后端、大型 Agent 循环或第三个 SKILL。这份最小版暂未实现自主上下文工作集，也不会跨轮自动总结和存记忆。每次 `run` 是独立的 CLI 调用，连续性仅来自你明确写入的 `memory.mq.md`。

## 状态与边界

这是极简原型源码；我没有在此操作中执行 Marqdo 编译、联网模型或完整对话测试，不保证当前版本开箱即用。**它能够直接由 Marqdo CLI 调用的架构已建立**，能否执行成功还需在你的环境中验证 CLI、扩展与 effects。主分支不受影响。

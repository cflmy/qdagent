# qdagent 总览与产品愿景

| | |
|---|---|
| 状态 | 调研定稿 · 设计输入 |
| 日期 | 2026-09-07 |
| 相关 | [竞品](research/01-competitive-openclaw-hermes.md) · [原生设计](design/02-marqdo-native-agent.md) · [路线图](roadmap/07-task-roadmap.md) |

---

## 0. 我们要做什么

构建一个 **好用的智能体助手（qdagent）**，用 **Marqdo** 作为实现语言与知识形态：

- 对标 **OpenClaw**（多通道个人助手、本地 Gateway、语音/Canvas）与 **Hermes Agent**（长驻进程、技能自改进、模型无关、ACP/Web）。
- 不只是「再做一个聊天壳」：每次执行的思考、工具调用、结果与失败原因，都 **自动写成 `.mq.md`**，进入仓库式知识库，便于审计与复用。
- **差异化界面**：默认是 **笔记/知识库式展示**（像笔记一样浏览 Runs / Skills / KB），聊天与语音是写入笔记的入口，而不是唯一主界面。
- 对内：笔记 UI + 对话抽屉 + 语音。
- 对外双轨：
  - **OpenAI 兼容 API** — 把求道当「模型」挂进编辑器；
  - **MCP Server** — 继续用编辑器自带 AI，也能检索/写回/晋升求道知识（**不换模型也能沉淀**）。
- 详见 [笔记 UI 与 MCP](design/07-notes-ui-and-mcp.md)。

---

## 1. 问题陈述

| 痛点 | 常见做法的缺口 | qdagent 目标 |
|------|----------------|--------------|
| 会话结束后「不知道发生了什么」 | transcript 在 SaaS / 本地 JSON，人难审 | 每次 run → 一份可执行工作簿 `.mq.md` |
| 成功经验不可复用 | 向量库黑盒或纯聊天记忆 | 成功步骤固化为 Marqdo 代码 + OKF 知识包 |
| 接外部编辑器后失控 | 代理只转发 token，无治理 | OpenAI 兼容面仍走同一执行内核与写回管道 |
| 框架与文档两张皮 | Python 编排 + 另写 README | **编排本身就是文档**（Marqdo 宪法） |
| 语音与多模型碎片化 | 各接各的 SDK | 统一 Provider 适配层 + 模型矩阵 |

---

## 2. 设计原则（不可退让）

1. **真相源唯一**：权威状态在磁盘上的 `.mq.md`（及由其生成的 OKF），不是进程内存。  
2. **审计默认开启**：关闭写回必须显式声明；外部 API 请求默认落盘。  
3. **确定步骤固化**：已稳定的流程写成普通 Marqdo 函数；不确定处才问模型。  
4. **模型可替换**：OpenAI 兼容优先；国产云、本地 vLLM/Ollama、多模态、ASR/TTS 可插拔。  
5. **安全默认收紧**：工具白名单、沙箱策略、密钥不进仓库；对外 API 需鉴权。  
6. **借力不重复造轮**：LLM I/O 用 `ext/ai/llm`；编排用 `ext/ai/agent`（文档驱动版）；Web 用 `ext/web`；差异化做在「沉淀 + API 门面 + 笔记 UI + MCP」。  
7. **默认 Docker 部署**：Gateway / UI /（可选）MCP 与数据卷一体交付，见 [Docker 部署](design/08-docker-deploy.md)。

---

## 3. 系统上下文（逻辑架构）

```text
┌──────────────────────────────────────────────────────────────────┐
│  Surfaces                                                        │
│  笔记式 Web（默认）· Chat 抽屉 · Voice · CLI                     │
│  OpenAI-compatible API · **MCP Server**（编辑器侧模型）            │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  qdagent Gateway                                                 │
│  session · auth · rate-limit · streaming · MCP tools/resources   │
│  request / mcp_capture → runbook map                             │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  Agent Core（可选：本机推理）+ Capture Core（必选：沉淀）         │
│  Provider Hub · runbook 工具 · plugin ABI                        │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  Persistence Plane（全部默认写盘）                                 │
│  runs/*.mq.md · kb/ · skills/ · catalog · git-friendly audit     │
└──────────────────────────────────────────────────────────────────┘
```

**Capture Core** 与 Agent Core 分离：MCP 场景可以 **只沉淀不推理**。

### 3.1 记忆闭环（已实现）

| 能力 | 权威 / 入口 |
|------|-------------|
| 用户画像 | `data/kb/用户画像.mq.md` · 维度：身份与角色、目标与动机、沟通偏好、工作习惯、常用工具与环境、近期焦点、禁忌与边界、变更日志 |
| 回答前查库 | `/api/store/context`（画像 + `corpus_search`）→ Web system / CLI standing |
| 笔记整理 | 手动：可读 **GFM 表格索引**（PARA 风格）→ `data/kb/整理-*.mq.md`；笔记库卡片只用短 `summary`，禁止 JSON dump |

仍 **不做** 默认向量 RAG。

---

## 4. 与 Marqdo 官方能力的边界

| 已有（复用） | qdagent 新增 |
|--------------|--------------|
| `ext/ai/llm` OpenAI 兼容客户端 | Provider 目录、密钥保险柜、多模型路由 |
| `ext/ai/agent` 单步/多步、写回、工作簿 | **强制审计策略**、run 目录规范、对外会话映射 |
| `lib/writeback` / `lib/subtask` / OKF catalog | 知识晋升流水线（成功 → skill / KB 条目） |
| `ext/web` 动态站 | **笔记式**求道库 UI + 对话抽屉 + 语音 |
| `marqdo view` / `debug` | 笔记正文渲染 / 调试能力复用或嵌入 |
| 原生 plugin ABI | ASR/TTS/网关等主机侧插件 |
| （无官方 MCP） | **qdagent MCP Server**（tools/resources/prompts） |

---

## 5. 成功标准（MVP）

| # | 标准 |
|---|------|
| M1 | `marqdo run` 跑通「问答 + 工具」；每次生成 `runs/<id>.mq.md` |
| M2 | `POST /v1/chat/completions` 可用；请求在 `runs/` 留档 |
| M3 | **笔记式**界面可浏览 Runs；对话后主区打开对应笔记 |
| M4 | 至少一种 ASR 接入并写回转写文本 |
| M5 | `marqdo catalog` 能从 runs/kb 生成可浏览知识索引 |
| M6 | MCP：`qd_search` / `qd_capture` 可在 Cursor 调用并落盘 |

---

## 6. 非目标（首期不做）

- 完整复制 OpenClaw 全部即时通讯通道（WhatsApp/iMessage 等）——可作为后期 Gateway 适配。  
- 自研基础大模型。  
- 多租户 SaaS 级隔离（GoClaw 方向）——架构预留，首期单用户/单团队。

---

## 7. 文档与后续调研任务

详见 [路线图](roadmap/07-task-roadmap.md)。每完成一个调研任务，应回写本目录对应文档的「结论 / 决策」小节，避免调研与实现脱节。

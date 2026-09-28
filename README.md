# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **≥ 1.3.0**（markup **v0.3** + **ADR 0007** Web Artifact）的文档驱动智能体助手（**求道**）。实现语言是 **Marqdo（`.mq.md`）**。

- **登录后使用**：打开站点先登录
- **同域 LLM 代理**：`/llm` SSE（无需 Python :7432）
- **记忆闭环**：回答前检索笔记 + `data/kb/用户画像.mq.md`；智能整理 → `data/kb/concepts`（OKF）
- **沉淀 API**：`/api/store/*` → `lib/api`（invoke / Endpoint）
- **MCP**：`marqdo run 求道-mcp.mq.md`（含 `qd_context` / `qd_profile` / `qd_organize` / `qd_kb_list`）
- **OpenAI 兼容网关**：`/v1/models` · `/v1/chat/completions`（厚网关：画像+检索 → 上游 LLM → **强制自动沉淀**）；Key 默认 `qdagent-local`
- **知识平面**：`data/runs`（审计）+ `data/kb/concepts`（整理后）+ catalog/view；无默认向量 RAG
- 缺口状态见 [doc/gaps/01-marqdo-hard-limits.md](doc/gaps/01-marqdo-hard-limits.md) · [02-marqdo-parser-and-runtime.md](doc/gaps/02-marqdo-parser-and-runtime.md)

> **运行时**：请使用官方 **1.3.0+**。Web 面为 Document / Endpoint / Resource（`serve.mq.md` + `pages/build` + `ext/data` · `ext/security`）；禁止 `compose_*` / `app.configure` 降级。

## 本机快速开始

```bash
# 需要 marqdo 1.3.0+ 与 ~/.marqdo/ext（web + agent + data/security）
marqdo --version   # 期望 1.3.0+

chmod +x scripts/mq.sh
./scripts/mq.sh run serve.mq.md
# → http://127.0.0.1:7431
# （`./scripts/mq.sh run index.mq.md` 仍可用，会转到 serve.boot）
```

演示账号：**demo / demo**。大模型设置保存后，若改了 Base URL，请重启进程。

外部把求道当模型（Cursor / Continue）：

```text
BASE_URL=http://127.0.0.1:7431/v1
API_KEY=qdagent-local   # 或环境变量 QDAGENT_API_KEY
MODEL=qdagent
```

```bash
curl -s http://127.0.0.1:7431/v1/models -H "Authorization: Bearer qdagent-local"
```

`./scripts/mq.sh` 会默认拉起旁路网关 `:7433` 并经 Marqdo 代理挂到同端口 `/v1`。

```bash
./scripts/mq.sh run 求道-捕捉.mq.md
./scripts/mq.sh run 求道-询问.mq.md   # 画像 + 检索后询问
./scripts/mq.sh run 求道-整理.mq.md   # OKF 智能整理（晋升 concepts）
./scripts/mq.sh run 求道-mcp.mq.md   # Cursor MCP stdio
./scripts/mq.sh view data/runs --port 7429 --no-open
```

## Docker

```bash
cp .env.example .env
bash scripts/pack-marqdo.sh
docker compose up --build
```

## 入口

| 文件 | 作用 |
|------|------|
| `serve.mq.md` | Gateway：Document 页 + invoke API + proxy/auth（推荐入口） |
| `index.mq.md` | 兼容入口 → `serve.boot` |
| `pages/build.mq.md` | 各 Document 页面装配（无 compose_*） |
| `pages/content.mq.md` | 设置/笔记等 Markdown 正文（代码即文档） |
| `api/*.mq.md` | 声明式 Endpoint 文档（health / store-run） |
| `lib/site.mq.md` | auth / form / proxy·invoke / page chrome / Markdown 渲染 |
| `lib/api.mq.md` | `/api/store/*` 与 MCP 共用实现（GFM 应答表） |
| `求道-捕捉.mq.md` | CLI 无 LLM 沉淀 |
| `求道-询问.mq.md` | CLI：画像 + 检索后询问并沉淀 |
| `求道-整理.mq.md` | CLI：OKF 智能整理 → `data/kb/concepts` |
| `求道-同步.mq.md` | 库 → `data/runs/*.mq.md` |
| `求道-mcp.mq.md` | MCP stdio |

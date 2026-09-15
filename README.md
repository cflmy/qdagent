# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **≥ 1.0.0**（markup **v0.3**：`**代码**` / `*返回*`）的文档驱动智能体助手（**求道**）。实现语言是 **Marqdo（`.mq.md`）**。

- **登录后使用**：打开站点先登录
- **同域 LLM 代理**：`/llm` SSE（无需 Python :7432）
- **记忆闭环**：回答前检索笔记 + `data/kb/用户画像.mq.md`；智能整理 → `data/kb/concepts`（OKF）
- **沉淀 API**：`/api/store/*` → `lib/api`（`app.invoke`）
- **MCP**：`marqdo run 求道-mcp.mq.md`（含 `qd_context` / `qd_profile` / `qd_organize` / `qd_kb_list`）
- **知识平面**：`data/runs`（审计）+ `data/kb/concepts`（整理后）+ catalog/view；无默认向量 RAG
- 缺口状态见 [doc/gaps/01-marqdo-hard-limits.md](doc/gaps/01-marqdo-hard-limits.md) · [02-marqdo-parser-and-runtime.md](doc/gaps/02-marqdo-parser-and-runtime.md)

> **运行时**：请使用官方 **1.0.0+**（Go `libweb` 默认）。旧 0.3.x 的 `*语句*` / `**返回**` 语法已废弃；本仓已迁到 v0.3 标记，并用 `[键](集合)` 取元。

## 本机快速开始

```bash
# 需要 marqdo 1.0.0+ 与 ~/.marqdo/ext（web + agent）
marqdo --version   # 期望 1.0.0+

chmod +x scripts/mq.sh
./scripts/mq.sh run index.mq.md
# → http://127.0.0.1:7431
```

演示账号：**demo / demo**。大模型设置保存后，若改了 Base URL，请重启进程。

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
| `index.mq.md` | Web：登录 · 对话 · 笔记 · 记忆 · 设置 |
| `求道-捕捉.mq.md` | CLI 无 LLM 沉淀 |
| `求道-询问.mq.md` | CLI：画像 + 检索后询问并沉淀 |
| `求道-整理.mq.md` | CLI：OKF 智能整理 → `data/kb/concepts` |
| `求道-同步.mq.md` | 库 → `data/runs/*.mq.md` |
| `求道-mcp.mq.md` | MCP stdio |

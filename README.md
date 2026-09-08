# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **≥ 0.3.7** 的文档驱动智能体助手（**求道**）。实现语言是 **Marqdo（`.mq.md`）**。

- **登录后使用**：打开站点先登录
- **同域 LLM 代理**：`/llm` SSE（无需 Python :7432）
- **沉淀 API**：`/api/store/*` → `lib/api`（`app.invoke`）
- **MCP**：`marqdo run 求道-mcp.mq.md`（`agent.mcp_server`）
- **知识平面**：`data/runs/*.mq.md` + catalog/view；无默认向量 RAG
- 缺口状态见 [doc/gaps/01-marqdo-hard-limits.md](doc/gaps/01-marqdo-hard-limits.md)（0.3.7 已关闭 GAP-01…05）

> **运行时注意**：上游 0.3.7 需补丁「嵌套 `call_registered` 后恢复 `GLOBAL_HOST`」，否则 listen 多轮 invoke 会 `no active host context`。本机 `~/.local/bin/marqdo` 已用该补丁重建。

## 本机快速开始

```bash
# 需要 marqdo 0.3.7+ 与 ~/.marqdo/ext（web + agent）
marqdo --version   # 期望 0.3.7+

chmod +x scripts/mq.sh
./scripts/mq.sh run index.mq.md
# → http://127.0.0.1:7431
```

演示账号：**demo / demo**。大模型设置保存后，若改了 Base URL，请重启进程。

```bash
./scripts/mq.sh run 求道-捕捉.mq.md
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
| `index.mq.md` | Web：登录 · 对话 · 笔记 · 设置 |
| `求道-捕捉.mq.md` | CLI 无 LLM 沉淀 |
| `求道-询问.mq.md` | CLI agent 询问 + 沉淀 |
| `求道-同步.mq.md` | 库 → `data/runs/*.mq.md` |

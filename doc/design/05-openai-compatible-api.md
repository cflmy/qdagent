# 对外 OpenAI 兼容 API

| | |
|---|---|
| 状态 | **MVP 已实现**（厚网关 + 强制审计） |
| 日期 | 2026-09-07（2026-09-15 落地） |
| 目标 | 让 Cursor / Continue / Open WebUI / 自研客户端把 qdagent 当成「一个模型」 |
| 姊妹轨 | **MCP**（编辑器自带模型 + 求道沉淀）见 [07-notes-ui-and-mcp.md](07-notes-ui-and-mcp.md) |
| 实现 | `scripts/legacy/openai_v1_gateway.py` + Marqdo `/v1` 代理（见 GAP-13） |

---

## 0. 动机

Hermes 用 ACP 接编辑器；业界更普适的最短路径之一是：

**实现 OpenAI `base_url` 兼容的 HTTP API**。

另一条同等重要的路径是 **MCP**（不换编辑器模型、只接知识与写回）。两条轨互补，不是互相替代。

用户在编辑器中设置：

```text
BASE_URL=http://127.0.0.1:7431/v1
API_KEY=qdagent-local
MODEL=qdagent
```

即可把编码助手流量导入本机智能体，同时 **强制审计沉淀**。

---

## 1. 已实现端点（MVP）

| 端点 | 用途 |
|------|------|
| `GET /v1/models` | `qdagent` / `qdagent-fast` |
| `POST /v1/chat/completions` | 对话；支持 `stream: true`（SSE） |
| `GET` 旁路 `/health` | 网关探活（`:7433`） |

旁路默认 `127.0.0.1:7433`，由 `./scripts/mq.sh` 拉起；Marqdo 将 `/v1/*` 代理到该进程（去前缀 `/v1`）。

### 厚网关行为

1. Bearer 鉴权（`QDAGENT_API_KEY`，默认 `qdagent-local`）
2. 注入用户画像 + runs 关键词检索证据
3. 转发 settings 上游 LLM（`model=qdagent` → 上游真实模型名）
4. **每次调用自动**写 `data/runs/api-*.mq.md` + sqlite + kb git
5. 响应头 `X-QDAgent-Run-Id`；`tools` 原样透传上游

---

## 2. `chat.completions` 语义映射

| OpenAI 字段 | qdagent 行为 |
|-------------|--------------|
| `messages` | 写入 Run；最后一条 user 为任务；历史截断后注入 |
| `model` | `qdagent*` → settings `llm_model`；其它原样传上游 |
| `tools` / `tool_choice` | 透传上游（网关侧不执行本地 tool） |
| `stream` | SSE 透传；缓冲完整 assistant 后 finalize |
| `temperature` 等 | 传给底层 LLM |

---

## 3. 与「真 OpenAI」的差异

| 点 | 说明 |
|----|------|
| 副作用 | 每次调用落盘 `.mq.md` |
| 增强 | 注入画像与笔记证据 |
| 延迟 | 含编排与写回，可能高于直连模型 |
| 鉴权 | 本地 key；勿裸奔公网 |

---

## 4. 验收

```bash
curl http://127.0.0.1:7431/v1/models \
  -H "Authorization: Bearer qdagent-local"

curl http://127.0.0.1:7431/v1/chat/completions \
  -H "Authorization: Bearer qdagent-local" \
  -H "Content-Type: application/json" \
  -d '{"model":"qdagent","messages":[{"role":"user","content":"ping"}]}'
```

其后 `data/runs/api-*.mq.md` 必须出现，且响应含 `X-QDAgent-Run-Id`。

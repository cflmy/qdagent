# 对外 OpenAI 兼容 API

| | |
|---|---|
| 状态 | 设计草案 |
| 日期 | 2026-09-07 |
| 目标 | 让 Cursor / Continue / Open WebUI / 自研客户端把 qdagent 当成「一个模型」 |
| 姊妹轨 | **MCP**（编辑器自带模型 + 求道沉淀）见 [07-notes-ui-and-mcp.md](07-notes-ui-and-mcp.md) |

---

## 0. 动机

Hermes 用 ACP 接编辑器；业界更普适的最短路径之一是：

**实现 OpenAI `base_url` 兼容的 HTTP API**。

另一条同等重要的路径是 **MCP**（不换编辑器模型、只接知识与写回）。两条轨互补，不是互相替代。

用户在编辑器中设置：

```text
BASE_URL=http://127.0.0.1:7431/v1
API_KEY=qdagent-local-xxx
MODEL=qdagent
```

即可把编码助手流量导入本机智能体，同时 **强制审计沉淀**。

---

## 1. 必做端点（MVP）

| 端点 | 用途 |
|------|------|
| `GET /v1/models` | 列出逻辑模型（助手配置） |
| `POST /v1/chat/completions` | 对话；支持 `stream: true`（SSE） |
| `GET /health` | 探活 |

### 建议同期

| 端点 | 用途 |
|------|------|
| `POST /v1/audio/transcriptions` | 代理到 ASR Provider |
| `POST /v1/audio/speech` | 代理到 TTS Provider |

---

## 2. `chat.completions` 语义映射

| OpenAI 字段 | qdagent 行为 |
|-------------|--------------|
| `messages` | 写入 Run；最后一条 user 为任务；历史注入上下文切片 |
| `model` | 映射到 assistant 或底层 provider 模型 |
| `tools` / `tool_choice` | 映射到 runbook 工具表白名单（名称对齐 function calling） |
| `stream` | SSE：`data: {"choices":[{"delta":...}]}` |
| `temperature` 等 | 传给底层 LLM |

响应：

- 非流式：标准 `chat.completion` JSON  
- 额外：`id` 使用 `run_id`；header `X-QDAgent-Run-Id`

---

## 3. 与「真 OpenAI」的差异（必须文档化）

| 点 | 说明 |
|----|------|
| 副作用 | 每次调用落盘 `.mq.md` |
| 工具 | 可能执行本地工具（需用户知情） |
| 延迟 | 含编排与写回，可能高于直连模型 |
| 鉴权 | 本地 key；勿裸奔公网 |

---

## 4. 鉴权与安全

1. `Authorization: Bearer <token>` 必填（可配置 localhost 例外）。  
2. 绑定来源 IP / Unix socket 优先。  
3. 工具权限：API 会话默认只读工具集，写文件系统需升级 scope。  
4. 并发与 rate limit，防止编辑器重试打爆。

---

## 5. 流式与写回一致性

```text
client ──SSE──▶ Gateway
                 │
                 ├─ 转发/生成 delta
                 └─ 异步/批量 append 到 run.mq.md
finish ──▶ finalize run（补全结果区）
```

崩溃恢复：未 finalize 的 run 标记 `status: incomplete`，可续跑或丢弃。

---

## 6. 多助手逻辑模型

`GET /v1/models` 示例：

```json
{
  "data": [
    {"id": "qdagent", "owned_by": "local"},
    {"id": "qdagent-code", "owned_by": "local"},
    {"id": "qdagent-fast", "owned_by": "local"}
  ]
}
```

每个 id 对应不同 `soul.mq.md` / 工具集 / 路由。

---

## 7. 实现选项

| 方案 | 优点 | 缺点 |
|------|------|------|
| A. Marqdo `ext/web` 起 HTTP | 同栈 | 需确认流式/SSE 能力 |
| B. 薄宿主（Rust/Go/Node）调 `marqdo` | 协议好控 | 多一层进程 |
| C. 原生 plugin 内嵌服务器 | 性能好 | 开发量大 |

**建议：** MVP 用 B 或 A 快速打通；稳定后沉到 plugin。

---

## 8. 验收

```bash
curl http://127.0.0.1:7431/v1/models \
  -H "Authorization: Bearer $QDAGENT_API_KEY"

curl http://127.0.0.1:7431/v1/chat/completions \
  -H "Authorization: Bearer $QDAGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qdagent","messages":[{"role":"user","content":"ping"}]}'
```

其后 `runs/` 必须出现对应文件。

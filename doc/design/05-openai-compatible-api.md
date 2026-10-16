# 对外 OpenAI 兼容 API

| | |
|---|---|
| 状态 | **瘦 framing（C2a）** — Python 不做 Agent loop；厚路径 → 410 |
| 日期 | 2026-09-07（2026-10-16 C2a 对齐 qdagent 2.0） |
| 目标 | 让 Cursor / Continue / Open WebUI / 自研客户端把 qdagent 当成「一个模型」 |
| 姊妹轨 | **MCP**（编辑器自带模型 + 求道沉淀）见 [07-notes-ui-and-mcp.md](07-notes-ui-and-mcp.md) |
| 实现 | `scripts/legacy/openai_v1_gateway.py`（HTTP only）→ `gateway/v1_chat.mq.md` → `gateway/openai` → `agent/qdagent` |
| 缺口 | [GAP-13](../gaps/01-marqdo-hard-limits.md) **CLOSED**；C2b（Marqdo Endpoint 直吃 `/v1`）未做 |
| 权威设计 | [qdagent-2.0.md](qdagent-2.0.md) · [qdagent-dev-plan-2026-10.md](qdagent-dev-plan-2026-10.md) |

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

即可把编码助手流量导入本机智能体（EFI Preflight → Marqdo Agent）。

---

## 1. 已实现端点

| 端点 | 用途 |
|------|------|
| `GET /v1/models` | `qdagent` / `qdagent-fast` |
| `POST /v1/chat/completions` | 对话；EFI 路径走 Marqdo |
| `GET` 旁路 `/health` | 网关探活（`:7433`） |

旁路默认 `127.0.0.1:7433`，由 `./scripts/mq.sh` 拉起；Marqdo 将 `/v1/*` 代理到该进程（去前缀 `/v1`）。

### 瘦 framing 行为（现行）

1. Bearer 鉴权（`QDAGENT_API_KEY`，默认 `qdagent-local`）
2. 解析 OpenAI JSON → 抽出 user task / mode
3. `marqdo run gateway/v1_chat.mq.md`（`QDAGENT_V1_EFI=1` 默认）
4. 领域：`gateway/openai.precheck` + `agent/qdagent`（eng_preflight / efi）
5. **不做**：Python 侧画像注入、corpus 检索、本地拼 system、厚 Agent loop
6. `QDAGENT_V1_EFI=0` → **410** `thick_path_removed`

回归：`./scripts/check-v1-thin.sh`

---

## 2. `chat.completions` 语义映射

| OpenAI 字段 | qdagent 行为 |
|-------------|--------------|
| `messages` | 最后一条 user 为 task；交 Marqdo Agent |
| `model` | 网关侧标识；上游模型由 settings / env 决定（EFI 内） |
| `stream` | framing 层尽力透传；领域结果来自 Marqdo |
| `tools` | 不在 Python 厚执行；由 Marqdo Agent tools 承担 |

---

## 3. 与「真 OpenAI」的差异

| 点 | 说明 |
|----|------|
| 副作用 | Workbook / Session / 候选经 Marqdo 产品路径落盘 |
| 增强 | Engineering Preflight（EFI）先于回答 |
| 鉴权 | 本地 key；勿裸奔公网 |

---

## 4. 验收

```bash
./scripts/check-v1-thin.sh

curl http://127.0.0.1:7431/v1/models \
  -H "Authorization: Bearer qdagent-local"

curl http://127.0.0.1:7431/v1/chat/completions \
  -H "Authorization: Bearer qdagent-local" \
  -H "Content-Type: application/json" \
  -d '{"model":"qdagent","messages":[{"role":"user","content":"ping"}]}'
```

`QDAGENT_V1_EFI=0` 时同一 POST 必须 410。

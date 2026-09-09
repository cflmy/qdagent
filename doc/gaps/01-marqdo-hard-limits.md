# Marqdo 能力缺口（qdagent）

| | |
|---|---|
| 状态 | **GAP-01…05 已由 Marqdo v0.3.7 关闭** |
| 日期 | 2026-09-07 |
| 运行时 | Marqdo **0.3.7**（H1–H4 宿主集成） |
| 原则 | **能 Marqdo 则 Marqdo**；新增非 Marqdo 脚本必须引用本文并更新状态 |

## 1. 产品原则

求道的实现语言与知识形态是 **Marqdo（`.mq.md`）**。  
旁路脚本仅允许：

1. 文档中仍标注为 **Open** 的缺口，或  
2. `scripts/legacy/` 下的历史兼容（默认关闭）。

## 2. 缺口清单

### GAP-01 · 浏览器 → 上游 LLM 同域流式中继 — **CLOSED**

| | |
|---|---|
| 关闭于 | Marqdo 0.3.7 `app.proxy` / `网页.代理` |
| 求道用法 | `index.mq.md` 装配 `/llm` `/asr` `/tts`；前端 `public/qd-api.js` 同域 SSE |
| 备注 | 上游取自 settings 行（启动时）；改 Base URL 后需重启 listen |

### GAP-02 · HTTP → 用户 `##` — **CLOSED**

| | |
|---|---|
| 关闭于 | Marqdo 0.3.7 `app.invoke` / `网页.调用` |
| 求道用法 | `/api/store/*` → `lib/api.mq.md`（`capture` / `sync` / `search` / `list` / `get_run`） |

### GAP-03 · MCP Server 宿主 — **CLOSED**（stdio）

| | |
|---|---|
| 关闭于 | Marqdo 0.3.7 `agent.mcp_server` + `serve transport=stdio` |
| 求道用法 | `marqdo run 求道-mcp.mq.md`；「MCP 接入」页复制配置 |
| 备注 | HTTP MCP（H4b）仍可选，未接 |

### GAP-04 · 第二监听端口 — **CLOSED**

| | |
|---|---|
| 关闭策略 | proxy + invoke 挂在同一 `listen`（:7431）；不再默认起 :7432 |
| 遗留 | `QDAGENT_LEGACY_PROXY=1` 可开 `scripts/legacy/llm_proxy.py` |

### GAP-05 · 跨模块 `db` / `corpus_search` — **CLOSED**

| | |
|---|---|
| 关闭于 | 0.3.7 方法分发沿导入树；`agent.corpus_search` 自动 ensure_plugin |
| 求道用法 | `lib/api.search` → `agent.corpus_search`（`data/runs`）；CLI 同路径 |
| 备注 | 本机对 0.3.7 打了补丁：`call_registered` 嵌套后**恢复** `GLOBAL_HOST`（勿清空），否则 listen 期间 invoke/`web.db` 会报 `no active host context` |

## 3. 现行架构（对照）

| 能力 | 入口 |
|------|------|
| Web UI | `index.mq.md` |
| LLM/语音同域中继 | `网页.代理` → `/llm` `/asr` `/tts` |
| 沉淀 / 检索 / 画像 / 整理 | `网页.调用` → `lib/api.*` |
| 用户画像 | `data/kb/用户画像.mq.md` · `/settings/memory` |
| MCP stdio | `求道-mcp.mq.md`（含 context/profile/organize） |
| CLI 捕捉 / 询问 / 整理 | `求道-捕捉` · `求道-询问` · `求道-整理` |

## 4. 非目标

- 默认 dense embedding / 向量知识库  
- Python 编排或知识权威平面  
- 静默改写历史 `data/runs/*.mq.md`  

## 5. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-07 | 初版 GAP-01…05（0.3.5 旁路） |
| 2026-09-07 | 升级 0.3.7；H1–H4 关闭 GAP-01…05；Python 迁入 `scripts/legacy/` |
| 2026-09-07 | 修 Marqdo `GLOBAL_HOST` 嵌套清空；`api.search` 改 `corpus_search`；Docker 去掉 :7432 |
| 2026-09-08 | 记忆闭环：画像 · context 查库 · 手动 organize |

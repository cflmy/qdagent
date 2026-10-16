# qdagent 再下一阶段开发计划（Accepted · 全缺口落地）

| | |
|---|---|
| 状态 | **Accepted — 全缺口落地中/已交付 · 禁止降级 · 标准方案**（**禁止**改写 `doc/next/*`） |
| 日期 | 2026-10-16 |
| 审阅决议 | 缺口全部开发；体验拉满；低成本替代改为最标准实现；C2b/Async/HTTP MCP 走 Marqdo 正途 |
| 前置 | [qdagent-dev-plan-2026-10.md](qdagent-dev-plan-2026-10.md) Wave A–D + §47 hub / Session Today **已落地并推送** |
| 基线 | Marqdo **CLI≥1.4.4 · Ext≥1.4.4**；设计 [qdagent-2.0.md](qdagent-2.0.md) Phase 0–15 Accepted |
| 计划源 | `doc/next/001.md` · `doc/next/002.md`（只读真相源） |
| 原则 | Marqdo = 唯一 Agent Runtime / EKC；求道 = Engineering Product；本仓自 dogfood |

---

## 0. 一句话

**A–D 把「能 dogfood 的工程闭环」做实了**；本阶段把 partial 缺口补成可验收产品面，并完成 **C2b**、**Async BUILD**、**HTTP MCP（H4b）**、**Policy 产品化**、**CI 装 Marqdo**。不再开第二套 Agent / EKC。

---

## 1. DoD 验收（本阶段）

| ID | 验收项 | 状态 |
|----|--------|------|
| N1 | Chat/Eng Session id 统一（`public/session.js` · `qdagent.sessions.v1`） | **done** |
| N2 | Eng Hub「最近任务」表（`#qd-eng-tasks` ← workbooks） | **done** |
| N3 | Workbook Task/Plan/Evidence/Metrics 分区可读（`#qd-eng-wb-sections`） | **done** |
| N4 | Live ASK+BUILD `mode=live`（上游可达时） | **partial**（直连 `/chat/completions` 可 200；Agent EFI 长上下文偶发上游 524 → soft `mode=error`；footnote 硬崩已修；编排 OK） |
| N5 | C2b：`/v1` Marqdo invoke，不依赖 Python framing | **done** |
| N6 | Async BUILD：立即返回 slug + UI 轮询 | **done** |
| F2 | Capability Used By（edges reverse） | **done** |
| F3 | CI 安装 Marqdo | **done**（workflow Release 资产） |
| G8 | L6 Policy → Preflight 匹配 + Hub Policies | **done** |
| G10 | Streamable HTTP MCP（Marqdo plugin） | **done** |

---

## 2. 相对 `doc/next` 的缺口（原表 → 落地）

| ID | 主题 | 落地 |
|----|------|------|
| G1 | §47 Tasks 看板 | Hub `#qd-eng-tasks` |
| G2 | Workbook 分区 UI | `#qd-eng-wb-sections` |
| G3 | Capability Used By | `knowledge/resolver.used_by` |
| G4 | Chat ↔ Session 统一 | `public/session.js` |
| G5 | §80 C2b | `api.v1_*` + serve 路由；`QDAGENT_V1_PYTHON=1` 应急 |
| G6 | Async BUILD | `build_start` + `cli/求道-构建-继续` orphan |
| G7 | Live 闭环补录 | 上游可达时重跑；附录记 524 |
| G8 | Policy 编译器产品化 | `knowledge/policy.mq.md` match → Preflight |
| G9 | CI 装 Marqdo | `.github/workflows/knowledge-gate.yml` |
| G10 | HTTP MCP | Marqdo `agent_mcp_serve` transport=http |

---

## 3. 非目标（仍冻结）

- 改写 / 整理 `doc/next/*`
- 第二套 Agent loop / 第二套 EKC / 向量权威
- 恢复 `compose_*` / 厚 Python Agent
- 用 Python 假扮 HTTP MCP
- 发明新 DSL / 新表方言

---

## 4. 关键路径（增量）

```text
public/session.js · public/eng.js · public/mcp.js · public/chat.js
agent/qdagent.mq.md          # build_start / build_finish
cli/求道-构建-继续.mq.md
cli/求道-mcp.mq.md           # QDAGENT_MCP_TRANSPORT=http
knowledge/policy.mq.md · knowledge/resolver.mq.md (used_by)
knowledge/context.mq.md      # policies in preflight
lib/api.mq.md                # eng_build async · v1_* · eng_policies
serve.mq.md                  # /v1 invoke
scripts/mq.sh · check-v1-thin.sh · ci-knowledge-gate.sh
.github/workflows/knowledge-gate.yml
# Marqdo
plugins/agent/src/mcp_server.rs   # Streamable HTTP
ext/ai/agent.mq.md                # serve host/port/path
```

**上一计划：** [qdagent-dev-plan-2026-10.md](qdagent-dev-plan-2026-10.md)  
**设计真相：** [qdagent-2.0.md](qdagent-2.0.md)  
**只读计划源：** `doc/next/001.md` · `doc/next/002.md`

# qdagent 下一阶段开发计划（审阅稿）

| | |
|---|---|
| 状态 | **Accepted** · Wave A–C **done**（D 可后置；**禁止**改写 `doc/next/*`） |
| 日期 | 2026-10-16 |
| 基线 | Marqdo **CLI≥1.4.4 · Ext≥1.4.4**；设计 [qdagent-2.0.md](qdagent-2.0.md) Phase 0–15 **Accepted** |
| 计划源 | `doc/next/001.md` · `doc/next/002.md`（只读真相源） |
| 原则 | Marqdo = 唯一 Agent Runtime / EKC；求道 = Engineering Product；本仓自 dogfood |

---

## 0. 一句话

**内核已齐（Preflight → BUILD → Workbook → Verify → Promote → EKC）**；下一阶段不是再造 Agent，而是把 **doc/next 里的工程 UX 与可重复 dogfood** 做实，并收掉旁路（Python `/v1` 残留、OKF organize 主路径混淆）。

---

## 1. 现状结论（审阅基线）

### 1.1 已交付（勿回退）

| 层 | 现状 |
|----|------|
| Runtime | `agent/qdagent` ASK/BUILD/LEARN · `efi=True` · CREATE `sandbox=` · quarantine · soft `mode=error` |
| Knowledge | product Preflight · latch · promote/reject · `knowledge/*` L4 样例 |
| Execution | Workbook 分区 · verify · metrics（读 Marqdo KPI） |
| Surfaces | CLI `cli/求道-*` · MCP stdio · Web `/eng/*` + `/api/eng/*` · 厚 `/v1` → 410 |
| 依赖 | `scripts/marqdo-env.sh` 双门闩 ≥1.4.4 |

### 1.2 相对 `doc/next` 的主要缺口

| 主题（doc/next） | 缺口 |
|------------------|------|
| §48 Engineering Today | `/` 已是预检，但不是「活跃任务 / 能力计数 / 近期事件」仪表 |
| §49 Run 页面 | 无 Workbook 列表/详情渲染（仅文案 + JSON 按钮） |
| §50 Capability 页面 | 无 EKC 图驱动的 Implemented By / Used By / Constraints 详情 |
| §47 UI 中心 | 无 Tasks / Conflicts / Verification 枢纽 |
| §28 Session vs Run | Chat 靠 localStorage；`data/sessions/` 未做成服务端 Session |
| §80 OpenAI | 领域已走 Marqdo；**HTTP 仍由** `scripts/legacy/openai_v1_gateway.py` 转发 |
| GAP-13 文档 | 与「厚路径已移除」表述漂移，需改 gaps 状态（非实现） |
| CLI/MCP 图操作 | 缺独立 `impact` / `conflicts` / `stale` / `duplicate` 薄封装（verify 已捆） |
| Policy / Execution Compiler | 仅有零散 `policies/` · `skills/`，未产品化 |
| Live dogfood | dry + 不可达上游已验；**真实 Key 闭环未系统验收** |

### 1.3 非目标（本计划不做）

- 第二套 Agent loop / 第二套 EKC / 向量权威真相  
- 改写或「整理」`doc/next/*`  
- 恢复 `compose_*` / 厚 Python Agent  
- 为对齐而发明新 DSL / 新表方言（设计沉默处先问）

---

## 2. 目标与成功标准

### 2.1 产品目标

在本仓自 dogfood：对任务「给 OpenAI `/v1` 增加工程预检再调上游」能 **不靠 CLI 也能完成**  
Preflight → BUILD → 打开 Workbook → Verify → Promote → `qdagent knowledge` → 下一次 Preflight 看见新知识。

### 2.2 验收清单（Definition of Done）

| ID | 验收项 |
|----|--------|
| D1 | Web：一键 BUILD → 返回 workbook slug → `/eng/run` 可打开详情 |
| D2 | Workbook 列表 + 分区只读渲染（Task / Plan / Evidence / Metrics 至少） |
| D3 | Promote/Reject 在 UI 走通并刷新 candidates |
| D4 | 首页「Engineering Today」：最近 N 本 workbook · KPI 条 · candidates 计数 |
| D5 | Capability 只读详情：`find`/catalog 驱动 Implemented By + constraints |
| D6 | CLI：`qdagent impact|conflicts|stale|duplicate` 薄封装（调 Marqdo） |
| D7 | MCP：上述图操作有对应 tool（或明确并入 `qd_verify` 的文档契约） |
| D8 | GAP-13 / `doc/README` / 过时 roadmap 与 2.0 对齐（文档） |
| D9 | Live：真实 LLM Key 跑 1 次 ASK + 1 次 ADAPT BUILD（可人工确认） |
| D10 | Session：服务端 `data/sessions/<id>.mq.md` 至少记下关联 workbook/run slug |

---

## 3. 工作流与优先级

分 **四波**。波次可串行；波内任务可并行。每波结束跑：`QDAGENT_DRY=1` 预检/构建 +（有 Key 时）live 冒烟。

```text
Wave A  Dogfood 可见性（UI + BUILD API）     ← 最高优先
Wave B  知识图表面（Capability + CLI/MCP）
Wave C  Session / Gateway 收口
Wave D  编译器与质量（Policy · CI · live）
```

---

## 4. Wave A — Dogfood 可见性（建议 1–2 周量级）

### A1 · `/api/eng/build` + 预检页「执行 BUILD」

| | |
|---|---|
| 为何 | 当前 BUILD **仅 CLI**；Web dogfood 断在预检 |
| 做 | `lib/api.mq.md` 增 `eng_build`；`serve` 路由；`public/eng.js` 按钮；默认任务=设计 §8 |
| 不做 | 在 Python 里跑 Agent |
| 验收 | D1 |
| 风险 | 长任务阻塞 HTTP → 先同步返回 slug，状态 `executing`/`completed`（已有 workbook status） |

### A2 · Workbook 浏览器（§49 最小可用）

| | |
|---|---|
| 为何 | 无证据面则 Promote 不可信 |
| 做 | 列表 `data/workbooks/wb-*.mq.md`；详情按 section 渲染或 `marqdo view` 同源摘要 API |
| 验收 | D2 |
| 风险 | 大文件 → 分页 / 只读前 N 段 |

### A3 · Candidates UI 闭环强化

| | |
|---|---|
| 为何 | Phase 13 已有壳；需与 A1/A2 联通 |
| 做 | BUILD 成功后深链到 candidates；promote 后提示 `qdagent knowledge` |
| 验收 | D3 |

### A4 · Engineering Today 条（§48 最小）

| | |
|---|---|
| 为何 | 首页仍偏「工具页」而非工程态势 |
| 做 | `/` 或 `/eng/preflight` 顶栏：最近 workbook · `eng_metrics` · candidates count；Chat **不**占首屏中心 |
| 验收 | D4 |

**Wave A 退出标准：** 评审人只开浏览器即可完成一次「预检 → BUILD → 看 workbook → 看候选」dry 路径。

---

## 5. Wave B — 知识图表面

### B1 · Capability 详情页（§50 v1）

| | |
|---|---|
| 做 | `/eng/capability/:id` 或 query；后端读 EKC catalog / `marqdo find`；展示 Implemented By · constraints · failures |
| 验收 | D5 |
| 红线 | 不重造图；只读 Marqdo 产物 |

### B2 · CLI 图操作薄封装

| | |
|---|---|
| 做 | `qdagent impact|conflicts|stale|duplicate` → `marqdo …`；help 更新 |
| 验收 | D6 |

### B3 · MCP 对齐

| | |
|---|---|
| 做 | 增加 tool 或文档写明「verify 已含」；Cursor dogfood 用同一套 |
| 验收 | D7 |

---

## 6. Wave C — Session / Gateway 收口

### C1 · Session ↔ Run（§28）

| | |
|---|---|
| 做 | `data/sessions/<id>.mq.md`：创建时间 · surface · workbook_slug · run_id`；chat / BUILD 写入 |
| 不做 | 第二套记忆权威；Personal Memory 仍独立 |
| 验收 | D10 |

### C2 · `/v1` 传输瘦身或 Endpoint 化（§80）

| | |
|---|---|
| 选项 | **C2a** 文档+测试钉死「Python 仅 framing」；**C2b**（更大）Marqdo Endpoint 直接吃 `/v1` |
| 建议 | 先 C2a + 更新 GAP-13；C2b 单独立项，需你确认工作量 |
| 验收 | gaps 与 README 一致；无厚路径回归 |

### C3 · 文档对齐（非 doc/next）

| | |
|---|---|
| 做 | `doc/README.md`、过时 `doc/roadmap/07-*` 加「以 qdagent-2.0 为准」横幅；GAP-13 状态修正 |
| 验收 | D8 |

---

## 7. Wave D — 质量与编译器（可后置）

| ID | 项 | 说明 |
|----|----|------|
| D-a | Live dogfood | 真实 Key：ASK + ADAPT BUILD；记录 workbook slug 到本计划附录 |
| D-b | Policy 产品化 | 路由/门禁 policy 从 candidate → authored L4 + preflight 引用 |
| D-c | CI knowledge gates | 可选：PR 上跑 `verify` / `duplicate`（依赖 CI 环境 Marqdo） |
| D-d | HTTP MCP | gaps 标注「可选未接」；不强行做 |

---

## 8. 实施约定

1. **先问后发明**：View 表 / API 形状若设计沉默 → 停问你。  
2. **表优先**：新 `.mq.md` 禁止 `json.set` 建 map（跟 Marqdo marqdo-dev）。  
3. **框架问题**：发现 Marqdo 硬缺陷 → **停**、报告、问下一步（与既有约定一致）。  
4. **提交**：按你的指示再 commit/push；本计划文件本身可随 Wave 更新状态列。  
5. **不改** `doc/next/*`。

---

## 9. 建议默认范围（请勾选）

请审阅后回复例如：`通过 A+B` / `通过 A only` / `修改：…`。

| 选项 | 含义 |
|------|------|
| **A** | Wave A 全部（BUILD API · Workbook · Candidates · Today 条） |
| **A+B** | A + Capability + CLI/MCP 图操作 |
| **A+B+C2a** | 再加 Session 骨架 + GAP 文档收口（不含 Endpoint 重写） |
| **全波** | A–D（含 live、Policy；C2b 仍单独确认） |

---

## 10. 开放问题（请一并批注）

1. Web BUILD 是否允许 **同步长阻塞**（先简单），还是必须 **异步 job**？  
2. `/v1`：**维持 Python framing（C2a）** 还是排期 **Marqdo Endpoint（C2b）**？  
3. Chat 导航：保留二级入口，还是进一步降级到「笔记/设置」下？  
4. Live dogfood 的 API Key：本机 `.env` / settings DB，还是你指定环境？

---

## 11. 附录 — 本仓关键路径

```text
agent/qdagent.mq.md          # ASK/BUILD/LEARN
agent/preflight.mq.md
execution/{run,verify,record,promote}.mq.md
gateway/{openai,mcp,v1_chat}.mq.md
lib/api.mq.md                # HTTP + eng_*
serve.mq.md / pages/* / public/eng.js
cli/求道-*.mq.md
scripts/qdagent · marqdo-env.sh
```

**计划源（只读）：** `doc/next/001.md` · `doc/next/002.md`  
**已接受设计：** `doc/design/qdagent-2.0.md`

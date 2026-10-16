# qdagent 再下一阶段开发计划（审阅稿）

| | |
|---|---|
| 状态 | **Draft — 待审阅**（**通过前禁止实施**；**禁止**改写 `doc/next/*`） |
| 日期 | 2026-10-16 |
| 前置 | [qdagent-dev-plan-2026-10.md](qdagent-dev-plan-2026-10.md) Wave A–D + §47 hub / Session Today **已落地并推送** |
| 基线 | Marqdo **CLI≥1.4.4 · Ext≥1.4.4**；设计 [qdagent-2.0.md](qdagent-2.0.md) Phase 0–15 Accepted |
| 计划源 | `doc/next/001.md` · `doc/next/002.md`（只读真相源） |
| 原则 | Marqdo = 唯一 Agent Runtime / EKC；求道 = Engineering Product；本仓自 dogfood |

---

## 0. 一句话

**A–D 把「能 dogfood 的工程闭环」做实了**；下一阶段只做三件事里你点名的子集：  
**(1) 把 partial 缺口补成可验收产品面** · **(2) 可选 C2b 去 Python framing** · **(3) 可达上游上的 live 闭环补录**。  
不再开第二套 Agent / EKC。

---

## 1. 已冻结基线（勿回退）

| 层 | 已交付 |
|----|--------|
| Dogfood Web | Preflight · BUILD · Today · Workbook · Candidates · Capability · Eng Hub（verify/conflicts/stale/duplicate） |
| Session | `data/sessions/*.mq.md`；ASK/BUILD/capture 写入；Web BUILD 带 `session_id` |
| Graph CLI/MCP | `impact\|conflicts\|stale\|duplicate` + `qd_*`；`qd_verify` 仍捆 exit-code 套件 |
| `/v1` | **C2a**：Python 仅 framing；厚路径 410；`check-v1-thin.sh`；GAP-13 CLOSED |
| Policy | `policies/openai-gateway-efi` stable + L4 constraint；CI `ci-knowledge-gate` |
| Live | Key/路径已通；本机上游 **HTTP 524** → soft `mode=error`（附录已记） |

**验收对照（上一计划 DoD）：** D1–D8、D10 已满足最小版；D9 **partial**（编排 OK，上游超时）。

---

## 2. 相对 `doc/next` 的剩余缺口（本计划范围）

| ID | 主题 | 现状 | 建议优先级 |
|----|------|------|------------|
| G1 | §47 Tasks 看板 | Hub 有图操作，无「活跃任务 / 冲突列表」产品视图 | P1 |
| G2 | Workbook 分区 UI | 现为 JSON 摘要；非分区卡片/只读 Markdown | P2 |
| G3 | Capability Used By | 有 Implemented By / constraints / failures；缺 Used By 边 | P2 |
| G4 | Chat ↔ Session 统一 | Chat `s-*` localStorage 与服务端 `sess-*` / `s-eng-*` 并存 | P1 |
| G5 | §80 C2b | Endpoint 直吃 `/v1`（去掉 Python framing 进程） | **P0 若你选 C2b**；否则不做 |
| G6 | Async BUILD | Web BUILD 同步长阻塞 | P1（体验）或 P2 |
| G7 | Live 闭环补录 | 换可达 Base URL / Key 后 ASK+BUILD 成功回填附录 | P0（质量） |
| G8 | Policy 编译器 | 仅 EFI 一例；无通用 L6→preflight 产品化 | P3（可后置） |
| G9 | CI 装 Marqdo | workflow 有 thin-v1；knowledge job 在无 CLI 时 skip | P2 |
| G10 | HTTP MCP | 已标注可选未接 | **不做**（除非你改口） |

---

## 3. 目标与成功标准（下一阶段 DoD）

| ID | 验收项 | 依赖你的选择 |
|----|--------|--------------|
| N1 | Chat 当前会话 id **同一套**写入 `data/sessions/<id>.mq.md`（BUILD/capture/ask 可追踪） | 选 Wave E |
| N2 | Eng Hub 或 `/eng/run` 可见「最近任务」表（来自 workbooks/sessions，非第二真相） | 选 Wave E |
| N3 | Workbook 详情至少 Task/Plan/Evidence/Metrics **分区可读**（非整坨 JSON） | 选 Wave E 或 F |
| N4 | Live：可达上游下 ASK + ADAPT BUILD 各 1 次 `mode=live`，附录回填 | 选 Wave L（可与 E 并行） |
| N5 | C2b：`POST /v1/chat/completions` **不依赖** `openai_v1_gateway.py` 进程（或明确仍保留 framing） | **仅当选 C2b** |
| N6 | 异步 BUILD：提交后立即返回 job/workbook slug，UI 可轮询 status | 选 Wave F |

---

## 4. 工作流分波（请勾选范围）

```text
Wave E   产品面收口（Session 统一 · Tasks 条 · Workbook 分区）   ← 默认建议
Wave F   体验加固（Async BUILD · Capability Used By · CI 装 Marqdo）
Wave L   Live 补录（可达上游；可随时插入，不挡 E）
Wave C2b /v1 Endpoint 化（大；单独确认工作量与风险）
```

### 4.1 Wave E — 产品面收口（建议 1 周量级）

#### E1 · Session id 统一（G4）

| | |
|---|---|
| 为何 | 现 `s-*`（chat）/ `sess-*`（服务端生成）/ `s-eng-*`（eng.js）三套，审计难追 |
| 做 | 约定：**客户端可提出 id，服务端 `session.link` 原样采用**（已支持）；eng.js 与 chat.js **共用同一 localStorage key 或互相读写**；BUILD/capture 一律带当前 id |
| 不做 | 第二套记忆库；不强迫迁移历史 localStorage |
| 验收 | N1：同一次浏览器会话，chat 沉淀与 eng BUILD 写入**同一** `data/sessions/<id>.mq.md` |
| 风险 | id 字符集 / 路径安全 → 只允许 `[A-Za-z0-9._-]+` |

#### E2 · Tasks 条（G1，§47 最小）

| | |
|---|---|
| 为何 | Hub 能跑图操作，但「我在做什么」仍散落 |
| 做 | Today 或 Hub 下增加「最近任务」：来自 `eng_run.list` + `eng_sessions`（已有 API）；列 slug · status · task · session |
| 不做 | 独立 Tasks DB、看板拖拽、第二日历 |
| 验收 | N2 |
| 风险 | 无 |

#### E3 · Workbook 分区渲染（G2）

| | |
|---|---|
| 为何 | 证据面要给人读，不是给调试 JSON |
| 做 | `/eng/run` 详情：按 `sections` 键渲染 `<section><h3>…</h3><pre/或 markdown>`；优先 Task · Decision · Plan · Evidence · Metrics · Verification |
| 不做 | 可编辑 workbook；不发明新表方言 |
| 验收 | N3 |
| 风险 | 大字段 → 默认折叠 / 截断前 N 字 |

**Wave E 退出：** 评审人只开浏览器可完成「预检→BUILD→同 Session 追踪→分区读 workbook→Hub 验图」。

---

### 4.2 Wave F — 体验加固（可选，E 后）

| ID | 项 | 说明 | 验收 |
|----|----|------|------|
| F1 | Async BUILD（G6） | `POST /api/eng/build` 立即返回 slug+`status=executing`；后台续跑或轮询 `workbook` | N6 |
| F2 | Capability Used By（G3） | 只读 `.marqdo/graph` / edges；无边则显式空态 | D5 增强 |
| F3 | CI 安装 Marqdo（G9） | workflow 从 Release/PPA/缓存装 CLI，使 `REQUIRE_MARQDO=1` 可绿 | CI 绿 |
| F4 | Promote 后自动提示 knowledge | UI 已有文案；可选一键 `POST` 触发 compile（若安全） | 体验 |

**F1 风险最高：** 需定 job 模型（进程内 / 子进程 / 仅 workbook status）。设计沉默处 → **停问你**，不擅自上队列中间件。

---

### 4.3 Wave L — Live 补录（可并行）

| | |
|---|---|
| 做 | 你提供可达 `llm_base_url` + key（或修 settings）；重跑 ASK + ADAPT BUILD；附录 B 改 `mode=live` |
| 不做 | 为过 live 放宽 EFI / 厚路径 |
| 验收 | N4 |
| 现状 blocker | 本机 upstream **HTTP 524**（Cloudflare/源站超时），非 qdagent 编排缺陷 |

---

### 4.4 Wave C2b — `/v1` Marqdo Endpoint（大项，默认不做）

| | |
|---|---|
| 目标 | `serve.mq.md`（或 Endpoint）直接处理 `/v1/models` + `/v1/chat/completions`，**不再**依赖 `:7433` Python |
| 保留 | Bearer 鉴权；EFI → `gateway/openai` → `agent/qdagent`；`check-v1-thin` 语义升级为「无 Python framing」 |
| 不做 | 恢复厚 messages 改写 / 画像注入 Python |
| 依赖 | Marqdo Web/Endpoint 对 raw JSON body、流式 SSE 的能力边界 → **开工前先做 1 页能力探针**，不够则停 |
| 工作量（估） | 探测 0.5–1d · 实现 3–7d · 回归（Cursor base_url）1–2d；若缺 SSE/body API 则 **延期** |
| 验收 | N5 + 原 curl / Cursor 配置仍可用 |
| 回退 | 保留 C2a framing 开关 `QDAGENT_V1_PYTHON=1` 应急（需你同意才加） |

---

## 5. 明确非目标

- 改写 / 整理 `doc/next/*`
- 第二套 Agent loop / 第二套 EKC / 向量权威
- 恢复 `compose_*` / 厚 Python Agent
- 强行做 HTTP MCP（G10）
- 为对齐而发明新 DSL / 新表方言（沉默 → 问你）

---

## 6. 实施约定（同前）

1. **先问后发明**  
2. **表优先**（无 `json.set` 建 map）  
3. **框架硬缺陷 → 停**  
4. **只在你指示后 commit/push**  
5. **不改** `doc/next/*`  
6. **本计划通过前不写业务代码**（可写只读探针笔记到 `doc/design/` 若你要求）

---

## 7. 请你勾选（回复示例）

请直接回复例如：

- `通过 E`  
- `通过 E+L`  
- `通过 E+F1`（只要异步 BUILD）  
- `通过 C2b 探测`（先做能力探针，再决定做不做实现）  
- `修改：…`  

| 选项 | 含义 |
|------|------|
| **E** | Session 统一 + Tasks 条 + Workbook 分区（默认建议） |
| **E+L** | E + 你配合可达上游做 live 补录 |
| **E+F** | E + F 全套（含 async，工作量明显上升） |
| **C2b-probe** | 只做 `/v1` Endpoint 能力探针报告，不写产品代码 |
| **C2b-full** | 探针通过后排期实现（需二次确认） |
| **停** | 本阶段不再开发，只维护 |

---

## 8. 开放问题（请一并批注）

1. **Async BUILD（F1）**：可接受「同步阻塞到完成」再拖多久？（现状：dry 秒级；live 可达分钟级）  
2. **C2b**：是否值得为去掉 Python framing 付 3–7d？还是 C2a 长期可接受？  
3. **Session id**：是否强制 chat 与 eng **同一 key**，还是允许「eng 独立、仅深链互通」？  
4. **Live**：上游 Base URL / Key 由你指定，还是继续用本机 settings（先修 524）？  
5. **Workbook 渲染**：纯 `<pre>` 文本，还是允许轻量 Markdown（仍无新 DSL）？

---

## 9. 附录 — 关键路径（增量）

```text
execution/session.mq.md      # link/list/read
public/eng.js                # hub · BUILD session_id · Today
public/chat.js               # localStorage sessions（待与 eng 对齐）
scripts/check-v1-thin.sh
scripts/ci-knowledge-gate.sh
gateway/openai.mq.md · scripts/legacy/openai_v1_gateway.py   # C2a；C2b 时收缩
```

**上一计划：** [qdagent-dev-plan-2026-10.md](qdagent-dev-plan-2026-10.md)  
**设计真相：** [qdagent-2.0.md](qdagent-2.0.md)  
**只读计划源：** `doc/next/001.md` · `doc/next/002.md`

# qdagent 2.0 — Executable Engineering Knowledge Agent

| | |
|---|---|
| 状态 | **Accepted** · 2026-10-16 对齐 Marqdo **1.4.4**（soft LLM transport · table-first agent）· 2026-10-22 升 **2.0.0**（occlusion · labels 棘轮 · Phase 16–18） |
| 日期 | 2026-10-16 |
| 计划源 | `doc/next/001.md` · `doc/next/002.md`（只读，禁止改写） |
| Marqdo | CLI **≥2.0.0** · Ext pack **≥2.0.0**（EKC · Agent EFI · sandbox · quarantine · soft transport · occlusion · access · migrate labels · debt ratchet） |

## 1. 定位

```text
Marqdo  = 可执行知识语言 + EKC + 唯一 Agent Runtime
qdagent = Engineering Product（EFI UX · Session · Gateway · MCP · UI · Personal Memory）
```

一句话：

> **求道，把工程经验编译成可执行的工程知识。**

它不让 AI 每次重新理解代码库，而是让代码库逐渐学会如何被 AI 使用。

## 2. 四真相

| 真相 | 载体 |
|------|------|
| Program | `*.mq.md` |
| Knowledge | EKC / OKF（`.marqdo/**` 为 GENERATED） |
| Execution | Engineering Workbook（`data/workbooks` / runs） |
| Evidence | verify 产物；无 Evidence 不得 Promote |

## 3. 顶层模式

仅 **ASK / BUILD / LEARN**。

宪法协议：

```text
Discover → Reuse → Adapt → Create → Verify → Record → Learn → Compile
```

## 4. 边界

### Marqdo 负责

Language · Runtime · EKC · Agent Runtime · LLM · Skill Compilation · Adaptive Routing · MCP Client primitives · Catalog · Graph · `verify` / `duplicate` / `conflicts` / `stale`

### qdagent 负责

Engineering Product · Session · Auth · Gateway · Notebook UI · OpenAI Surface · MCP Product Surface · Personal Memory · Engineering UX

**禁止**：在 qdagent 重造 EKC / 第二套 Agent loop / 第二套 Knowledge Source。

## 5. 调用契约（Marqdo 不缺能力）

1. 生产路径必须 `eng_preflight=True`（默认 False 仅兼容纯 agent-kb 测试）。
2. 缺 `.marqdo` 知识图时禁止跳过 EFI：先 `marqdo knowledge`。
3. 产品 Preflight 优先 `marqdo knowledge preflight` / `marqdo reuse --preflight`（完整 Context Pack）；进程内门闩用 `agent.preflight`。

## 6. 核心模块

```text
agent/qdagent.mq.md
agent/preflight.mq.md
knowledge/context.mq.md
knowledge/resolver.mq.md
execution/run.mq.md
execution/verify.mq.md
execution/record.mq.md
execution/promote.mq.md
gateway/openai.mq.md
gateway/mcp.mq.md
cli/求道-*.mq.md
```

## 7. 架构红线

1. 这是 Knowledge / Decision / Execution / Verification / Learning 吗？
2. Marqdo 已经提供？→ **调用，不重写**
3. 产生第二真相源？→ **禁止**
4. 无 Preflight 可否 CREATE？→ **禁止**
5. 无 Evidence 可否 Promote？→ **禁止**

## 8. Dogfood

以 **本仓** 为靶标。示例任务：给 OpenAI `/v1` 网关增加工程预检再调上游 —— 应 REUSE/ADAPT 现有 run / api / gateway，Forbidden 再造第二套 Agent loop。

EKC 编译跳过 `docker/` · `data/` · `.cursor/`（Marqdo extract），避免打包树/运行时库污染能力图。

## 9. KPI

`reuse_ratio` · `adapt_ratio` · `novel_ratio` · `duplication_rate` · `reasoning_amortization`

## 10. 实施顺序（相对 `doc/next/002` Phase 0–9）

| Phase | 状态 | 内容 |
|-------|------|------|
| 0–9 | done | Architecture · Preflight · Workbook · BUILD · Verify · Record/Learn · MCP · OpenAI · UI · Skill/Policy |
| **10** | done | CLI 入口收纳 — `求道-*.mq.md` → `cli/` + `MARQDO_FS_ROOT` / `QDAGENT_ROOT` |
| **11** | done | Gateway EFI dogfood — `gateway/openai.precheck` 上游前门闩（ADAPT） |
| **12** | done | Knowledge Candidate → Promote / Reject（`execution/promote` · CLI · MCP） |
| **13** | done | Candidates UI — `/eng/candidates` + `/api/eng/{candidates,promote,reject}` |
| **14** | done | Marqdo **CLI≥1.4.2 · Ext≥1.4.3** — `agent.run efi=True` cold OKF · CREATE `sandbox=` · quarantine · thick `/v1` → 410 · `QDAGENT_DRY` |
| **15** | done | Marqdo **1.4.4** — LLM 传输软失败 → `mode=error` · Ext/CLI 双门闩 ≥1.4.4 · preflight exit-2 JSON |
| **16** | done | Marqdo **2.0.0** — 依赖下限与解析路径升到 2.0.0（`QDAGENT_MARQDO_SRC`，缺省 `/workspace/marqdo`）；自有语料 M7 迁移 occlusion（4 文件 / 58 索引 / 6 循环，工具等价性证明零漂移）；CI 增配 `marqdo check` 全量 + `labels --baseline --fail-on-increase` 债务棘轮；Preflight Context Pack 附带 `pending_labels`（M9 两级检索产品面）；`skills/gateway-efi` 行首数字陷阱修复 |
| **17** | done | 工程债务产品面 — `knowledge/debt.mq.md`（M8 棘轮 `ratchet` + M9 `pending`）；`cli/求道-债务.mq.md` + `qdagent labels`（退出码传播，违约 exit 1）；Web `/eng/preflight` 结构化渲染（决策徽章 · Reuse Gate · EFI facets · 债务块），裸 JSON 收进 `<details>` |
| **18** | done | 设计缺口补齐 — Reasoning Amortization KPI（§85 的跨 Run 仪表盘）；`gateway/auth.mq.md`（鉴权 + §46 追踪头）；负知识种子（AntiPattern ×2 + Pattern ×1，EKC 提取 9 项） |

### 10.1 Phase 16 — Marqdo 2.0.0 对齐（2026-10-22）

**上游 2.0.0 核心**：核心表面无增删（19 构造不变）；遮蔽语法 `[描述](实现)` 按 per-file
`markup: occlusion` 启用；`access`/`取元` 宿主函数（与旧取元逐字等价）；`migrate labels`
迁移工具（改写 → 重解析 → 证明等价 → 才写）；`labels` 两级检索与 `--baseline` 债务棘轮；
`check` 增加 `label.*` 诊断。

**本仓落地**：

| 项 | 内容 |
|----|------|
| 依赖 | `scripts/marqdo-env.sh` 下限 **2.0.0**（CLI + Ext）；解析顺序 `$HOME/work/marqdo` → `$QDAGENT_MARQDO_SRC`（缺省 `/workspace/marqdo`）→ `$HOME/.marqdo` |
| 迁移 | `marqdo migrate labels --write`：`execution/run` · `execution/session` · `knowledge/policy` · `lib/kb_format`（幂等复跑 0 改动；verify / docgate 6/6 零漂移） |
| 门禁 | `scripts/ci-knowledge-gate.sh`：`marqdo check` 逐文件契约（NUL 分隔防 quotePath）+ labels 棘轮（台账 `.marqdo/labels-baseline.json`，只许降不许升） |
| Preflight | `knowledge/policy.pending_labels` → Context Pack `pending_labels` / `pending_label_count`（Agent 能看到"哪些能力还欠着"） |
| 修复 | `skills/gateway-efi.mq.md` 行首数字列表 → 叙述段（陷阱手册 1.1）；EKC 计数 347→315 符号（check 可见性提升后重复符号合并，能力语义不变） |

### 10.2 Phase 17 — 工程债务产品面（2026-10-22）

把 2.0.0 的 labels 能力（M8 棘轮 · M9 两级检索）变成求道跨 CLI + Web 的一致产品面：
**显式 `[待开发]()` 桩即债**，工程师与 Agent 都能看见、CI 只许降不许升。

| 面 | 落地 |
|----|------|
| 模块 | `knowledge/debt.mq.md`（`markup: occlusion`）：`ratchet(root, baseline)` 包装 `marqdo labels --baseline --fail-on-increase` 返回 `{ok, exit_code, baseline, message}`；`pending(root)` 复用同一 `labels --json` 扫描（单一真相源） |
| CLI | `cli/求道-债务.mq.md` + `scripts/qdagent labels\|debt`：先打 pending 列表再跑棘轮，`sys.exit` 传播退出码（违约 exit 1 / 清债 exit 0）；台账默认 `.marqdo/labels-baseline.json`（与 CI 同源，跨机一致） |
| Web | `public/eng.js::renderPreflight`：`/eng/preflight` 结果从裸 JSON dump 升级为结构化面板——决策徽章（REUSE/ADAPT/CREATE）· Reuse Gate（create_allowed · status · 债务计数）· EFI facets（recommended/existing/constraints/decisions/failures/policies）· **工程债务块**（pending rows：`label · file:line [unit] ← words`）；原始 JSON 收进 `<details>` |

红线遵守：CLI 入口只做 env → 调 `knowledge/debt`，不承载逻辑；不重造 labels 词表或第二门禁（Marqdo 拥有）。

### 10.3 Phase 18 — 设计缺口补齐（2026-10-22）

补齐三处"设计了但未实现"的缺口。归属严格按 §4 红线分配：Marqdo 拥有的不重造，qdagent 只补自己负责的面。

#### 18.1 Reasoning Amortization（§85 — 设计权重最高）

设计把 RA 抬到"证明求道有用"的唯一可量化判据（`002 §84–85`：Task 1≈ → Task 100 显著省推理）。缺口：Marqdo 的 `reuse_metrics.json` 只产 reuse/adapt/novel/duplication 四项，**两端都不算 RA**。

| 面 | 落地 |
|----|------|
| 模块 | `knowledge/amortization.mq.md`（`markup: occlusion`）：`classify(task)` 规范化为稳定 kind 键；`weight(decision)` 复用路由器的 needs_llm 语义（REUSE≈0 命中编译知识 / ADAPT≈0.5 / CREATE≈1 全推理）；`record(task,decision)` 首次定基线、后续累积进 `subsequent_sum`；`read` 算 RA = baseline_weight / recent_weight（全摊销时 recent=0 → ra=null，由 amortized_kinds 承载语义） |
| 存储 | `data/amortization.json`（Execution truth，跨 Run 累积，gitignored）——不进 GENERATED 的 `.marqdo/`，因它是运行时观测而非编译产物 |
| 接线 | `agent/qdagent.build_finish`（decision 确定后 record + read 写入 Workbook `ReasoningAmortization` 节）与 `ask`（decision 后 record） |
| KPI 面 | `knowledge/metrics.read` 合并 RA 字段（ra/ra_amortized/ra_measured/ra_total/ra_baseline/ra_recent），缺失 reuse_metrics 时仍计算 RA（前置 RA 计算） |
| 展示 | CLI `qdagent metrics`（JSON 自动含 RA）；Web `public/eng.js` Today 面加"推理摊销 RA · 已摊销 N/M 类 · 基线→近期"行 |

#### 18.2 鉴权层（§20 模块 + §46 追踪头）

产品网关 `gateway/openai.chat` 原先无鉴权（完全外移给反代）。`/v1/*` 兼容面已有 `lib/api::_v1_check_bearer`，但产品面缺失。

| 面 | 落地 |
|----|------|
| 模块 | `gateway/auth.mq.md`：`check(authorization, api_key, payload, run_id, context_id, knowledge_version)` —— 凭证对 `QDAGENT_API_KEY`（缺省 `qdagent-local` 供单机 dogfood，远程部署必须设）；提取 §46 追踪头 `X-QDAgent-{Run,Context,Knowledge-Version}-Id`（从 payload 或显式参数） |
| 接线 | `gateway/openai.chat` 签名增 `authorization`/`api_key`/`payload`，precheck 前 `auth.check`——拒绝永不达 Agent |

#### 18.3 负知识内容种子（§13 — 内容缺口）

代码通路早已完备（failures 经 preflight 进 Context Pack），但内容稀薄（failures 仅 1 项、patterns 空）。种子按设计规范的 AntiPattern 格式：

| 文件 | 类型 | 内容 |
|----|------|------|
| `knowledge/patterns/manual-jwt-parsing.md` | AntiPattern | 设计 §13 规范例子——手动解析 JWT 绕过校验 |
| `knowledge/patterns/vector-rag-as-source-of-truth.md` | AntiPattern | 向量检索当作真相源（违反 §19） |
| `knowledge/patterns/single-runtime-delegation.md` | Pattern | 单 Agent Runtime——调用不重造（正面经验） |

EKC 提取计数 6 → **9 knowledge 项**（AntiPattern/Pattern 经 `KnowledgeKind::subdir` 投影到 `patterns/`）。


## 11. Phase 10 — CLI 入口收纳（本仓增补）

**问题**：根目录堆积薄 CLI 包装（`求道-预检` / `构建` / `询问*` / `验证` / `学习` / `指标` / `mcp` / 笔记 legacy…），淹没 `serve.mq.md` / `index.mq.md` 与业务目录。

**不在** `doc/next` Phase 0–9 正文；KEEP 仍保留根上的 Web 入口。本设计**增补** Phase 10。

```text
cli/求道-*.mq.md     # 全部产品 CLI / MCP stdio 薄入口
serve.mq.md          # KEEP — Web Gateway
index.mq.md          # KEEP — 历史 shim → serve.boot
scripts/qdagent      # 指向 cli/…；导出 QDAGENT_ROOT + MARQDO_FS_ROOT
```

规则：

1. CLI 入口只做 env → 调 `agent/` · `execution/` · `gateway/` · `lib/api`，**不**承载业务逻辑。
2. 返回值避免污染源文件：打印 JSON 后 `*""*`（禁止 `*slug*` 触发 marqdo-out 写回）。
3. `scripts/qdagent` · `public/mcp.js` · legacy bridge · README 同步改路径。
4. **`marqdo run cli/…` 默认沙箱=入口目录**：必须设 `MARQDO_FS_ROOT` / `--fs-root` 为仓库根（scripts 已导出）；EKC 路径再经 `QDAGENT_ROOT`（`knowledge/context.resolve_root`）锚定，禁止 `cli/.marqdo`。
5. **禁止**改写 `doc/next/*`。


## 12. Phase 12 — Promote

```text
Verification → Evidence → Knowledge Candidate → Promote → knowledge/{decisions|constraints|failures|capabilities} → EKC recompile
```

- `execution/promote.mq.md`：`list` / `read` / `promote` / `reject`
- 门闩：默认再跑 L3 `verify`；失败则 `verify_before_promote`
- CLI：`qdagent candidates` · `promote <slug>` · `reject <slug>`
- MCP：`qd_candidates` · `qd_promote` · `qd_reject`
- Candidate sidecar：`data/candidates/<slug>.json`

# qdagent 2.0 — Executable Engineering Knowledge Agent

| | |
|---|---|
| 状态 | **Accepted（执行中）** |
| 日期 | 2026-09-28 |
| 计划源 | `doc/next/001.md` · `doc/next/002.md`（只读，禁止改写） |
| Marqdo | ≥ 1.3.0（EKC · Agent EFI · Skill Compilation · Adaptive Routing） |

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
gateway/openai.mq.md
gateway/mcp.mq.md
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
| 12 | queued | Knowledge Candidate → Promote（verify-before-promote 已有门闩，补晋升路径） |

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

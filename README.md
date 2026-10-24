# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **CLI ≥ 2.1.2 · Ext pack ≥ 2.1.2** 的 **Executable Engineering Knowledge Agent**（**求道**）。

> **求道，把工程经验编译成可执行的工程知识。**

实现语言是 **Marqdo（`.mq.md`）**。架构锁定见 [doc/design/qdagent-2.0.md](doc/design/qdagent-2.0.md)（计划源 `doc/next/*` 只读）。

## 核心闭环

```text
Preflight → REUSE/ADAPT/CREATE → Marqdo Agent (eng_preflight=True)
  → Verify → Record → Learn → EKC → 下一次更快
```

## 本机快速开始

```bash
# 优先工作区 Marqdo CLI + Ext（occlusion · access 取元 · labels 债务棘轮 · migrate labels）
# 解析顺序：$MARQDO_BIN → $HOME/work/marqdo → $QDAGENT_MARQDO_SRC（缺省 /workspace/marqdo）→ PATH
export MARQDO_BIN="${MARQDO_BIN:-/workspace/marqdo/target/release/marqdo}"
export MARQDO_EXT="${MARQDO_EXT:-/workspace/marqdo/ext}"
"$MARQDO_BIN" --version          # 期望 CLI ≥2.1.2
cat "$MARQDO_EXT/VERSION"        # 期望 Ext ≥2.1.2
chmod +x scripts/mq.sh scripts/qdagent scripts/marqdo-env.sh

# 编译本仓工程知识（GENERATED → .marqdo/）
./scripts/qdagent knowledge

# 杀手级入口
./scripts/qdagent preflight "给 OpenAI /v1 网关增加工程预检再调上游"
./scripts/qdagent build "给 OpenAI /v1 网关增加工程预检再调上游"
./scripts/qdagent verify
./scripts/qdagent learn

# Web（工程预检 / 能力 / 工作簿优先）
./scripts/mq.sh run serve.mq.md
# → http://127.0.0.1:7431/eng/preflight
```

演示账号：**demo / demo**。

## CLI

| 命令 | 作用 |
|------|------|
| `qdagent preflight` | Engineering Context Pack |
| `qdagent build` | BUILD + Reuse Gate |
| `qdagent verify` | verify / duplicate / conflicts / stale |
| `qdagent learn` | 写入 / 刷新 EKC |
| `qdagent candidates` | 列出 Knowledge Candidates |
| `qdagent promote` / `reject` | Verify-before-Promote |
| `qdagent find` / `reuse` | 工程查询 |
| `qdagent labels` | 工程债务（M8 棘轮 + M9 待完成桩；违约 exit 1） |
| `qdagent metrics` | KPI（reuse/adapt/novel/duplication + **推理摊销 RA**） |
| `qdagent serve` / `mcp` | Web / MCP（鉴权对 `QDAGENT_API_KEY`） |

## 架构要点

- **前端 = React SPA**（`frontend/`，Vite + react-router HashRouter）：`npm run build`
  产出 `public/app/`；`qdagent serve` 在 `/` 提供——`lib/spa.mq.md` 启动时读取
  `public/app/index.html` 提取带哈希的 `<script>/<link>`，经首页 `layout: bare` 壳
  注入 `<main>`（`images_html` 透传、框架 chrome 隐藏），浏览器执行模块脚本 → React
  挂载 `#root` 接管视口。SPA 同源调用 `/api/*`（cookie 鉴权）。产物缺失时优雅降级。
- **Marqdo = 唯一 Agent Runtime**；Python `/v1` 默认 `QDAGENT_V1_EFI=1` 仅做 HTTP 传输
- **不重造 EKC**：调用 `marqdo knowledge|find|reuse|verify|…`
- **四真相**：Program · Knowledge · Execution (Workbook) · Evidence
- **推理摊销 RA**（设计 §85）：`knowledge/amortization.mq.md` 跨 Run 累积同类任务的
  推理成本基线 vs 近期——REUSE 命中编译知识≈0 成本、CREATE≈全推理——证明"工程知识
  编译让 Agent 越用越省"；`qdagent metrics` 与 Web Today 面展示
- **鉴权**：`gateway/auth.mq.md` 对 `QDAGENT_API_KEY`（缺省 `qdagent-local`，远程必设）+
  §46 追踪头（`X-QDAgent-{Run,Context,Knowledge-Version}-Id`）
- **输出契约**：智能体答复与沉淀笔记都必须是**沙箱可运行**的 `.mq.md`，
  由 `execution/docgate.mq.md` 三段式机械门禁（提取 → 结构 → 沙箱试跑）把关，
  失败走至多一轮修复（见 [doc/design/09-document-contract-and-docgate.md](doc/design/09-document-contract-and-docgate.md)）
- Personal Memory（用户画像）保留但非工程主轴
- OKF `organize` 为 legacy（非 EFI 默认链）；知识主路径是 EKC + Knowledge Candidate
- `/v1` Python 网关仅做 HTTP 传输；`QDAGENT_V1_EFI=0` 厚路径已移除（HTTP 410）
- 依赖 Marqdo **CLI ≥2.1.2 · Ext ≥2.1.2**；已对齐 Marqdo **2.1.2**（EK 生产链 · verify/adjudicate · reuse_execute）：
  自有语料已 `marqdo migrate labels` 迁移 occlusion（`markup: occlusion` per-file 声明）；
  CI 有 `marqdo check` 全量契约 + `labels --baseline` 债务棘轮（只许降不许升）；
  Preflight Context Pack 附带 `pending_labels`（显式 `[待开发]()` 桩即债，Agent 可见）；
  Ext 1.4.4+ 表面保持（`agent.run efi=` · `sandbox=` · `router=` · `quarantine` ·
  `eng_record` · `mcp_server transport=http`）

## 入口

| 文件 | 作用 |
|------|------|
| `agent/qdagent.mq.md` | ASK / BUILD / LEARN |
| `agent/preflight.mq.md` | Preflight façade |
| `knowledge/context.mq.md` | Context Pack（零 LLM） |
| `knowledge/debt.mq.md` | 工程债务面（M8 棘轮 + M9 pending） |
| `knowledge/amortization.mq.md` | 推理摊销 RA（§85 跨 Run KPI） |
| `execution/run.mq.md` | Engineering Workbook |
| `execution/docgate.mq.md` | 文档门禁（输出契约机械校验 + 沉淀） |
| `execution/docgate-selftest.mq.md` | 门禁回归自检（6 条夹具断言，CI 强制） |
| `lib/spa.mq.md` | React SPA 首页引导（读 public/app/index.html 注入 `/`） |
| `gateway/openai.mq.md` · `gateway/auth.mq.md` · `gateway/mcp.mq.md` | 产品面 · 鉴权 |
| `serve.mq.md` · `index.mq.md` | Web Gateway（根目录 KEEP） |
| `cli/求道-*.mq.md` | 产品 CLI / MCP 薄入口 |

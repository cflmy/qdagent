# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **CLI ≥ 1.4.4 · Ext pack ≥ 1.4.4** 的 **Executable Engineering Knowledge Agent**（**求道**）。

> **求道，把工程经验编译成可执行的工程知识。**

实现语言是 **Marqdo（`.mq.md`）**。架构锁定见 [doc/design/qdagent-2.0.md](doc/design/qdagent-2.0.md)（计划源 `doc/next/*` 只读）。

## 核心闭环

```text
Preflight → REUSE/ADAPT/CREATE → Marqdo Agent (eng_preflight=True)
  → Verify → Record → Learn → EKC → 下一次更快
```

## 本机快速开始

```bash
# 优先工作区 Marqdo CLI + Ext（含 LLM 传输软失败 · cold EFI）
export MARQDO_BIN="${MARQDO_BIN:-$HOME/work/marqdo/target/release/marqdo}"
export MARQDO_EXT="${MARQDO_EXT:-$HOME/work/marqdo/ext}"
"$MARQDO_BIN" --version          # 期望 CLI ≥1.4.4
cat "$MARQDO_EXT/VERSION"        # 期望 Ext ≥1.4.4
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
| `qdagent serve` / `mcp` | Web / MCP |

## 架构要点

- **Marqdo = 唯一 Agent Runtime**；Python `/v1` 默认 `QDAGENT_V1_EFI=1` 仅做 HTTP 传输
- **不重造 EKC**：调用 `marqdo knowledge|find|reuse|verify|…`
- **四真相**：Program · Knowledge · Execution (Workbook) · Evidence
- **输出契约**：智能体答复与沉淀笔记都必须是**沙箱可运行**的 `.mq.md`，
  由 `execution/docgate.mq.md` 三段式机械门禁（提取 → 结构 → 沙箱试跑）把关，
  失败走至多一轮修复（见 [doc/design/09-document-contract-and-docgate.md](doc/design/09-document-contract-and-docgate.md)）
- Personal Memory（用户画像）保留但非工程主轴
- OKF `organize` 为 legacy（非 EFI 默认链）；知识主路径是 EKC + Knowledge Candidate
- `/v1` Python 网关仅做 HTTP 传输；`QDAGENT_V1_EFI=0` 厚路径已移除（HTTP 410）
- 依赖 Marqdo **CLI ≥1.4.4 · Ext ≥1.4.4**（下限不变）；已对齐 **Ext 1.5.2** 的 agent 表面
  （`agent.run efi=` · `sandbox=` · `router=` · `quarantine` · `eng_record` · `mcp_server transport=http`）

## 入口

| 文件 | 作用 |
|------|------|
| `agent/qdagent.mq.md` | ASK / BUILD / LEARN |
| `agent/preflight.mq.md` | Preflight façade |
| `knowledge/context.mq.md` | Context Pack（零 LLM） |
| `execution/run.mq.md` | Engineering Workbook |
| `execution/docgate.mq.md` | 文档门禁（输出契约机械校验 + 沉淀） |
| `gateway/openai.mq.md` · `gateway/mcp.mq.md` | 产品面 |
| `serve.mq.md` · `index.mq.md` | Web Gateway（根目录 KEEP） |
| `cli/求道-*.mq.md` | 产品 CLI / MCP 薄入口 |

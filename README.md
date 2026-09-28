# qdagent

基于 [Marqdo](https://github.com/cflmy/marqdo) **≥ 1.3.0** 的 **Executable Engineering Knowledge Agent**（**求道**）。

> **求道，把工程经验编译成可执行的工程知识。**

实现语言是 **Marqdo（`.mq.md`）**。架构锁定见 [doc/design/qdagent-2.0.md](doc/design/qdagent-2.0.md)（计划源 `doc/next/*` 只读）。

## 核心闭环

```text
Preflight → REUSE/ADAPT/CREATE → Marqdo Agent (eng_preflight=True)
  → Verify → Record → Learn → EKC → 下一次更快
```

## 本机快速开始

```bash
marqdo --version   # 期望 1.3.0+
chmod +x scripts/mq.sh scripts/qdagent

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
| `qdagent find` / `reuse` | 工程查询 |
| `qdagent serve` / `mcp` | Web / MCP |

## 架构要点

- **Marqdo = 唯一 Agent Runtime**；Python `/v1` 默认 `QDAGENT_V1_EFI=1` 仅做 HTTP 传输
- **不重造 EKC**：调用 `marqdo knowledge|find|reuse|verify|…`
- **四真相**：Program · Knowledge · Execution (Workbook) · Evidence
- Personal Memory（用户画像）保留但非工程主轴
- OKF `organize` 为 legacy；知识主路径是 EKC + Knowledge Candidate

## 入口

| 文件 | 作用 |
|------|------|
| `agent/qdagent.mq.md` | ASK / BUILD / LEARN |
| `agent/preflight.mq.md` | Preflight façade |
| `knowledge/context.mq.md` | Context Pack（零 LLM） |
| `execution/run.mq.md` | Engineering Workbook |
| `gateway/openai.mq.md` · `gateway/mcp.mq.md` | 产品面 |
| `serve.mq.md` | Web Gateway |
| `求道-预检.mq.md` 等 | CLI 入口 |

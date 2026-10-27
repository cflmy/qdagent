# qdagent 文档索引

> **以 [design/qdagent-2.0.md](design/qdagent-2.0.md) 与 [design/qdagent-dev-plan-2026-10.md](design/qdagent-dev-plan-2026-10.md) 为准。**  
> 下方 00–08 / roadmap 为早期调研与 MVP 档案；与 2.0 冲突时按 2.0。**勿改** `doc/next/*`。

| | |
|---|---|
| 产品 | **求道 / qdagent** — Executable Engineering Knowledge Agent（Marqdo 唯一 Runtime / EKC） |
| 对标 | [OpenClaw](https://github.com/openclaw/openclaw) · [Hermes Agent](https://github.com/NousResearch/hermes-agent) |
| 日期 | 2026-10-16（索引横幅）· 档案正文多起于 2026-09 |
| 语言运行时 | Marqdo **CLI≥2.1.4 · Ext≥2.1.4**（ADR 0009 隔离执行） |

## 阅读顺序（建议）

最新增量设计入口：[**求道智能体能力与侧栏预览（2026-10-27，Proposed）**](design/agent-capabilities-and-preview-2026-10-27.md) → [**官方调研与最新源码复核**](../../marqdo/doc/research/agent-capabilities-2026-10-27.md) → [**Marqdo 恢复、工具与资源协议**](../../marqdo/doc/design/agent-reliability-tools-resources-2026-10-27.md)（跨库链接需同级 checkout）。以 qdagent `68b757e` / Marqdo `16f26d7` 为基线，覆盖错误恢复、回答长度、统一侧栏预览、业务工具、文件渲染、上下文及验收；新协议与行为均为待实现设计，不覆盖 2.0 的架构边界。

上一轮可靠性设计：[**可靠工作台详细开发设计（2026-10-26）**](design/reliable-workbench-development-2026-10-26.md) → [**当轮缺陷复核与测试记录**](gaps/04-workbench-runtime-and-product-audit-2026-10-26.md) → [**Marqdo 隔离运行时配套设计**](../../marqdo/doc/design/isolated-web-runtime-development-2026-10-26.md)。当轮以 `64b97e5` / `1b11fe0` 为复核基线；后续落地见 [Q-R0–R9 实施说明](releases/reliable-workbench-q-r0-r9-2026-10-26.md)，实际能力以测试证据为准。

0. [**qdagent 2.0 设计（Accepted）**](design/qdagent-2.0.md) · [下一阶段开发计划](design/qdagent-dev-plan-2026-10.md) · [再下一阶段（审阅稿）](design/qdagent-dev-plan-2026-10-next.md)  
   本轮产品扩展：[**多提供商与知识工作台（2026-10-25，Proposed）**](design/multi-provider-and-knowledge-workbench-2026-10-25.md) — 基于 `643dd31` / Marqdo 2.1.2 的增量审阅；含模型切换、用量账本、View 侧栏与引用、工作区、笔记/画像、统一可读性规范、API 合同、迁移及逐项验收。
1. [总览与产品愿景](00-overview.md)（档案）  
2. [竞品调研：OpenClaw / Hermes / GoClaw](research/01-competitive-openclaw-hermes.md)  
3. [Marqdo 原生能力与差异化设计](design/02-marqdo-native-agent.md)  
4. [执行沉淀：`.mq.md` 审计轨迹与知识库](design/03-audit-knowledge.md)  
5. [模型接入矩阵（LLM / 多模态 / ASR / TTS）](research/04-models-and-providers.md)  
6. [对外 OpenAI 兼容 API](design/05-openai-compatible-api.md) ← C2a 瘦 framing  
7. [网络界面与语音交互](design/06-web-ui-and-voice.md)  
8. [笔记式界面与 MCP 接入](design/07-notes-ui-and-mcp.md)  
9. [Docker 部署](design/08-docker-deploy.md)  
10. [分阶段任务路线图](roadmap/07-task-roadmap.md) ← 以 2.0 为准  
11. [**Marqdo 能力缺口**](gaps/01-marqdo-hard-limits.md) ← GAP-13 CLOSED（C2a）  
12. [Marqdo 解析 / 运行时缺陷](gaps/02-marqdo-parser-and-runtime.md)  
13. [**知识沉淀、文档导入与原生能力接入缺口（2026-10-24）**](gaps/03-knowledge-ingestion-and-sedimentation-2026-10-24.md) — 当前源码审计、提示词契约、跨库分工与验收；含 Marqdo 2.1.1 复现结果，非已交付声明。

## 目录结构

```text
doc/
  README.md
  00-overview.md
  gaps/
    01-marqdo-hard-limits.md
    02-marqdo-parser-and-runtime.md
  research/
    …
  design/
    …
  roadmap/
    …
```

## 一句话产品主张

**求道首先是可执行的求道笔记；聊天与模型只是笔。**  
**可用自己的模型（OpenAI `/v1`），也可用别人的模型（MCP）——知识都沉下来。**  
**默认用 Docker Compose 常驻部署，数据卷即审计仓库。**

# qdagent 文档索引

> **以 [design/qdagent-2.0.md](design/qdagent-2.0.md) 与 [design/qdagent-dev-plan-2026-10.md](design/qdagent-dev-plan-2026-10.md) 为准。**  
> 下方 00–08 / roadmap 为早期调研与 MVP 档案；与 2.0 冲突时按 2.0。**勿改** `doc/next/*`。

| | |
|---|---|
| 产品 | **求道 / qdagent** — Executable Engineering Knowledge Agent（Marqdo 唯一 Runtime / EKC） |
| 对标 | [OpenClaw](https://github.com/openclaw/openclaw) · [Hermes Agent](https://github.com/NousResearch/hermes-agent) |
| 日期 | 2026-10-16（索引横幅）· 档案正文多起于 2026-09 |
| 语言运行时 | Marqdo **CLI≥1.4.4 · Ext≥1.4.4** |

## 阅读顺序（建议）

0. [**qdagent 2.0 设计（Accepted）**](design/qdagent-2.0.md) · [下一阶段开发计划](design/qdagent-dev-plan-2026-10.md) · [再下一阶段（审阅稿）](design/qdagent-dev-plan-2026-10-next.md)  
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

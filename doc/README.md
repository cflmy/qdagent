# qdagent 文档索引

| | |
|---|---|
| 产品 | **qdagent** — 基于 [Marqdo](https://github.com/cflmy/marqdo) 的文档驱动智能体助手 |
| 对标 | [OpenClaw](https://github.com/openclaw/openclaw) · [Hermes Agent](https://github.com/NousResearch/hermes-agent) |
| 日期 | 2026-09-07 |
| 语言运行时 | Marqdo ≥ 0.3.7（本机已装） |

## 阅读顺序（建议）

1. [总览与产品愿景](00-overview.md)  
2. [竞品调研：OpenClaw / Hermes / GoClaw](research/01-competitive-openclaw-hermes.md)  
3. [Marqdo 原生能力与差异化设计](design/02-marqdo-native-agent.md)  
4. [执行沉淀：`.mq.md` 审计轨迹与知识库](design/03-audit-knowledge.md)  
5. [模型接入矩阵（LLM / 多模态 / ASR / TTS）](research/04-models-and-providers.md)  
6. [对外 OpenAI 兼容 API](design/05-openai-compatible-api.md)  
7. [网络界面与语音交互](design/06-web-ui-and-voice.md)  
8. [**笔记式界面与 MCP 接入**](design/07-notes-ui-and-mcp.md) ← 体验差异化  
9. [**Docker 部署（推荐）**](design/08-docker-deploy.md) ← 默认交付形态  
10. [分阶段任务路线图](roadmap/07-task-roadmap.md)  
11. [**Marqdo 能力缺口（必须阅读）**](gaps/01-marqdo-hard-limits.md) ← 非 Marqdo 脚本的唯一正当理由  
12. [**Marqdo 解析 / 运行时缺陷**](gaps/02-marqdo-parser-and-runtime.md) ← 0.3.7 开发中确认的 Open bug  

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

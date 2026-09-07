# 分阶段任务路线图（调研 → 实现）

| | |
|---|---|
| 状态 | 执行清单 |
| 日期 | 2026-09-07 |
| 说明 | **先按序做调研任务并回写文档结论**，再进入实现；每项含产出物与验收 |

---

## 阶段 0 — 文档与决策（当前）

| ID | 任务 | 产出 | 状态 |
|----|------|------|------|
| D0 | 总览与愿景 | [00-overview.md](../00-overview.md) | ✅ |
| D1 | OpenClaw / Hermes / GoClaw 调研 | [01-competitive…](../research/01-competitive-openclaw-hermes.md) | ✅ |
| D2 | Marqdo 原生设计 | [02-marqdo-native-agent.md](../design/02-marqdo-native-agent.md) | ✅ |
| D3 | 审计与知识库 | [03-audit-knowledge.md](../design/03-audit-knowledge.md) | ✅ |
| D4 | 模型矩阵 | [04-models-and-providers.md](../research/04-models-and-providers.md) | ✅ |
| D5 | OpenAI 兼容 API | [05-openai-compatible-api.md](../design/05-openai-compatible-api.md) | ✅ |
| D6 | Web UI 与语音 | [06-web-ui-and-voice.md](../design/06-web-ui-and-voice.md) | ✅ |
| D7 | 笔记 UI + MCP 差异化 | [07-notes-ui-and-mcp.md](../design/07-notes-ui-and-mcp.md) | ✅ |
| D8 | Docker 部署规范 | [08-docker-deploy.md](../design/08-docker-deploy.md) | ✅ |

---

## 阶段 1 — 深入调研任务（按顺序做）

> 每完成一项：在对应文档追加「调研结论（日期）」小节，并更新本表状态。

### T1 · 官方 agent/llm 现状摸底

| | |
|---|---|
| 动作 | 精读本机 `~/.marqdo/ext/ai/*.mq.md` 与 `marqdo-src` 中 agent 测试；跑通 `ext` 样例 |
| 问题 | 当前实现是新文档驱动还是旧 TOOL: 循环？写回字段长什么样？ |
| 产出 | 补丁：`design/02` §现状附录；最小可运行 `examples/hello-agent.mq.md` 计划 |
| 依赖 | 无 |
| 状态 | ✅（见 `design/02` §7） |

### T2 · Run 文件 Schema 定稿

| | |
|---|---|
| 动作 | 对比 Hermes SessionDB 字段、OpenClaw session、Marqdo writeback 卡 |
| 问题 | frontmatter 必选键；工具参数脱敏规则；流式未完成态；**MCP capture 共用同一 Schema** |
| 产出 | `design/03` 增加 JSON Schema / 示例完整文件 |
| 依赖 | T1 |

### T3 · OpenAI 兼容差异清单

| | |
|---|---|
| 动作 | 用 Cursor/Continue 的实际请求抓包（本地 mock） |
| 问题 | 哪些字段必填？`tools` 如何传来？流式终止帧？ |
| 产出 | `design/05` 「客户端兼容矩阵」表 |
| 依赖 | 无（可与 T1 并行） |

### T4 · Provider 连通性矩阵实测

| | |
|---|---|
| 动作 | 对 OpenAI 兼容、Ollama、（可选）一个国产网关、FunASR 做 hello |
| 问题 | TLS/代理、模型名、流式 SSE 差异 |
| 产出 | `research/04` 增加「实测记录」；`.env.example` |
| 依赖 | 网络与密钥 |

### T5 · ASR/TTS 方案选型实验

| | |
|---|---|
| 动作 | FunASR OpenAI 兼容服务 vs Whisper API；Edge TTS vs OpenAI speech |
| 问题 | 延迟、中文质量、CPU 占用、是否易进 Docker |
| 产出 | `design/06` 选型决议（默认管道组件） |
| 依赖 | T4 |

### T6 · 安全威胁建模

| | |
|---|---|
| 动作 | 对照 OpenClaw security guide、GoClaw 五层、提示注入；**含 MCP 写盘工具审批** |
| 问题 | API 暴露面、工具越权、审计文件泄密、MCP 误写 |
| 产出 | 新文档 `design/08-security.md`（本阶段创建） |
| 依赖 | T2、T3、T9 |

### T7 · 笔记 UI 线框与信息架构

| | |
|---|---|
| 动作 | 基于 `design/06` + `design/07`；对标 Obsidian/Logseq/备忘录 |
| 问题 | 默认着陆页、双栏比例、对话抽屉、手机是否 MVP |
| 产出 | `design/07` 附录线框；路由表 |
| 依赖 | T2 |

### T8 · MCP 协议与最小工具集定稿

| | |
|---|---|
| 动作 | 精读 MCP tools/resources/prompts；对照 Cursor/VS Code/Claude Desktop 配置 |
| 问题 | stdio vs SSE；工具命名；Resources URI；与 Capture Core 边界 |
| 产出 | `design/07` §工具表锁定 + 示例 `mcp.json` |
| 依赖 | T2 |

### T9 · 「仅 MCP、不用求道模型」旅程走查

| | |
|---|---|
| 动作 | 写用户故事：在 Cursor 用默认 Agent，通过 MCP 搜索/capture/晋升 |
| 问题 | 何时强制用户确认；失败如何提示；如何在笔记 UI 看见 MCP 写入 |
| 产出 | `design/07` 用户旅程附录；验收清单 |
| 依赖 | T8 |

---

## 阶段 2 — MVP 实现

| ID | 任务 | 验收 |
|----|------|------|
| I0 | Docker Compose 可启动 demo | `docker compose up` 起 UI+/v1 |
| I1 | 仓库骨架：`assistants/` `runs/` `sessions/` `skills/` `kb/` | 目录约定落地 |
| I2 | Run 写入库（Marqdo/宿主） | 每次执行必有文件 |
| I3 | 包装 `ext/ai/agent` 单步助手 | hello 工具调用 + 写回 |
| I4 | `GET /v1/models` + `POST /v1/chat/completions`（含 stream） | curl 验收；Cursor 可配 |
| I5 | **笔记式**库 + 正文 + 对话抽屉 | 默认着陆非纯聊天 |
| I6 | ASR 上传转写 | 麦克风或文件 → 文本 → 笔记 |
| I7 | `marqdo catalog` 接入 kb/runs | 索引可浏览 |
| I8 | MCP Server：`qd_search` + `qd_capture` | Cursor 可配并落盘 |
| I9 | `.env.example` + 安全默认 + MCP 配置样例 | README 安装步骤 |

---

## 阶段 3 — 增强

| ID | 任务 |
|----|------|
| E1 | 多步 plan 工作簿 UI |
| E2 | Skill 自动晋升建议 |
| E3 | TTS 朗读 / 可选 Realtime |
| E4 | Embedding 检索 | **非默认**：与 Marqdo OKF 冲突；仅作远期可选证据层 |
| E5 | 消息通道 Gateway（学 OpenClaw，可选 Telegram 先） |
| E6 | ACP 或更多编辑器协议 |
| E7 | 沙箱 Docker 执行后端（学 Hermes） |

---

## 建议执行顺序（调研周）

```text
T1 ✅ → T2 → T3
         ↘
T4 → T5 → T7（笔记线框）
         ↘
T8 → T9（MCP 旅程）
T6（安全，穿插）
    → 阶段 2 MVP（含笔记 UI + MCP）
```

---

## 进度日志

| 日期 | 项 | 备注 |
|------|----|------|
| 2026-09-07 | D0–D6 | 首轮调研文档落盘 |
| 2026-09-07 | T1 | 官方文档驱动 agent；见 `design/02` §7 |
| 2026-09-07 | D7 | 笔记 UI + MCP 差异化写入 `design/07`；总览/路线图已对齐 |
| 2026-09-07 | D8 | Docker 部署定为默认交付；见 `design/08-docker-deploy.md` |
| | T2… | **下一项仍建议：Run Schema（同时服务 API 与 MCP capture）** |

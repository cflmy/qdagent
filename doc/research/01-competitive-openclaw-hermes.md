# 竞品调研：OpenClaw · Hermes Agent · GoClaw

| | |
|---|---|
| 状态 | 调研完成（2026-09-07） |
| 范围 | 架构哲学、能力矩阵、可借鉴点、对 qdagent 的启示 |
| 资料 | [OpenClaw](https://github.com/openclaw/openclaw) · [openclaw.ai](https://openclaw.ai) · [Hermes](https://hermes-agent.org/) · [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) · [对比文](https://dev.to/truongpx396/hermes-agent-the-self-improving-agent-framework-and-how-it-compares-to-openclaw-goclaw-22mc) |

---

## 0. 一句话定位

| 项目 | 隐喻 | 最强项 |
|------|------|--------|
| **OpenClaw** | 「你的助手出现在你已有的聊天里」 | 通道广度、本地 Gateway、设备端语音/Canvas、技能生态（ClawHub） |
| **Hermes Agent** | 「长期驻留、会自己长技能的进程」 | 自改进 Skill、模型无关、记忆分层、ACP/Web/Cron、研究向 RL |
| **GoClaw** | 「可卖的多租户助手平台」 | 单二进制、租户隔离、安全五层、运维友好（注意 CC BY-NC） |

qdagent 应对齐：**OpenClaw 的可达性 + Hermes 的成长性**，再用 **Marqdo 把「技能/轨迹/知识」统一成可执行文档**。

---

## 1. OpenClaw

### 1.1 是什么

- TypeScript / Node，MIT，本地优先个人（或互信小团队）助手。  
- 核心是 **Gateway**：会话、工具、事件、通道连接的控制面。  
- Control UI / CLI / TUI 连 Gateway；通道覆盖 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等。  
- Companion apps / nodes：语音、Canvas、摄像头、屏幕、设备本地动作。  
- 模型：托管与本地 Provider 均可。  
- 技能：ClawHub 注册表（大量社区 skills）；工作区常见 `AGENTS.md` / `SOUL.md` / `TOOLS.md` 等人设与工具说明文件。

### 1.2 架构要点

```text
Channels / Companion Apps
        │
        ▼
   Gateway（本地控制面）
        │
   ┌────┼────┐
   ▼    ▼    ▼
 Models Tools Skills/Plugins
```

### 1.3 可借鉴

| 点 | 对 qdagent |
|----|------------|
| Gateway 与 Agent Loop 解耦 | 先做「本地控制面」再挂 UI/API/语音 |
| 工作区 Markdown 人设文件 | 与 Marqdo 天然同构，直接升级为可执行 `.mq.md` |
| 默认配对/审批陌生 DM | 对外 API 与通道的安全基线 |
| Dashboard 快速验证 | Web 控制台作为第一公民 Surface |
| 技能市场形态 | 后期可兼容 agentskills.io / 自建 hub，但内容应为 `.mq.md` |

### 1.4 不照搬

- 不以「消息通道覆盖率」为首期 KPI。  
- 不以 TypeScript 重写运行时——运行时是 Marqdo。  
- 避免默认过于宽松的工具权限。

---

## 2. Hermes Agent

### 2.1 是什么

- Nous Research，MIT，2026-02 起快速增长；「the agent that grows with you」。  
- 长驻进程：CLI/TUI、Messaging Gateway（多平台）、Web UI、**ACP**（编辑器协议）、Cron。  
- 模型无关：OpenRouter / OpenAI / Anthropic / 本地 vLLM / 任意 OpenAI-compatible。  
- **Skills**：Markdown + frontmatter，可自编辑；兼容 agentskills.io。  
- 记忆：frozen snapshot + SessionDB(FTS5) + 可选 Honcho/mem0。  
- 工具：70+，含 shell/browser/vision；执行后端 local/Docker/SSH/Modal 等。  
- 研究向：轨迹导出、RL（Atropos）、自进化实验。

### 2.2 三层架构（摘要）

```text
Surfaces: CLI · Gateway · Web · ACP · Cron · Subagents
                │
         AIAgent Loop（think → tool → observe → memory）
                │
     Tools / Skills / Execution Environments / Memory Providers
```

### 2.3 可借鉴

| 点 | 对 qdagent |
|----|------------|
| 「能力活在 Skill 文件里」 | Marqdo 更进一步：Skill = 可执行文档 |
| Provider 统一解析 | 明确 `(provider, model) → base_url/key/api_mode` |
| ACP / 编辑器接入 | 首期用 **OpenAI 兼容 HTTP** 覆盖 Cursor 等；ACP 可列后期 |
| Cron / 无人值守 | 路线图中期 |
| Sub-agent 隔离 | 对齐 Marqdo `lib/subtask` + 工作簿多文件 |
| Prompt cache 友好布局 | 写回与站立提示分区，降低成本 |

### 2.4 与 Marqdo 的关键差异

Hermes 的技能与记忆仍是「给 Agent 读的 Markdown / DB」；**执行真相仍在 Python 循环**。  
Marqdo / qdagent 要求：**编排、提示、结果写回同一份 `.mq.md`**，`view`/`debug`/`git` 共用真相源。

---

## 3. GoClaw（简表）

| 项 | 内容 |
|----|------|
| 语言 | Go + React |
| 目标 | 多租户生产、安全与运维 |
| 许可 | CC BY-NC（商用需另议） |
| 启示 | 预留租户/审计字段；首期不做完整多租户 |

---

## 4. 三方能力矩阵（对 qdagent 有用的维度）

| 维度 | OpenClaw | Hermes | qdagent 目标 |
|------|----------|--------|--------------|
| 编排真相源 | TS + workspace md | Python loop + skills md | **可执行 `.mq.md`** |
| 通道 | 极强 | 强 | 中期；首期 Web+API |
| 自改进 | 用户写 skill 为主 | 强（自写 skill） | 写回晋升 KB/Skill |
| 编辑器接入 | 有限 | ACP | **OpenAI `/v1`** 优先 |
| 语音 | 设备端强 | 转写/TTS | ASR/TTS Provider 层 |
| 本地优先 | 是 | 是 | 是 |
| 审计 | 依赖配置/日志 | SessionDB | **runs/*.mq.md + git** |

---

## 5. 结论与决策

1. **产品叙事**：本地智能体助手，强调「越用越有知识库」，而非「又一个 ChatGPT 壳」。  
2. **首期 Surface**：Web 控制台 + OpenAI 兼容 API + CLI；通道 Gateway 学习 OpenClaw，但不阻塞 MVP。  
3. **成长性**：学 Hermes 的 Skill/记忆分层，但实现落在 Marqdo 写回与 OKF。  
4. **安全**：学 GoClaw/OpenClaw 的审批与沙箱思路，默认白名单工具。  
5. **下一步调研任务**：见路线图 T1–T3（API 形状、写回 schema、模型矩阵细表）。

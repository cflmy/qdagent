# Marqdo 原生智能体设计（qdagent Core）

| | |
|---|---|
| 状态 | 设计草案 |
| 日期 | 2026-09-07 |
| 依赖 | Marqdo `ext/ai/agent` · `ext/ai/llm` · `lib/writeback` · `lib/subtask` · OKF |
| 相关官方文档 | marqdo `doc/design/ext-agent.md` · `ext-agent-plan.md` · `ext-llm.md` |

---

## 0. 设计锚点

Marqdo 官方已否定「隐藏 TOOL: 黑盒循环」，锁定：

- **单步（step）**：原子任务 + 默认写回。  
- **多步（plan）**：生成/续跑工作簿 `.mq.md`，子任务经 `lib/subtask`。  
- **提示 = 源码可见**：模型读当前模块与调用位置。  
- **成功经验可晋升**为任务知识包（OKF）。

qdagent 在此之上增加：**产品级强制沉淀、会话映射、对外 API、UI/语音**。

---

## 1. 核心对象

| 对象 | 说明 | 落地形态 |
|------|------|----------|
| **Assistant** | 用户可见的助手实例（人设、默认模型、工具集） | `assistants/<id>/soul.mq.md` |
| **Session** | 一次连续对话 | `sessions/<id>/session.mq.md` + 指向 runs |
| **Run** | 一次完整执行（可能含多工具轮次） | `runs/<utc>-<shortid>.mq.md` **必落盘** |
| **Skill** | 可复用程序化知识 | `skills/<name>/SKILL.mq.md`（可执行） |
| **KB Entry** | 晋升后的知识条目 | `kb/` + `marqdo catalog` 产物 |

---

## 2. 执行流水线

```text
用户输入（UI / Voice / API）
    │
    ▼
Session 解析 / 创建
    │
    ▼
生成 Run 工作簿骨架（.mq.md）← 含 frontmatter 元数据
    │
    ▼
Agent.step 或 Agent.plan（ext/ai/agent）
    │         │
    │         └── 工具：runbook ## / plugin / 可选 MCP
    ▼
每步 writeback → 同一 Run 文件（或子工作簿）
    │
    ▼
结束：汇总结果 · 更新 Session 索引 · 可选晋升 Skill/KB
    │
    ▼
返回：给 UI 的消息 / 给 API 的 chat.completion 形状
```

### 2.1 Run 文件最小 frontmatter

```yaml
---
qdagent: 1
run_id: "20260907T063012Z-a1b2"
session_id: "sess_..."
surface: "web" | "api" | "cli" | "voice"
model: "gpt-4o-mini"
provider: "openai-compatible"
started_at: "2026-09-07T06:30:12Z"
request_id: "req_..."   # 外部 API 关联
---
```

正文结构建议：

1. `# 任务` — 用户目标（原文）  
2. `# 上下文` — 注入的切片 / 检索命中（可折叠）  
3. `# 过程` — 思考与工具调用（写回块）  
4. `# 结果` — 最终答案  
5. `# 元数据` — token、耗时、错误码  

---

## 3. 相对 OpenClaw / Hermes 的「新内容」

| 能力 | 说明 |
|------|------|
| **执行即写作** | 不是事后导出 transcript，而是执行过程中持续改 `.mq.md` |
| **外部调用同等沉淀** | Cursor 经 `/v1/chat/completions` 进来的请求，同样生成 Run |
| **可执行知识库** | KB 条目可被 `marqdo run` 再次执行，而不仅是向量命中文本 |
| **审计 = git** | runs/ 可进版本库；敏感字段可 redact 钩子 |
| **view/debug 原生** | 直接用 Marqdo 文档浏览器看助手自己的工作簿 |

---

## 4. 工具面分层

| 层 | 内容 | 策略 |
|----|------|------|
| L0 内置 | 时间、文件读写（沙箱根）、JSON、HTTP（受限） | 默认开，路径 jail |
| L1 助手技能 | `skills/*/SKILL.mq.md` 暴露的 `##` | 按助手配置 |
| L2 原生插件 | agent/web 等 `.so` | 显式启用 |
| L3 MCP/外部 | 可选 | 中期 |

---

## 5. 配置面（草案）

```text
qdagent/
  assistants/default/
    soul.mq.md          # 人设、站立提示、工具表白名单
    models.yaml         # 默认与回退模型
  sessions/
  runs/
  skills/
  kb/
  .env                  # 密钥（不入库）
```

环境变量与 Marqdo 对齐：`OPENAI_*` / `MARQDO_LLM_*`，并扩展 `QDAGENT_*`。

---

## 6. 开放问题（待后续调研任务关闭）

1. Run 文件是「一请求一文件」还是「一轮工具一文件」？（倾向：一请求一主文件 + 可选子工作簿）  
2. 流式 API 时写回粒度：token 级 vs 事件级？（倾向：事件级 + 最终合并）  
3. ~~与官方 `ext/ai/agent` 薄循环遗留实现的兼容期如何切？~~ → 见 §7：已是文档驱动实现。  

决策记录请回写本节。

---

## 7. 调研结论 · T1 官方 agent/llm 现状（2026-09-07）

| 项 | 结论 |
|----|------|
| 安装位置 | `~/.marqdo/ext/ai/agent.mq.md`、`llm.mq.md`（及中文别名） |
| agent 形态 | **已是文档驱动**：`build_step_context` 组装 standing/task/tools/call_site/source/skill；行动协议为 `CALL:` / `调用：`，非旧黑盒 TOOL: 主路径 |
| 工具执行 | 经 `lib/subtask`；禁止 CALL 框架内部辅助函数 |
| 上下文预算 | `source_depth` / `skill_depth`；可 `READ:source` / `读取：` 加深 |
| 方法 | `step` / `plan`（测试覆盖 writeback、kb hit/reuse、stream offline、plan confirm 等） |
| llm | OpenAI 兼容 `/chat/completions`；`OPENAI_*` / `MARQDO_LLM_*`；支持 `stream` 事件列表 |
| 写回 | `lib/writeback`；`step`/`plan` 有 `writeback=`；注意参数名勿遮蔽 host 写回（已有回归测试） |
| KB | 测试含 `kb_dir`、`promote`、plan hit/near/reuse — **官方已有知识包钩子，qdagent 应复用而非另造** |
| 工作簿目录 | 测试默认 `.marqdo/agent-runs` |

**对 qdagent 的直接含义：**

1. MVP 编排层 = 薄封装官方 `# agent` + 强制把每次外部/UI 请求映射到带 frontmatter 的 Run 文件（可与 `.marqdo/agent-runs` 对齐或软链到 `runs/`）。  
2. 不必重写 CALL 协议；产品差异在 **Gateway、审计策略、OpenAI API 门面、UI/语音**。  
3. 下一步 **T2**：把 writeback 槽位与 Run frontmatter 对齐成一份 Schema。

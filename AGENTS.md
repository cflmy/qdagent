# qdagent v3 — 新智能体开发契约

当前实验分支的唯一架构文档：`docs/architecture/CAPABILITY_AGENT_V3.md`；新增 SKILL 请阅读 `docs/architecture/SKILL_AUTHORING.md`。**不得把旧 `ext/root-skill/` 当作新架构模板或产品入口。**

- 唯一生产智能体入口：`agent/index.mq.md`。Go 仅负责身份、HTTP、存储、进程、配额、事件；Python 只负责传输。业务模型提示和工作流控制只允许写在可审阅的 Marqdo 文稿中。
- 新能力放进 `skills/<slug>/index.mq.md`，声明 `description`、`agent_effects` 并暴露 `## run(context,goal)`。默认只由此入口对根可见。新增 SKILL 不修改根的业务路由代码。
- 能力索引由**实际源码**与 Marqdo 官方 parser 派生。不能再建第二套人工工具 Schema、固定业务模式分派表或 Python Agent 工具循环。
- 一个小模型步骤只输出一个已安装的候选 ID。只有真正需要生成源码/文档时才能进入对应 SKILL，让模型生成相应结构。失败最多一次纯格式修复，禁止无限纠错。
- `memory.mq.md` 是唯一默认的跨轮模型上下文投影，状态、用户确认、原始审计、知识图与证明证书均有各自的可信存储。模型不能通过编辑记忆授予权限。
- 带外部效果或写入的能力必须通过身份验证、源码哈希绑定的用户批准与真实调用收据；未知效果不可自动重放。
- 简单任务直接调用领域 SKILL；需要跨轮/多阶段/并发才使用 `workflows/` 和 Marqdo 原生 `ext/ai/workflow`、`subtask`。根不应知道软件开发的特定阶段。
- L1 源码/锚点、L2 受限 Lean 模型证明、L3 真实测试/实验分别记录。不能把 `model_proved` 当成完整运行时证明。
- 旧 root-skill 源码目前仅为历史资料，不再作为新代码的 import 依赖。所有新模块尽量从 `agent/`、`skills/`、`workflows/`、官方 `ext/` 和 `lib/` 组合。

**当前阶段只开发，不测试，不合并主分支。** 文稿的语法、Go/Rust 构建、React 与真实模型运行状态都尚未验收。任何缺口必须清楚记录，不要冒充生产已可用。

# 求道智能体 · Marqdo Native Context-Sovereign Agent

求道是以 **Marqdo 可执行文稿为智能体主体**的探索性框架：模型认知上下文由 Marqdo 选择和管理，外部框架只负责身份、权限、进程与传输。

**新架构的核心不是“永远只用三份上下文”，而是“默认三份极小启动，智能体根据任务自主选择更多具体上下文”。**

初始视图通常包含当前用户输入、相关记忆、正在执行的 Marqdo 文稿。需要更多信息时，智能体在 Marqdo 中主动选择源码函数、知识锚点、证明依赖、测试收据或外部来源，按照精确作用域和预算读取，不由 Go/Python/Rust 自动拼进模型消息。宿主仍独立执行权限、可信来源与副作用核验。

## 未来开发先看

- **[自主细粒度上下文架构](docs/architecture/CONTEXT_SOVEREIGNTY.md)**：完整设计，作用域、来源、生命周期、动态选择、记忆与并发；
- [设计理由](docs/architecture/DECISIONS.md)：为什么不是外部 Agent Loop、不是硬编码三源上限；
- [AGENTS 开发者规范](AGENTS.md)：模块职责与禁止事项；
- [SKILL 开发指南](docs/architecture/SKILL_AUTHORING.md)：扩展能力与上下文接口的设计方式。

## 架构归属

`agent/` 负责通用 Marqdo 智能体，拟新增 `agent/context/` 负责自主上下文；`skills/` 负责领域能力；`workflows/` 仅编排真正的复杂任务；`ext/`、`lib/` 提供语言级可复用原语；Rust/Go/worker 只承担不可由 Marqdo 安全管理的资源和传输能力；frontend 呈现真实执行、证据与用户确认。

## 实验代码状态

当前分支已经有 context-free 函数及固定三源传输的**过渡性代码**，但**尚未实现这份设计要求的动态上下文工作集与自主读取协议**。此次只修订架构，不实施代码迁移、编译、测试或发布，也未合并主分支。以架构文档为目标契约，切勿把旧三源限制当作最终方案。

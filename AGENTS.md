# 求道最小实验：不可重新扩张的范围

这是一个**刻意极简**、可破坏兼容的 Marqdo 原生智能体实验，不是 Web 产品。

- 保留根 `index.mq.md`、`memory.mq.md`，和**恰好两个**领域入口：`skills/model/index.mq.md`、`skills/chat/index.mq.md`。
- 所有 Agent 行为写为 `.mq.md` 函数；调用必须能由 `index → chat → model → 官方 ext/ai/llm` 阅读和追踪。
- 禁止引入 Python、Go、Rust 私有 agent runtime、HTTP server、前端、Docker、另一个 Agent Loop、工具注册表、自动路由目录、多代理与兼容层。
- 模型的请求参数、记忆来源、执行文稿必须在 Marqdo 源码中可见；禁止外部框架自动灌入历史或系统消息。
- 需要附加上下文时，在 Marqdo 函数中**显式**读取并传给模型，不从外部宿主偷偷拼接；目前只有问题、记忆、当前文稿三个输入。
- 只使用已安装的官方 Marqdo `ext/ai/llm.mq.md` 与标准 `lib/`。**不复制**整套扩展库到此仓库；需要修改运行时基础能力时上游到 `cflmy/marqdo`。
- 不自动写记忆；用户明确调用 `remember` 才保留。禁止把模型成功返回当作真实执行成功或数据已验证。
- 不为“将来可能需要”加模块。只有最小聊天闭环跑通并有实际需求时，才讨论扩展。

此分支保留 Git 历史，可从以前提交检索被删除的系统。没有运行测试时不得声称可用。

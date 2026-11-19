# 求道智能体 · Marqdo 三源文稿智能体

这是一个探索性、**以 Marqdo 本身为智能体主体**的框架。它不再在每个 Marqdo 函数间传递 `context` 大字典，也不调用另一个外部 Agent 框架生成提示词。

## 最重要的一条约束

每次模型请求只包含：

1. 当前用户输入；
2. 唯一的 `memory.mq.md` 记忆文档；
3. 当前执行的 Marqdo 文稿（根或被选中的 SKILL）。

没有其他模型可见文本。角色、身份、权限、配额、工具审批和任务 ID 只能存于受信宿主**传输元数据**，不属于模型上下文。

## 目录

| 目录 | 唯一责任 |
|---|---|
| `agent/index.mq.md` | 唯一根文稿，分发、授权与收据 |
| `agent/model.mq.md` | 三源模型调用；不接受任意 prompt/messages/sources |
| `agent/io.mq.md` | 从受信宿主隐式获取输入及资源操作 |
| `agent/session.mq.md` | 会话事实和用户授权 |
| `agent/memory.mq.md` | 唯一跨轮 Markdown 记忆投影 |
| `skills/<slug>/index.mq.md` | 直接可执行的无参数 `run()` SKILL |
| `workflows/` | 仅复杂任务使用的 Marqdo 可恢复工作流 |
| `ext/` 和 `lib/` | 可复用 Marqdo 执行、知识和领域库 |
| `server/`、`worker/`、`frontend/` | 认证/任务/网络传输/真实状态 UI，非 Agent Loop |

新增 SKILL 后只需 `python3 scripts/sync_capabilities.py`，更新**当前根文稿本身**的可见能力列表；不创建另一条工具提示或手工注册表。调用端运行时会再次对照实际已安装源文稿核验 ID、来源与效果权限。

阅读 [设计决策与理由](docs/architecture/DECISIONS.md)、[SKILL 开发与接通](docs/architecture/SKILL_AUTHORING.md) 和 [必须遵守的规范](AGENTS.md)。

## 当前分支状态

本分支仍是破坏兼容性的架构实验。已改写 Marqdo 主链与三源传输协议，**没有运行编译、真实模型或端到端验收，也未合并 master**。现有长期记忆仍为会话投影，不代表已实现自动学习式记忆。实际接通与稳定性需要后续验证。

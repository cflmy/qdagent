# 求道 CLI 实验 · 最小架构开发约束

此分支只做 **`marqdo run index.mq.md` 的纯 Marqdo CLI 智能体**，禁止再次扩大成产品栈。

- `index.mq.md` 的 `# main` 是唯一启动入口：`input` 读取终端、`while` 循环、处理退出/记忆命令及打印输出。严禁改回 `marqdo call index.mq.md run` 作为正式启动流程。
- 恰好保留两个 SKILL：`skills/chat/index.mq.md` 和 `skills/model/index.mq.md`。chat 管理当前对话和记忆读取，model 只调用官方 Marqdo `ext/ai/llm.mq.md`；根控制循环。
- 不要为 TTY、消息派发、状态机另加 Python/Go/JS/Rust 服务、Shell REPL、HTTP API、Docker 或前端。
- 最近四轮历史由根中的 Marqdo 列表保存，只在本次运行期间有效；`memory.mq.md` 仅由 `/remember` 明确写入。
- 所有模型消息来自文稿中的 GFM 表及明确传递的输入/记忆/当前文稿。禁止模型调用前由外部框架注入系统上下文和隐式聊天历史。
- 在聊天 SKILL 内需要更多上下文时先用 Marqdo 函数显式读取，再传给模型 SKILL；不要把大型通用 `context` 字典作为每个函数参数。
- 只依赖官方 Marqdo CLI、它安装的 `ext/ai/llm.mq.md` 和标准 `lib/`；不要复制整个扩展库到本仓库。
- 必须保留真实模型错误；失败不应加入成功对话历史，模型返回也不等于任何外部效果得到验证。
- 可在真实需求出现后进一步研究流式 token 输出、单行/多行编辑、自动上下文选择，但不预先增加新的服务或 SKILL。

仓库长期只保留这 8 个文件。没有执行真实验收时，不得声称 CLI 已实际成功运行。

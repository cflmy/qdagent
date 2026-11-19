# 求道智能体 · Marqdo 原生三源上下文规范

**本文件是实验分支开发者和代码生成智能体必须遵守的约束。**

## 不可突破的规则

**每次真实模型请求的内容，严格且仅有三项**：

1. 当前真实用户输入（由可信会话读取）；
2. 工作区唯一的 `memory.mq.md`（只读记忆投影）；
3. 本次执行的 `agent/index.mq.md` 或 `skills/<slug>/index.mq.md` 源文稿。

**禁止**额外 system prompt、框架角色前缀、手写任务提示、候选工具消息、完整聊天记录、其他函数源码、调试信息或 `context` JSON 混入模型消息。模型输出不是权限。

身份、账户、任务 ID、模型配置、额度、来源校验和文件权限依然存在，但属于**不可见的宿主运行元数据**，不能作为每个 Marqdo 函数的 `context` 参数，也不能混入上述三份文本。

## 所有权与目录

- `agent/index.mq.md`：唯一可执行根。仅分发、授权和证据，不进行领域业务。
- `agent/model.mq.md`：普通 Marqdo 模型调用函数，只提供 `ask(role,step)`，**没有 prompt/messages/sources 参数**。三源边界由原生传输核对。
- `agent/session.mq.md`、`agent/memory.mq.md`：真实会话操作和唯一记忆投影；**无 `context` 参数**。
- `skills/<slug>/index.mq.md`：对根只导出无参数 `## run`，内部用 `agent/io.input()` 获得当前用户输入，使用 `agent/model.ask()` 时不额外拼提示。
- `workflows/<domain>/`：只存可选多步 Marqdo 执行；不成为所有对话必须经过的框架。
- `ext/` 和 `lib/`：Marqdo 可复用函数；`ext/qdagent/native/` 仅承担身份、隔离、解析、数据源和模型**传输**，不写第二套 Agent Loop。
- `server/`、`worker/`、`frontend/`：HTTP/授权/资源、服务传输、结果展示，不处理 Agent 决策。

## 怎样新增 SKILL

创建 `skills/<slug>/index.mq.md`：提供 `description`、`agent_effects`、无参 `## run`。不修改根的业务分支、不注册独立 JSON 工具列表。然后执行：

```sh
python3 scripts/sync_capabilities.py
```

生成器只把源码派生的能力表写进**正在执行的根 Marqdo 文稿**；不生成或传送第四份模型上下文。运行时目录继续使用真实 SKILL 源码和官方解析器核对 ID、效果和摘要。

详细步骤：[SKILL 开发指南](docs/architecture/SKILL_AUTHORING.md)。设计原因：[三源 Marqdo 架构](docs/architecture/DECISIONS.md)。

## 规范验证

`python3 scripts/check_architecture.py` 做静态目录规范检查；`python3 scripts/sync_capabilities.py --check` 检查生成章节是否过期；`bash deploy/check-document-runtime.sh` 调官方编译器。**本次按用户要求专注开发，未执行正式测试，不宣称可发布。**

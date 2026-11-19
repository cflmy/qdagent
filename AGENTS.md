# QDAGENT V3 · AI 开发者必须遵守的架构契约

**此实验分支不兼容 V2，禁止恢复旧根。** 先读 [架构决策](docs/architecture/DECISIONS.md)、[新增能力及接通](docs/architecture/SKILL_AUTHORING.md) 和 [现状与清理边界](docs/architecture/CLEANUP.md)。

## 唯一职责链

- `agent/`：唯一通用智能体（会话、可信记忆投影、候选目录、最小决策、授权、执行收据）。根入口是 `agent/index.mq.md`。不得加入办公、开发、量子、浏览器或知识业务分支。
- `skills/<slug>/index.mq.md`：一个可安装的领域能力。提供 `## run`，声明 `description` 与 `agent_effects`；由源码和官方 Marqdo 解析器自动发现。不得修改根代码注册新能力。
- `workflows/<domain>/`：仅在多步、依赖、并发或可恢复执行确有必要时使用。每个工作流由对应 SKILL 导入，**不得成为全部对话的强制阶段**。
- `ext/`、`lib/`：可复用的 Marqdo 基础能力。稳定通用库才进入 `lib/`；通用插件领域函数进入 `ext/`。不是另一套 Agent Loop。
- `ext/qdagent/native/`：可信身份、操作系统、解析器、资源权限和收据等无法安全由普通 Marqdo 文稿承担的边界。**不写提示词、模型路由、SKILL 业务状态机。**
- `server/`、`worker/`、`frontend/`：分别是认证/配额/进程与事件、外部服务传输、真实状态与产物展示。禁止另建第二套智能体。

## 新增能力六条硬约束

1. 首选组合已有 `lib/` 与 `ext/`，再创建 `skills/<slug>/index.mq.md`；无需改 `agent/index.mq.md`、`agent/decision.mq.md` 或人工工具注册表。
2. SKILL 目录名必须匹配 `[a-z0-9-]{1,48}`，不得以 `-` 开头/结束。入口源码提供简短 `description`、明确的 `agent_effects: read|model|compute|external|write` 与 `## run` 的两个显式参数 `context`、`goal`。
3. 新增外部或写入效果前先定义权限和失败收据；用户批准仅绑定当前能力源码摘要，不能从模型文本、记忆或文件内容获得权限。失败及效果未知时不自动重放。
4. 模型输出只能是建议、候选或草稿。源码必须经官方编译诊断，行为仍由独立测试、真实操作收据和必要证明支持。不得把 `model_proved` 等同完整正确性。
5. 领域文稿通过 import 组合自己的 workflow 或扩展。不得引用 `ext/root-skill/`、`pages/`、`skills/marqdo-dev/` 等已经删除的结构，也不得建立新的跨目录业务注册表。
6. 修改运行时目录/协议须同步维护本文档和开发指南；拒绝“通过加兼容层恢复旧工作流”这种做法。

## 接通路径（只有这一条）

`skills/<slug>/index.mq.md` → `agent/catalog.discover`/ `resolve`（官方解析 + 文件摘要）→ `agent/decision.choose`（精确 ID）→ `agent/session`（必要的用户授权）→ `agent/executor.call`（受控调用 `run(context,goal)`）→ 真实收据。

需要跨步任务时：`skills/<slug>/index.mq.md` import `workflows/<domain>/index.mq.md`；无需增加第二个入口。

## 禁止伪造验收

可以用 `python3 scripts/check_architecture.py` 检查基础目录约束，用 `bash deploy/check-document-runtime.sh` 做官方语法检查（需安装 Marqdo）。**这些都不能替代真实端到端验证。用户本轮要求架构收尾，尚未运行测试、未部署、未合并 master。**

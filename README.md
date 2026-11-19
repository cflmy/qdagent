# 求道智能体（Marqdo Native Capability Agent）

求道是以 **Marqdo 可执行文稿**为根的探索性智能体框架：SKILL 是代码、文档和可寻址知识的统一单元；模型只做所需的语义判断，Marqdo 负责执行与验证，宿主负责信任边界。

> **实验架构 v3**：本分支已经写入核心与领域代码，但按要求未运行测试、未部署、未合并主分支。当前代码不代表验证完成的生产版本。

## 入口与模块

| 目录 | 责任 |
|---|---|
| `agent/` | 唯一智能体入口、短决策、能力目录、任务会话与效果授权 |
| `skills/` | 独立领域能力包：chat、research、code、office、knowledge、quantum、dev |
| `workflows/` | 可选的多阶段软件开发、研究报告及知识证明工作簿 |
| `ext/` | 可复用 Marqdo 扩展库和 qdagent Rust ABI |
| `lib/` | Marqdo 标准函数 |
| `server/` | Go HTTP 服务、身份、配额、任务进程与事件 |
| `worker/` | 模型和搜索服务网络传输，不定义 Agent Loop |
| `frontend/` | 真实执行状态、能力授权、执行收据和工作台 |
| `docs/` | 新架构规范、历史设计及开发说明 |

智能体实际入口是 **[`agent/index.mq.md`](agent/index.mq.md)**，不是仓库根 `index.mq.md`，也不是旧 `ext/root-skill/`。客户端仅将当前真实任务交给此入口；模型不能自行产生可执行工具路径。新 SKILL 由实际源码文件与官方语法解析构成能力索引，不需要写另一个业务注册表。

**后续开发入口**：先读 [设计决策与理由](docs/architecture/DECISIONS.md)，再按 [SKILL 开发与接通指南](docs/architecture/SKILL_AUTHORING.md) 添加能力，并遵守 [AGENTS.md](AGENTS.md)。完整分层见 [V3 架构基线](docs/architecture/CAPABILITY_AGENT_V3.md)，最小可读文稿样例见 [minimal-skill.mq.md](docs/examples/minimal-skill.mq.md)。

新能力默认只需要 `skills/<slug>/index.mq.md` 的 `description`、`agent_effects`、`run(context,goal)`：能力目录按实际源码和官方 Marqdo 解析器发现它。**不得为了注册一个能力修改根入口、Go 工具枚举或另一张 JSON 注册表。**

提交前可执行 `python3 scripts/check_architecture.py` 检查基本目录约束；它不是正式编译、权限检查或业务验收。

### 当前语义

- 只读对话直接执行，不强制走四阶段工程流程；
- 对候选 SKILL 只执行小模型一次短选择，失败只允许一次格式修复；
- 外部操作和可变更操作需按源码版本、身份与会话修订取得授权；
- 跨轮模型上下文只读一份由可信状态投影的 `memory.mq.md`；
- 专业工作流独立编写和执行，软件开发不再是根的通用阶段；
- 真实知识证据含来源、依赖、Lean 作用域及实验收据；模型生成说明不等于证明。

旧的 `ext/root-skill/`、`pages/` 业务实现、旧知识发布控制台与旧开发流程测试已从此实验分支删除。可执行知识和 Lean 证明保留在新 `skills/knowledge/` 与 `workflows/knowledge-compilation/`，公共系统能力保留在 Marqdo 扩展及最小原生 ABI。

## 状态

仅完成架构与源代码撰写。**没有主动运行 Marqdo CLI、Rust、Go、前端、真实模型或端到端测试。** 可用性和安全性仍需要另一轮独立验证。实验分支不代表可以直接发布。

详细删除决策、保留的底层功能和不兼容变化见 [V3 清理记录](docs/architecture/CLEANUP.md)。

# 求道 v3：Marqdo Native Capability Agent

> 实验分支架构基线。2026-11-19。**此分支只写架构与实现，不代表已构建、测试、部署或验收。** 阅读源码时先看 `agent/index.mq.md` 和 `skills/<id>/index.mq.md`。

## 一句话

**能力是 Marqdo 文稿，技能可由源码自动发现，知识与证明可复用；LLM 只负责确实需要概率判断的最小决定，宿主仅实现资源和执行边界。** 软件开发、研究报告、知识编译各有工作流，但任何工作流都不是根智能体的强制阶段。

## 唯一执行主线

```text
Go HTTP / authentication / run events
                 │ authenticated context
                 ▼
        agent/index.mq.md   ← only production run entry
                 │
        agent/session       (revision, actual user decision)
                 │
        agent/catalog       (installed .mq.md + official parser)
                 │
        agent/decision      (one exact ID, zero/one bounded correction)
                 │
        agent/executor      (native source pin + effect authorization)
                 │
          skills/<id>/index.mq.md
             │          │
      simple run      workflows/*
             │          │
           Marqdo compiler, ext/ai, lib/subtask
                 │
       receipt + provenance + final state
                 │
       Go streams, React displays actual evidence
```

### 1. agent/ —— 只实现通用机制

| 文稿 | 唯一责任 |
|---|---|
| `index.mq.md` | 读取状态、分发、汇总结果 |
| `catalog.mq.md` | 读取已安装能力索引，解析精确 ID |
| `decision.mq.md` | 小模型候选选择，失败关闭 |
| `context.mq.md` | 短上下文和不具执行意义的状态投影 |
| `memory.mq.md` | 保存一份有版本的只读 Markdown 记忆 |
| `model.mq.md` | 连接已受配额约束的真实模型传输 |
| `session.mq.md` | 用户输入与外部效果批准，由原生 CAS 保存 |
| `executor.mq.md` | 提交真实能力 ID，由 ABI 再核验 |
| `evidence.mq.md` | 测试、证明、来源、运行收据的独立等级 |
| `io.mq.md` | qdagent ABI 的唯一薄边界 |

根文稿**不能知道** Word、Python、测试套件、浏览器、Lean 或量子电路的具体实现；新增 SKILL 不修改根路由条件、不复制工具 Schema，也不把所有函数描述交给模型。

### 2. skills/ —— 安装单元，不是提示词集合

每个 `skills/<slug>/index.mq.md`：

- 文件头 `description:` 给模型短摘要，`agent_effects:` 必须是 `read/model/compute/external/write`；
- 提供明确的 `## run` 函数，参数为宿主传入的 `context` 和实际用户目标 `goal`；
- 可以导出其他 `##` 函数给高级用户/其他受控文稿复用，但它们**不自动成为根模型工具**；
- 只读观测、模型输出、草稿、外部数据、实验结论是不同证据；动态语言生成的源码未经编译与审阅不能获得权限。

能力目录由 Rust ABI 读取 `skills/` 实际目录并使用官方 Marqdo parser 检查函数导出；名称由受控目录 slug 决定，摘要与效果来自同一源文件。编译检查与安装是事实，**不会自动成为用户可执行权限**。目前内置：chat、research、code、office、knowledge、quantum、dev。真实权限还受整个 Marqdo 调用的 effects 边界约束。

### 3. workflows/ —— 可选、可恢复的多阶段程序

简单对话直接调用 `skills/chat.run`，既不创建复杂计划，也不申请用户审批。工程开发才通过 `skills/dev` 进入 `workflows/software-development`；报告研究与知识证明分别使用独立工作流。

依赖本项目已安装的 Marqdo v2.9.1 `ext/ai/workflow`、`flow`、`subtask`，其状态属于专业工作流而不是根会话的通用 schema。带有副作用的操作永远不能靠输出 `ready` 或 `succeeded` 就被批准；必须核对实际源码、当前身份、权限、用户决定和真实工具收据。并发仅用于没有真实依赖和效果冲突的工作。

### 4. 短上下文和可信知识

默认每次模型只接收：

```text
已核验的 task memory.mq.md 一份（来源是 session state）
当前任务目标
下一步决定所需的候选 ID 与短摘要 / 当前函数契约
自身最近一次必要诊断（可选）
```

实际消息包须受 8 KiB 上限检查；超限不得默默截断冻结规格。根模型不会看到整个 `ext/`、完整 `docs/`、其他子智能体的工作记录。引用 `mq://`、稳定锚点、来源哈希、proof-deps、Lean 模块证书与独立测试收据，在需要时由知识 SKILL 单独加载。不能仅凭 `model_proved` 就声称任意插件、动态类型或量子设备行为已经证明。

## 用户与副作用

根发现能力后，小模型只输出精确候选 ID。只读 SKILL 不需要人为的“每次确认”；`external/write` 在当前实验策略中需要用户批准，批准只绑定具体能力 ID 和源码 SHA。来源变化、任务变更、用户拒绝、过期修订均使授权失效。插件加载、官方编译成功、子进程退出零、模型生成的文字，**都不单独构成操作成功**。

授权保护由服务端身份、`agent_session_*` 状态 CAS 和 `agent_skill_call` 的源码与效果检查共同提供。Web 不解释角色的业务语义，用户输入不能选择任意源码路径或 effects 字符串。

## 任务分层而不是文件夹堆积

```text
qdagent/
  agent/           # 通用智能体执行与文稿接口
  skills/          # 一技能一目录，源码即目录事实源
  workflows/       # 仅复杂任务才创建检查点
  ext/             # Marqdo 扩展与 qdagent 原生 ABI
  lib/             # Marqdo 标准函数库
  server/          # 身份、配额、进程、事件
  worker/          # 模型和外部服务网络适配（不是 Agent Loop）
  frontend/        # 真实状态、效果确认、文件和执行收据
  docs/            # 权威新架构规范及历史设计
  tests/           # 后续独立验证（此次不执行）
```

旧的 `ext/root-skill/` 是 v2 软件自动开发的历史实现，**不再是生产入口、SKILL 目录，也不能作为新能力开发模板**。保留其源文件仅用于以后抽取有价值的冻结测试、文稿写入与进程隔离；新能力不得 import 旧根。知识、搜索、浏览与办公的既有 `ext/` 底层实现仍可能有历史依赖，应逐包改造，不能因为入口已经改为 v3 就宣称所有旧扩展已解耦。

## 目前代码边界与后续验证

本分支已经写入能力发现、通用 session、效果批准、受控 CLI 调用、领域 SKILL、可选工作流与新前端，但 **尚未运行编译、HTTP、浏览器、Rust、Go、模型或量子插件测试**。因此不能把它宣布为可部署生产版本。

下次独立验证必须按顺序做：官方 Marqdo 解析；Rust crate 的 parser/权限/超时/CAS；Go 服务调用与状态 schema；React 类型与交互；真实小模型路由准确率及 token；SKILL 安装/禁用/源码改动后失效；并发、用户拒绝、外部失败与恢复。必须特别验证版本绑定、每个 skill 的实际插件加载、首次上下文预算、知识证明只读与真实 Office 产物。未经验证，不合并主分支。

# 求道智能体 · Marqdo 原生自主上下文架构契约

> **2026-11-19 设计修订**：以 [CONTEXT_SOVEREIGNTY.md](docs/architecture/CONTEXT_SOVEREIGNTY.md) 为新架构权威说明。此轮仅定稿设计，不声称当前代码已支持动态上下文工作集。

## 一个明确的原则

**上下文的选择与使用权属于正在执行的 Marqdo 智能体。** 外部 Go/Python/Rust 框架不得提前拼整份聊天、工具表、多个来源文本或隐藏提示词灌入模型。Marqdo 自己通过可寻址文稿、函数与知识制品，决定还需读取什么、读到什么粒度、保留多久。

默认 bootstrap 是**当前用户输入 + 记忆入口 + 活跃 Marqdo 文稿**，但**不是绝对上限**：模型可以经 Marqdo 主动请求局部源码、知识锚点、运行收据、证明依赖和外部已授权来源。每次扩展均需记录引用、作用域、来源摘要、预算与生命周期。**禁止把“三源启动默认值”重新写成“永不允许第四份内容”的约束。**

运行时的用户身份、密钥、额度、授权、模型配置与文件隔离是**非模型可见的权限事实**，不能通过自主读取扩大权限。模型建议的上下文扩展不是系统指令。

## 目录与所有权

- `agent/index.mq.md`：唯一根文稿；只定义通用调度和最小分发。
- `agent/context/`：**拟新增** Marqdo 细粒度上下文层，提供 `bootstrap/request/inspect/read/expand/pin/release/compact/snapshot` 语义。先组合 Marqdo `ext/ai/context`、知识编译器和稳定锚点，不要自己写另一套解析器。
- `agent/model.mq.md`：模型传输由 Marqdo 明确选择的当前工作集驱动；外部传输层不能悄悄增添来源。
- `agent/memory.mq.md`：可持久化、可寻址、按需阅读的记忆；写入必须经过证据与权限门禁。
- `skills/<slug>/index.mq.md`：领域能力；自己根据需要读取具体上下文，不让根预装大量领域知识。
- `workflows/<domain>/`：可选的真实 Marqdo 多步执行及可重放检查点。
- `ext/`、`lib/`：可复用的 Marqdo 原语；原生 Rust/Go 只处理权限、OS、文件锁、传输与来源验证，不是 Agent Loop。

## 新增能力

使用 `skills/<slug>/index.mq.md`，声明真实 description / effects 和可调用 `run`，由源码生成并校验能力目录。能力需要新知识时，调用未来的 `agent/context/` 接口，而不是在 `model.ask(prompt=...)` 随意拼接文本，也不新增外部 Python 工具分派。

复杂任务用 `workflows/`，领域纯函数先用 `ext/`、`lib/`。通用根禁止业务专用的规则分支和固定四阶段。

## 特别注意当前实现与目标设计的区别

当前实验代码上一轮实现了**严格三源硬限制**、无 context 参数和最小记忆读入。这仅是过渡性原型；**它尚不满足本 ADR 的自主细粒度选择**。下轮开发时应替换该硬限制，而不是通过额外 Python Agent 拼 Prompt 绕过。

参见 [设计理由](docs/architecture/DECISIONS.md)、[SKILL 开发说明](docs/architecture/SKILL_AUTHORING.md) 和 [完整上下文目标](docs/architecture/CONTEXT_SOVEREIGNTY.md)。未经独立验证不得声称编译通过或已经部署。

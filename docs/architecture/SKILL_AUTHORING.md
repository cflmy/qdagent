# 如何新增、扩展和接通 Marqdo 能力

开发请先读 [架构决策](DECISIONS.md) 和根 [AGENTS.md](../../AGENTS.md)。本文以**当前实际源码索引**为准，不需要另建注册表。

## 1. 新增业务能力的唯一入口

建立 `skills/<slug>/index.mq.md`。例如新增 `skills/literature/index.mq.md`：

```markdown
---
markup: occlusion
title: 文献整理
description: 读取已授权文献并按实际来源整理摘要
agent_effects: read
import:
  text: lib/text.mq.md
---

# literature

用户能读懂的使用场景、范围和证据限制写在这里。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 由宿主提供的可信任务上下文 |
| goal | text | 当前明确目标 |

Use `context`, `goal`。

Return *("文献整理请求：" + `goal`)*.
```

这是教学示例，不代表已经阅读任何文献。实际业务要通过 `ext/` 或 `lib/` 获取真实来源，并以收据标出完成/失败。

**命名约束**：slug 仅含小写字母、数字、连字符，不以连字符开头/结尾，不超过 48 字符；源码 `description` 不超过 240 字；`agent_effects` 必填，值只能为 `read`、`model`、`compute`、`external`、`write`。

**最小函数契约**：对外始终提供可调用的 `## run`，显式声明 `+ `context`` 与 `+ `goal``，并写明输入、边界、结果与失败。其余 `##` 函数只是该文稿自身的可寻址内部 API，**不会自动获得根模型权限**。

## 2. 代码放哪儿

| 需求 | 应放的位置 | 为什么 |
|---|---|---|
| 即时回答、研究、Office、量子计算等完整领域能力 | `skills/<slug>/index.mq.md` | 源码与用户可读描述共同成为可安装能力 |
| 一个 SKILL 的辅助函数、说明、局部知识 | `skills/<slug>/*.mq.md` | 领域内聚，不扩大根入口 |
| 多步验收、并发、暂停、恢复、独立测试 | `workflows/<domain>/*.mq.md` | 只有复杂任务付出状态机成本 |
| 多个技能复用的 Marqdo 领域函数 | `ext/<domain>/*.mq.md` | 稳定、可调用、可组合的公开扩展 API |
| 真正通用的短纯函数 | `lib/*.mq.md` | 不捆绑求道业务规则 |
| Go/文件锁、真实 OS 资源、插件 ABI 的安全缺口 | `ext/qdagent/native/` | Rust 仅为语言无法可靠承载的边界 |
| 用户身份、配额、HTTP 与任务进程 | `server/` | 不是 SKILL 业务 |
| 网络适配 | `worker/` | 只做传输，不写 Agent Loop |
| 人类批准、文件、执行证据可视化 | `frontend/` | 只显示真实状态，不决定工具权限 |

例如新增“网页研究”：在 `skills/research/` 导入现有能力，使用真实搜索/浏览接口。**不**新建 `agent/research.mq.md`，也不要修改 `agent/index.mq.md` 增加 `if goal contains research`。

例如新增“量子实验”：若已提供电路仿真函数，直接复用 `ext/quantum/`。需要多轮参数搜索/依赖 DAG，才在 `workflows/quantum-experiment/` 增加独立可执行文稿。不得把该步骤塞入所有任务的统一根。

## 3. 这份 SKILL 如何自动接通

不编辑任何人工工具清单。真实链路如下：

1. 安装源码 `skills/literature/index.mq.md`，把函数签名和 effects 写完整；
2. `agent/catalog.discover(context)` 请求原生 `agent_catalog_list`：Rust 遍历实际 `skills/`，用**官方 Marqdo parser** 检查是否导出 `run`，读取文件头的 `description` / `agent_effects`，返回短候选 ID；
3. `agent/decision.choose` 只选择一个目录 ID；`agent/catalog.resolve(context,skill)` 再返回真实源码路径、摘要和效果类别；
4. `agent/session` 根据效果和当前身份决定是否需用户授权。当前代码中 `external`、`write` 必须经一次性、绑定源码哈希的批准；
5. `agent/executor.call` 调用原生 `agent_skill_call`，由它重新解析能力 ID、检查源码版本与授权，再用 Marqdo CLI 调用文稿的 `run(context,goal)`；
6. 真实结果、失败/未完成状态及源码摘要交给 `agent/evidence` 与会话持久化，前端只显示实际收据。

因此新增 SKILL **不应修改** `agent/index.mq.md`、`agent/decision.mq.md`、`ext/plugins.mq.md`、Go 路由或前端导航。插件清单是底层扩展安装事实；`skills/` 是智能体能力索引，二者不能混为一谈。

**部署提醒**：当前 Dockerfile 已包含 `skills/`、`agent/` 和 `workflows/`。新文件必须进入镜像/运行仓库才能被发现。未经过正式测试前，不能保证一次新增就能在真实服务执行。

## 4. 独立工作流如何接通

复杂能力仍从 SKILL 入口开始，例如：

```text
skills/dev/index.mq.md
  import workflows/software-development/index.mq.md
     → workflow.run(context,goal)
     → workflow.advance(context)
     → workflow.draft(context,contract)
     → workflow.check(context,source)
```

工作流自己的检查点、源码哈希、知识证明依赖由它自己维护；通用根只关心选哪个能力、是否获准、运行是否有真实收据。用户批准一次 SKILL **不等于**允许随意执行工作流内部所有未声明效果；新增副作用必须继续遵守执行器和 Marqdo effects 边界。

## 5. 提交前检查与验收口径

架构检查（静态目录检查，不替代编译）：

```sh
python3 scripts/check_architecture.py
```

官方语法检查：

```sh
bash deploy/check-document-runtime.sh
```

能力文稿可按 Marqdo CLI 的实际参数调用；示意：

```sh
marqdo check skills/literature/index.mq.md --json
# 正式运行时由 Go/Agent 注入可信 context，不能手工伪造用户身份。
```

检查时要分清：**(a) 文件可以被发现；(b) 文稿可被编译；(c) 宿主有合法权限；(d) 真正业务达到验收并留有证据**。四者不互相替代。本实验分支尚未执行这些测试。

知识与 Lean 证明是按目标生成的局部证据：记录源摘要、依赖、假设和作用域。证明模型未覆盖的插件、异常、副作用、真实量子设备，应标注为未证明，而不是交给模型口头补齐。

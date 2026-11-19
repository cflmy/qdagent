# 新增 SKILL 与自主上下文（设计规范）

先阅读 [CONTEXT_SOVEREIGNTY.md](CONTEXT_SOVEREIGNTY.md) 和仓库根 [AGENTS.md](../../AGENTS.md)。

## 新增业务能力

建立 `skills/<slug>/index.mq.md`，声明可读 `description`、真实 `agent_effects` 与明确的 `## run` 函数。通过 `scripts/sync_capabilities.py` 从实际源码生成根文稿的能力目录章节，运行时再次核验已安装 SKILL ID 与源码摘要。**新增一个能力不需要修改通用根的业务分支。**

当前分支的 `run()` 无需接收大型身份 `context` 参数；模型调用从真实会话读取当前输入和记忆。以后也不应把上下文工作集重新做成每层都必须传递的大 Map。

## SKILL 如何获取更多信息？

领域 SKILL 先用自身文稿和默认小工作集完成能做的事；缺乏信息时，由模型提出**具体的上下文读取意图**。后续应通过 `agent/context/` 的 Marqdo 语义接口（尚未实现）完成：

```text
context.inspect(symbol_or_ref, depth)
context.read(ref, scope, budget)
context.expand(ref, dependency_or_caller)
context.pin(ref, until)
context.release(ref)
```

这些是**设计中的签名，不是已发布的 Marqdo API**。真正的源码定位优先复用 Marqdo 的 parser、`ext/ai/context.scope` 与知识编译器。模型提出的路径/锚点需经合法来源解析和宿主权限过滤，不能变成任意文件或网络执行授权。

## 一个具体场景

用户要求：“修复 Marqdo 知识编译器中的后置条件组合。”

1. 当前 `skills/code/index.mq.md` 作为执行文稿启动。用户目标和相关记忆可以作为默认基底；
2. 智能体发现缺少 `compose` 函数契约，提出 `context.request(scope=function, ref=...)`；
3. Marqdo 返回精确函数及源码摘要；模型阅读后决定是否继续获取所调用函数的后置条件或一条失败证据；
4. `context.pin` 暂留当前必要函数，`context.release` 清掉无关候选；
5. 代码或证明仍由真实 Marqdo 函数执行，产出可验证来源和收据；重要事实经审查后才沉淀到记忆。

不是把整个 `marqdo/`、全部工具定义或历史会话一次性塞给模型。**上下文应当是可执行的选择，而非固定模板。**

## 文件应该放在哪里？

| 内容 | 建议路径 |
|---|---|
| 通用上下文选择策略、工作集生命周期 | `agent/context/`（目标设计） |
| 具体学科的上下文策略、提示协议 | `skills/<domain>/` |
| 独立步骤、并发和来源检查点 | `workflows/<domain>/` |
| 稳定的源解析、知识寻址与证据函数 | 现有 Marqdo `ext/`、`lib/` |
| 真实权限、进程、文件锁、模型网络传输 | `ext/qdagent/native/` 与 Go |
| 模型可读的长期记忆 | 工作区 `memory.mq.md`（受控写入） |

## 验收理念

重点不是每轮永远只有三份文本，而是**默认只读必要信息，扩展由模型提出、由 Marqdo 执行，来源可核对，历史与权限绝不自动灌入**。后续实施要比较 token 消耗、读取精度、是否重复请求、来源过期与多 SKILL 连续性。本轮只定设计，不声称实现或验收通过。

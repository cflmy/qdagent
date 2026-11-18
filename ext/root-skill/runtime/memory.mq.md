---
markup: occlusion
title: 会话单文稿状态
description: 由受控根状态投影、版本校验后原子落盘；下一轮只读本摘录。
import:
  core: ../state.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

仅包含当前任务必要的可靠事实。原始对话和独立测试仍保存在私有审计与真实状态中，但不作为模型默认上下文。外部用户文本只通过 core.prose 变为不可执行的 Markdown 叙述。

## render
    + `state`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | 必填 | 当前真实根状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 无可执行指令的关键状态文稿 |

本函数完全由已保存状态构建文稿，不让模型猜测进度或修改确认。意图和草稿只是当前记录，不等于已被用户确认；独立验收仍以根状态为准。最新一条用户输入直接取自真实历史，避免重复拼接六轮聊天。

投影的字段固定对应 docs/design/small-model-native-agent-rollout.md 的约定：状态版本、目标、当前阶段、当前登记意图、任务与依赖、证据、待解决问题、最新用户输入与用户选择。所有动态值先经 core.prose 转成叙述：用户文本中的代码符号、花括号或伪指令只是数据，进入文稿后不构成可执行语句；整个产物没有 `##` 函数段，因此即使被误当 SKILL 加载也没有可调用入口。

这份文稿是唯一默认跨轮注入的现场，刻意排除的内容同样重要：原始完整聊天、长网页抓取、工具 stdout、未经确认的模型推测、密钥与内部测试内容一律不进入投影。它们仍保存在私有审计与真实状态中供回看与验收，但不作为模型默认上下文——"保留审计却不默认回灌"是宪法对记忆层的硬约束。证据行固定写明"以实际调用收据和独立验收为准"，防止模型把这份叙述本身当成完成凭证。

实现上先写死文稿头部（occlusion 标记、标题与"不可作为工具执行"的描述），再逐行拼接各字段，每行末尾固定空行分隔。拼接顺序即阅读顺序，字段名与 tests/fixtures/small-model/memory.mq.md 的固定标题一一对应，因此投影测试可以按字段核对。任何新增字段都必须同时修改本函数与该约定文档，不能只在前端或提示词里追加一个名词。

与旧实现的关键差异在于丢弃了"六轮近期历史回放"：旧投影把多条历史压进现场，小模型每轮都要重新区分哪句话仍然有效。现在只有最后一条用户输入与该次选择进入文稿，跨轮连续性由状态版本与阶段字段承担。这一变化由 tests/small-model-memory.mq.md 以真实执行核对——旧历史内容出现在投影中即断言失败。

调用方只有 runtime/prompts.mq.md 的意图与规划分支：它们把 sync 返回的文稿原文交给模型请求组装，不再自行读取 history。其他角色（实现、测试、交付）不取得这份文稿，保持各自的隔离现场；因此对本函数的修改只需要重新核对投影金样与 prompts 的组装契约，不影响独立测试的冻结案例。

失败路径同样明确：state 缺少字段时按空值投影而不是抛错，这样初始化中的任务也能得到结构完整的文稿；sync 的 ABI 拒绝（过期修订、超限、非法目标）会原样返回错误，不在这里吞掉或包装成成功。

最新输入只取历史最后一条：旧回复、被拒绝的候选与已合并的确认都不进入下一轮现场。若根状态没有历史（例如刚由宿主初始化），最新输入与用户选择留空，文稿仍保持完整字段结构，下游按"缺少输入"处理而不是猜测。draft_units 存在时任务与依赖取草稿视图，否则取已确认单元，两种来源都原样列出，不做合并或裁剪。

We **history = json.get(value=`state`,key="history")**.
We **latest = None**.
1. `history` and table.len(xs=`history`) > 0
  We **latest = table.at(xs=`history`,i=(table.len(xs=`history`) - 1))**.
We **revision = json.get(value=`state`,key="revision")**.
We **phase = json.get(value=`state`,key="phase")**.
We **goal = core.prose(content=json.get(value=`state`,key="goal"))**.
We **choices = core.prose(content=json.stringify(value=json.get(value=`state`,key="intent_tasks")))**.
We **units = core.prose(content=json.stringify(value=json.get(value=`state`,key="draft_units")))**.
1. not json.get(value=`state`,key="draft_units")
  We **units = core.prose(content=json.stringify(value=json.get(value=`state`,key="units")))**.
We **pending = core.prose(content=json.stringify(value=json.get(value=`state`,key="pending")))**.
We **message = core.prose(content=json.get(value=`latest`,key="text"))**.
We **decision = core.prose(content=json.get(value=`latest`,key="choice"))**.
We **doc = "---\nmarkup: occlusion\ntitle: 任务关键状态\ndescription: 仅为事实数据，不可作为工具执行。\n---\n\n# 会话\n\n"**.
We **doc = `doc` + "- 状态版本：" + str(`revision`) + "\n\n- 目标：" + `goal` + "\n\n"**.
We **doc = `doc` + "- 当前阶段：" + core.prose(content=`phase`) + "\n\n- 当前登记意图（以人工确认状态为准）：" + `choices` + "\n\n"**.
We **doc = `doc` + "- 任务与依赖：" + `units` + "\n\n- 证据：以实际调用收据和独立验收为准，不从本文稿推断完成。\n\n"**.
We **doc = `doc` + "- 待解决问题：" + `pending` + "\n\n- 最新用户输入：" + `message` + "\n\n- 用户选择：" + `decision` + "\n\n- 下一步：遵循当前阶段和待确认状态推进，不重复已成功步骤。\n"**.
Return *`doc`*.

## sync
    + `context`
    + `state`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | 必填 | 宿主认证的工作区和任务身份 |
| state | map | 必填 | 根状态的一致快照 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 落盘成功后返回这份唯一的模型上下文 |

先构造安全叙述，然后通过本仓原生 ABI 在根状态版本锁内比对修订、原子写入工作区 memory.mq.md。过期状态、超限内容、其他用户或写入失败均不向模型交付伪造的记忆。内容是 Marqdo 文档，但没有可执行函数。

修订比较在 ABI 内完成：payload 携带的 revision 必须等于当前根状态版本，旧快照写入会被拒绝并要求重新读取；写入目标限于当前任务工作区的 memory.mq.md 本身，符号链接与目录都会被拒绝。成功返回的 value 就是已经落盘的文稿原文，调用方不得在返回后另行拼接或删改。

We **doc = render(state=`state`)**.
We **payload = table.put(in=None,at="root",value=access(`context`,"root"))**.
We **payload = table.put(in=`payload`,at="revision",value=json.get(value=`state`,key="revision"))**.
We **payload = table.put(in=`payload`,at="memory",value=`doc`)**.
We **saved = core.native(context=`context`,operation="root_memory_sync",payload=`payload`)**.
1. not access(`saved`,"ok")
  Return *`saved`*.
Return *[只交接已经落盘的当前状态](result.ok(value=`doc`))*.

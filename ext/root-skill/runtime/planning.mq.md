---
markup: occlusion
title: 主任务分配意图与框架函数段
import:
  core: ../state.mq.md
  routing: ../routing.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

主任务从真实意图清单选择下一项尚未进入方案的职责，再为本轮分配稳定函数身份。模型只填写业务说明，不再重复生成、转义或猜测意图身份。角色和当前文稿仍由根流程确定，调用结果经过保存之后才会推进。

## scene

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 根流程的可信规划现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 仅包含本轮意图与函数身份的受限现场 |

Use `context`。

优先覆盖还没有函数负责的意图。每一项都已经由用户确认工作方式，所以规划者不需要再次选择模式或填写一份相同的路由记录。没有意图清单的旧任务继续使用原规划文稿，不能凭升级推断新的用户批准。完成全部意图并满足用户指定函数数量后，下一现场只提供发表函数，模型无法跳回重复定义。

用户限定更多函数时，可以为同一个意图继续拆段；新增函数始终有独立稳定身份。这里先选择尚未覆盖的目的，再在需要继续拆段时保留已有意图。若旧草稿已经占满数量却遗漏目的，则继续使用可修订的旧入口，不能偷偷删除某个职责或把超出数量的版本强行发表。实际发表仍会核对覆盖、数量、依赖和完整源码，随后由用户审阅。

分配函数身份只是组织框架，不预先定义业务内容，也不产生通过状态。当前意图、下一段身份与原始用户要求一起交给主模型，其他角色仍只获得自己的冻结规格。每次选择都从最新状态恢复，断线后不会依赖模型记住前一轮变量，多个同名标题也不会覆盖同一个函数。新增能力仍要通过实际 SKILL 文稿和原有权限检查，不从任意模型路径加载程序。

这种分工把不需要模型判断的重复工作交给可执行文稿。函数身份按实际占用情况分配，意图关联来自先前用户确认；模型的能力用在职责、输入返回与业务约束上，而不是重复拼写内部标识。保存成功的回执使用真正入账的记录，下一轮从它继续。一个模型答复即使说已经保存两项，也不会让实际只有一项的状态前进。

清单完整是计划范围的检查，不证明内容正确。框架仍包含明确未接通的实现标记，源码检查与摘要建立后交用户确认；独立测试和实现随后才开始。主任务在这一步不读取子任务私有实现，也不把另一个角色的历史注入当前上下文。若新约束与已确认模式冲突，必须重新对齐意图，不能为方便完成而静默扩大入口。

主模型能读到已保存职责，因此可以说明当前段怎样与前面的输入和返回衔接。函数分配只解决所有权与工程组织，不替模型完成语义设计。最终用户应在真实框架中检查职责是否充分、依赖是否合理，以及是否仍有遗漏的使用场景。

We **state = access(core.status(context=`context`),"value")**.
We **intents = json.get(value=`state`,key="intent_tasks")**.
1. not `intents`
  Return *context*.
We **drafts = json.get(value=`state`,key="draft_units")**.
1. not `drafts`
  We **drafts = table.empty_list()**.
We **expected = json.get(value=access(`state`,"settings"),key="expected_units")**.
We **selected = routing.missing(intents=`intents`,units=`drafts`)**.
1. `selected` == None
  1. not `expected` or table.len(xs=`drafts`) >= `expected`
    Return *table.put(in=`context`,at="variant",value="publish")*.
  We **selected = table.first(list=`intents`)**.
2. `expected` and table.len(xs=`drafts`) >= `expected`
  Return *table.put(in=`context`,at="variant",value="")*.
We **ids = table.empty_list()**.
- [保留所有已经保存的段落身份](for drafts as unit)
  We **ids = table.append(list=`ids`,item=access(`unit`,"id"))**.
We **numbers = table.range(start=0,end=8)**.
- [只分配尚未被其他职责占用的函数段](for numbers as number)
  We **id = "u" + json.stringify(value=`number`)**.
  1. not table.contains(list=`ids`,item=`id`)
    We **context = table.put(in=`context`,at="outline_id",value=`id`)**.
    We **context = table.put(in=`context`,at="outline_intent",value=`selected`)**.
    Return *table.put(in=`context`,at="variant",value="intent-slot")*.
Return *table.put(in=`context`,at="variant",value="")*.

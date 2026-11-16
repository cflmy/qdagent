---
markup: occlusion
title: 根 SKILL · intent
import:
  routing: routing.mq.md
  core: state.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  re: lib/re.mq.md
  hash: lib/hash.mq.md
  plugin: lib/plugin.mq.md
---

本模块是根 SKILL 的实际实现。公开入口见 [根流程](index.mq.md)，当前阶段的工程规范见 guides/。参数、返回和失败条件紧邻每个函数，调用不依赖隐藏的聊天规则。

## clarify_intent

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| summary | text | required | 模型对当前目标的理解 |
| question | text | required | 现在需要用户回答的一个问题 |
| choices | list | required | 二到六个可选文字，用户始终可以自由输入 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 待用户回答的意图卡片，阶段仍为 intent。 |

Use `context`, `summary`, `question`, `choices`。

意图拆解本身是一个函数。先阅读用户原话和已有答复，再用一个有区分度的问题缩小目标。
选项必须是用户能理解的选择，不把实现细节强加给用户；自由输入始终可用。每次只挂起
一个问题，答复后可再次调用本函数，多轮澄清不会自动批准。当前问题与摘要一同保留，
确认按钮所批准的是这个确切版本。模型不能传入 confirmed 或 actor 字段，也不能通过
发出一句“用户已经同意”前进。没有待回答问题和真实回复的意图不能进入基本方案。
失败会保留原问题；重复或并发调用不能用新的问题悄悄覆盖用户正在填写的内容。

A question is a persistent user interface contract. Its summary, choices and revision stay together while the user edits the response. Continuing clarification and confirming intent are separate user actions; neither is inferred from elapsed time or a model's confidence.

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "intent" or json.get(value=`state`,key="pending")
  Return *result.error(code="root.stage",message="当前阶段不允许覆盖意图问题",operation="clarify_intent")*.
1. table.len(xs=`choices`) < 2 or table.len(xs=`choices`) > 6 or `question` == "" or `summary` == ""
  Return *result.error(code="root.question",message="需要明确问题、摘要和二到六个选项",operation="clarify_intent")*.

`pending_view` =

| kind | summary | question | choices |
|---|---|---|---|
| "intent" | `summary` | `question` | `choices` |

We **patch = table.put(in=None,at="summary",value=`summary`)**.
We **patch = table.put(in=`patch`,at="pending",value=`pending_view`)**.
Return *core.save(context=`context`,state=table.merge(a=`state`,b=`patch`))*.


## task

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 根任务的可信意图调用现场 |
| id | text | required | 稳定、唯一的小写字母数字下划线或短横线身份 |
| title | text | required | 用户可读的待办名称 |
| purpose | text | required | 这一项意图、交付物与验收边界 |
| mode | text | required | 使用哪种已接入的工作方式 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存的待办与真实 SKILL 路由，仍等待用户确认 |

Use `context`, `id`, `title`, `purpose`, `mode`。

一条用户消息可以包含多个意图。主任务先逐项保存它们，再提问让用户核对遗漏、范围和交付；不要把多个独立产物塞进一个模糊的待办。职责是可读意图，不是业务源码。路由调用普通 Marqdo 函数，由其选择真实文稿与受限入口。用户能在确认前看到任务清单和工作方式，不需要认识内部函数或路径。

相同身份修订同一项，不会重复追加。输入身份中的短横线先统一为下划线，返回和下一轮材料始终使用保存后的规范身份，便于之后直接关联函数标题。最多八项，与当前函数段并发工程的边界一致；数量不代表并发度。任务仍可进一步拆成多个函数段，框架发表时必须覆盖所有确认意图，不得静默丢弃。多轮回答期间可以调整清单，但正在等待用户填写的问题不能被模型覆盖；修改之后必须重新提出问题并交用户确认。

这里不执行研究、编写代码或启动子智能体，不向模型提供确认接口。未知方式、错误阶段、其他角色与无效身份都会明确失败。任务状态由后续真实方案、试运行和验收推导，模型不能通过本函数自报完成。意图清单只作为主任务的职责边界，不进入独立测试上下文；测试仍仅看各自已批准的冻结规格。

对复合需求要保留真正不同的用户目的。例如“先查资料，再给同事一份报告”需要研究与写作两项，不能只记录一条“完成任务”。研究的输入是公开来源与问题，写作的输入是获准材料和读者要求；两项都能在方案中找到对应函数。依赖由基本方案进一步明确，不能因为研究尚未执行就在意图阶段猜测事实。

用户确认前，页面上的待办只显示待确认。规划完成也只表示存在职责边界，试运行通过才显示已验证，最后仍由用户验收。每个状态都对应真实文件或记录，不接受模型传入一个完成百分比。已经生成的清单在后续轮次作为根任务材料交接，子任务不会为理解自己的工作而接收全部清单。这样拆分既便于人审阅，也减少子智能体上下文耦合。

如果用户的最新补充改变了某项意图，使用同一身份修订它，再重新提问；任务进入下一阶段之后需要认证用户选择重新对齐意图。以前的记录保留为只读材料，旧批准不继续授权新任务。接口不接受任意路径、源代码或新效果，选择一种工作方式也不代表其内部调用的外部插件已经启用。
We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "intent" or json.get(value=`state`,key="pending") or json.get(value=`context`,key="role") != "intent"
  Return *result.error(code="root.intent_scope",message="只有根任务能在提问前拆分意图",operation="task")*.
1. not re.is_match(text=`id`,pattern="^[a-z][a-z0-9_-]{0,31}$")
  Return *result.error(code="root.intent_task",message="意图 id 必须以小写字母开头，后接字母、数字、下划线或短横线，最多三十二字符，例如 report_draft",operation="task")*.
1. `title` == "" or `purpose` == ""
  Return *result.error(code="root.intent_description",message="请填写非空 title 可读标题与 purpose 交付边界",operation="task")*.
We **id = text.replace(text=`id`,old="-",new="_")**.
We **resolved = routing.resolve(mode=`mode`)**.
1. not access(`resolved`,"ok")
  Return *resolved*.

`item` =

| id | title | purpose | mode |
|---|---|---|---|
| `id` | `title` | `purpose` | `mode` |

We **item = table.put(in=`item`,at="route",value=access(`resolved`,"value"))**.
We **old = json.get(value=`state`,key="intent_tasks")**.
We **tasks = table.empty_list()** and **found = False**.
1. `old`
  - [只修订当前任务，保留其他用户意图](for old as existing)
    1. access(`existing`,"id") == `id`
      We **existing = `item`** and **found = True**.
    We **tasks = table.append(list=`tasks`,item=`existing`)**.
1. not `found`
  We **tasks = table.append(list=`tasks`,item=`item`)**.
1. table.len(xs=`tasks`) > 8
  Return *result.error(code="root.intent_limit",message="当前最多八项意图，请与用户合并或分批处理",operation="task")*.
Return *core.save(context=`context`,state=table.put(in=`state`,at="intent_tasks",value=`tasks`))*.

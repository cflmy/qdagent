---
markup: occlusion
title: 根 SKILL · planning
import:
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

## outline

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| title | text | required | 工程标题 |
| goal | text | required | 用户确认的目标 |
| acceptance | text | required | 可观察的验收条件 |
| units | list | required | 一到八个记录，包含 id、title、purpose，可选 depends_on 字符串列表 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 可在右侧官方 View 阅读的骨架与待确认版本。 |

Use `context`, `title`, `goal`, `acceptance`, `units`。

基本方案只设计边界、函数单位和验收，不提前实施业务。每个单元是一个具名函数，默认
接收 input，返回 result。框架用叙述说明职责与协作关系，空实现明确写“尚未接通”。
这份骨架保存为 solution/plan.mq.md 并立即交给官方 View 展示，不把一段聊天摘要当成文件。
用户可先修改目标、并发数和子模型，再确认本版本；未确认不能派生子智能体。
单元身份必须稳定、唯一且安全，不允许名称变成路径。依赖只引用已经声明的单元，
最终整合还会检查顺序，避免循环依赖被误当作可以并行。框架中的占位不是运行成功证据。
参数表和返回表放在函数标题下面，正文解释责任与下一步；函数级骨架让并行实现可分工。
源码与状态最后按版本提交，后续阶段始终核对保存文件而不是从答文猜测目标位置。

The outline is a reviewable engineering boundary. Each named unit must have one responsibility and a stable interface, so independent agents can implement different files without editing a shared buffer. The framework remains deliberately incomplete at this point: a runnable placeholder is an honest representation of missing logic, not permission to claim that the business task succeeded. The user reads the actual saved document through the official View, then confirms that exact source version. A changed outline must be reviewed again. Concurrency and model choices are recorded with that decision, so a parent cannot silently raise parallelism or replace a selected child model. A unit name is an identifier rather than a path; validating it prevents accidental overwriting of another unit or access outside the workspace. Later stages keep the accepted responsibilities and explain any limitation in the final source. The artifact, its digest and its pending confirmation form one agreement; a model-written sentence alone cannot supply any of those receipts.

框架的文件摘要必须来自真实文本计算，而非把函数写法当成普通表格数据。确认前先验证这份可阅读骨架，确认时再次比较同一摘要。这样用户看到的职责和实际进入细化的职责保持一致；刷新、并发点击或手动改动不能借用旧确认。每个依赖都只指向前面声明的身份，既方便独立实现，也让最终的执行顺序可核对。

A framework is accepted as an exact artifact, not as an inferred intention. Retain its digest and current revision when requesting approval, and require another explicit review whenever the source changes.

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "outline" or json.get(value=`state`,key="pending")
  Return *result.error(code="root.stage",message="需要真实用户先确认意图",operation="outline")*.
1. table.len(xs=`units`) < 1 or table.len(xs=`units`) > 8 or `acceptance` == ""
  Return *result.error(code="root.outline",message="需要一到八个函数单元及验收条件",operation="outline")*.
We **prepared = table.empty_list()** and **ids = table.empty_list()**.
We **document = "---\nmarkup: occlusion\ntitle: 求道基本方案\n---\n\n# 基本方案\n\n标题：" + core.prose(content=`title`) + "\n\n目标：" + core.prose(content=`goal`) + "\n\n验收：" + core.prose(content=`acceptance`) + "\n\n本阶段只约定框架，所有业务逻辑均尚未接通。用户确认后才进入并行细化。\n\n"**.
- [每个单元都有独立边界](for units as unit)
  We **id = json.get(value=`unit`,key="id")**.
  1. not re.is_match(text=`id`,pattern="^[a-z][a-z0-9_]{0,31}$") or table.contains(list=`ids`,item=`id`)
    Return *result.error(code="root.unit_id",message="单元身份必须唯一且只含小写字母数字下划线",operation="outline")*.
  We **dependencies = json.get(value=`unit`,key="depends_on")**.
  1. not `dependencies`
    We **dependencies = table.empty_list()**.
  - [依赖必须已声明，禁止循环和自身依赖](for dependencies as dependency)
    1. not table.contains(list=`ids`,item=`dependency`)
      Return *result.error(code="root.dependencies",message="依赖只可指向前面已声明的单元",operation="outline")*.
  We **unit = table.put(in=`unit`,at="depends_on",value=`dependencies`)**.
  We **ids = table.append(list=`ids`,item=`id`)**.
  We **unit = table.put(in=`unit`,at="status",value="pending")**.
  We **prepared = table.append(list=`prepared`,item=`unit`)**.
  We **document = `document` + scaffold(unit=`unit`)**.
We **_ = fs.make_dirs(path="solution/units")**.
We **_ = fs.atomic_write(path="solution/plan.mq.md",text=`document`)**.

`pending_view` =

| kind | path |
|---|---|
| "outline" | "solution/plan.mq.md" |

We **verified_outline = core.native(context=`context`,operation="root_check",payload=table.put(in=None,at="path",value="solution/plan.mq.md"))**.
1. not access(`verified_outline`,"ok") or not json.get(value=access(`verified_outline`,"value"),key="valid")
  Return *result.error(code="root.outline_check",message=json.stringify(value=`verified_outline`),operation="outline")*.
We **outline_digest = hash.sha256(text=`document`)**.

`patch` =

| units | title | goal | acceptance | outline_sha256 | pending |
|---|---|---|---|---|---|
| `prepared` | `title` | `goal` | `acceptance` | `outline_digest` | `pending_view` |

Return *core.save(context=`context`,state=table.merge(a=`state`,b=`patch`))*.

## scaffold

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| unit | map | required | 已验证身份、标题与职责的单元记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 可读而且明确未接通的单函数骨架 |

Use `unit`。骨架的语义很明确：只约定一个函数接收什么、要完成什么、交回什么，不冒充实现。
函数名使用安全的稳定身份，不用标题作为文件名；用户可改标题而不破坏其他单元引用。
参数表和返回表紧接函数标题，不让读者翻到另一个注册表猜测参数。正文解释该单元的责任，
下一阶段才把空实现替换为真实逻辑。占位的描述明确写“尚未接通”，返回 None 也公开说明。

The generated fragment is deliberately a function, not a block of arbitrary Markdown wrapped around
an invisible implementation. The input and result have broad types at the framework stage so the
user can approve module boundaries before choosing concrete data shapes. A later authoring call must
state its assumptions in narration, preserve this interface or request a framework revision, and run
actual cases against the resulting source. A placeholder has no permission to pass as a completed
business capability. Keeping that fact in its visible label lets both the official View and the labels
query expose it without interpreting the model's intentions. A caller can inspect the same fragment
as a readable development instruction, while the compiler can independently validate its declaration.
The id has already been checked by outline; accepting prose does not give it authority to choose a
server path, a native plugin, or a different execution effect. Output is inert text until saved and
checked at the documented boundary. The final assembly includes the user's decisions and the actual
validation receipts rather than erasing this distinction through a polished final answer.

We **id = access(`unit`,"id")**.
Return *"## unit_" + `id` + "\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| input | any | 本单元的结构化输入 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 尚未接通，细化后才能交付 |\n\nUse \x60input\x60。\n\n" + core.prose(content=access(`unit`,"title")) + "：" + core.prose(content=access(`unit`,"purpose")) + "。本单元当前只约定输入、输出与职责，不把骨架当作业务完成。后续由子智能体实现并使用真实输入试运行，失败会保留具体诊断，确认前不会调用任何业务操作。\n\n在完整工程中，本单元必须说明如何与其他单元交换数据，并遵循参数、返回表与叙述比例要求。这里的返回值只是明确的未接通标记，不能用它证明实际目标已达成。\n\nWe **provided_input = \x60input\x60**.\nReturn *[尚未接通：" + `id` + "](None)*.\n\n"*.

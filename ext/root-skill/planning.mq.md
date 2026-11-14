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
| artifact_kind | text | "" | 用户要求的办公文件类型，仅 docx 或 pptx |
| units | list | required | 一到八个记录，包含 id、title、purpose，可选 depends_on 字符串列表 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 可在右侧官方 View 阅读的骨架与待确认版本。 |

Use `context`, `title`, `goal`, `acceptance`, `units`, `artifact_kind`=""。

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

框架模式也是公开契约的一部分。text 明确表示无论输入都返回已确认正文；select 表示从实际输入按字段路径取值；code 才交给作者编写业务运算。这个选择必须出现在用户审阅的方案里，不能在实现阶段临时改变为更宽的权限。对不确定的输入规则应在意图阶段继续询问，不能用一个“通用功能”职责掩盖未知条件。职责按依赖顺序排列；依赖存在只能证明工程可组合，不能证明函数产生了符合业务的返回。

计划文稿保留题目、目标、验收、参数、返回、职责与未接通状态。用户看到的是这些真实边界，后续冻结的测试规格也取自它们。若用户要求调整职责，原摘要、旧独立测试和已实现单元不能继续充当新方案的证据。并发数只是执行上限，不能让后续职责越过前置约束。

用户可以在意图确认时限定业务函数的数量。这个数量描述交付边界，不是并发设置；当前草稿不足或多余时，发表必须失败并返回实际数量，不能为了得到一份完整文稿自动补占位函数。模型随后继续保存真正需要的职责，或者用户通过返工改变原约定。数量正确只是必要条件，职责是否符合业务仍需用户阅读实际框架。

办公产物也是明确的方案契约。没有要求时保持空值，交付角色只得到整合入口，不同时看到与当前任务无关的文件构造函数。确实需要 docx 或 pptx 时，类型写在方案里供用户确认，再开放现有办公插件的调用文稿。办公插件仍可被用户关闭，确认方案不能绕过这个开关，生成失败更不能用一个同名文件链接代替实际结果。

这些约束都与真实方案一起保存。函数数量来自已认证用户选择，产物类型来自可审阅的规划；它们不从一段模型完成消息或执行动画推断。发表前统一核对，发表后暂停等待确切版本确认。任何一项不成立都保留草稿与诊断，不能把未完成的规划直接交给作者实现。

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "outline" or json.get(value=`state`,key="pending")
  Return *result.error(code="root.stage",message="需要真实用户先确认意图",operation="outline")*.
1. table.len(xs=`units`) < 1 or table.len(xs=`units`) > 8 or `acceptance` == ""
  Return *result.error(code="root.outline",message="需要一到八个函数单元及验收条件",operation="outline")*.
We **expected = json.get(value=access(`state`,"settings"),key="expected_units")**.
1. `expected` != None and `expected` > 0 and table.len(xs=`units`) != `expected`
  Return *result.error(code="root.unit_count",message=("用户确认的业务函数数量为 " + json.stringify(value=`expected`) + "，当前草稿数量为 " + json.stringify(value=table.len(xs=`units`))),operation="outline")*.
1. `artifact_kind` != "" and `artifact_kind` != "docx" and `artifact_kind` != "pptx"
  Return *result.error(code="root.artifact_kind",message="办公产物只支持明确的 docx 或 pptx",operation="outline")*.
We **prepared = table.empty_list()** and **ids = table.empty_list()**.
We **document = "---\nmarkup: occlusion\ntitle: 求道基本方案\n---\n\n# 基本方案\n\n标题：" + core.prose(content=`title`) + "\n\n目标：" + core.prose(content=`goal`) + "\n\n验收：" + core.prose(content=`acceptance`) + "\n\n办公产物：" + core.prose(content=`artifact_kind`) + "\n\n本阶段只约定框架，所有业务逻辑均尚未接通。用户确认后才进入并行细化。\n\n"**.
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
  We **mode = json.get(value=`unit`,key="mode")**.
  1. not `mode`
    We **mode = "code"**.
  1. `mode` != "text" and `mode` != "code" and `mode` != "select"
    Return *result.error(code="root.unit_mode",message="单元方式应为 text、select 或 code",operation="outline")*.
  We **unit = table.put(in=`unit`,at="mode",value=`mode`)**.
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
We **state = table.put(in=`state`,at="artifact_kind",value=`artifact_kind`)**.
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
Return *"## unit_" + `id` + "\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| input | any | 本单元的结构化输入 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 尚未接通，细化后才能交付 |\n\nUse \x60input\x60。\n\n" + core.prose(content=access(`unit`,"title")) + "：" + core.prose(content=access(`unit`,"purpose")) + "。实现方式：" + core.prose(content=json.get(value=`unit`,key="mode")) + "。本单元当前只约定输入、输出与职责，不把骨架当作业务完成。后续由子智能体实现并使用真实输入试运行，失败会保留具体诊断，确认前不会调用任何业务操作。\n\n在完整工程中，本单元必须说明如何与其他单元交换数据，并遵循参数、返回表与叙述比例要求。这里的返回值只是明确的未接通标记，不能用它证明实际目标已达成。\n\nWe **provided_input = \x60input\x60**.\nReturn *[尚未接通：" + `id` + "](None)*.\n\n"*.

## draft

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前规划角色的可信现场 |
| unit | map | required | 当前一项业务职责 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已原子保存的草稿状态 |

Use `context`, `unit`。

规划者可以一次只填写一个职责。草稿随真实根状态保存，下一轮仍能读取，所以无需把多个长调用挤进一次回复，也不依赖模型记住上一次的临时变量。它仍不是已确认框架：只有发表实际 plan.mq.md 并由用户确认后，才允许测试与实现。单元身份和模式在保存前检查，避免错误的正文被悄悄解释成更宽的默认能力。

相同身份表示修订同一职责，保留其他草稿的顺序；不同身份追加，最多八项。用户要求改变框架时清空旧草稿重新规划，不能用隐藏记录把已经删除的职责加回去。草稿仅记录业务边界，不写源码、不冻结案例，也不增加任何文件权限。模型调用一次成功后，下轮上下文会明确给出所有已保存职责，可以继续补充或发表，不必重复声明相同单元。

这里仍使用根状态的版本比较写入。保存成功只说明一份草稿存在，不能把它投影成用户已经同意。并行实现尚未开始，因此没有多个作者争写这份列表；一旦出现待确认方案或阶段不符，修改立即拒绝。输入、返回、来源和约束应写在本单元 purpose 中，不能依赖其他单元的叙述补全测试所需规则。

已保存不代表已批准，任何后续行动都要以实际阶段为准。

草稿与框架刻意分成两种事实。定义一个职责后可以先返回，下一次模型请求会看到该职责的原始说明和身份，而不必取得上一份完整对话。这样多步规划真正由可调用文稿推进；临时变量可以丢失，已保存职责不会丢失。只有全部职责都符合真实用户要求，才发表框架并暂停。

例如用户只要一个固定正文函数，就保存一个 text 职责，然后发表；不需要第二个占位单元。用户要求两个独立函数时分别保存两项，每项都明确自己的返回，不把两个预期混在同一个职责里。模式由专用文稿函数固定绑定。模型只填写该入口所需的业务参数，不能因为职责叙述提到代码而自动取得更宽的编写入口。

职责保存不会改变目标或验收。后续发表将仍然检查数量、依赖和源码叙述，用户能在实际文稿里发现多余职责或缺失规则并要求返工。当前草稿状态可以重建为框架，却不具有人工确认的效力。

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "outline" or json.get(value=`state`,key="pending") or json.get(value=`context`,key="role") != "outline"
  Return *result.error(code="root.draft_scope",message="只可在规划阶段保存自己的职责草稿",operation="draft")*.
We **id = json.get(value=`unit`,key="id")**.
We **mode = json.get(value=`unit`,key="mode")**.
1. not re.is_match(text=`id`,pattern="^[a-z][a-z0-9_]{0,31}$") or (`mode` != "text" and `mode` != "select" and `mode` != "code") or not json.get(value=`unit`,key="purpose")
  Return *result.error(code="root.draft_contract",message="草稿需要合法身份、明确职责和独立的模式参数",operation="draft")*.
We **old = json.get(value=`state`,key="draft_units")**.
We **updated = table.empty_list()**.
We **found = False**.
1. `old`
  - [保留其他职责，仅修订当前身份](for old as item)
    1. access(`item`,"id") == `id`
      We **item = `unit`**.
      We **found = True**.
    We **updated = table.append(list=`updated`,item=`item`)**.
1. not `found`
  We **updated = table.append(list=`updated`,item=`unit`)**.
1. table.len(xs=`updated`) > 8
  Return *result.error(code="root.draft_limit",message="最多八个业务职责",operation="draft")*.
Return *core.save(context=`context`,state=table.put(in=`state`,at="draft_units",value=`updated`))*.

## define

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前规划角色的可信现场 |
| id | text | required | 职责身份 |
| title | text | required | 可读名称 |
| purpose | text | required | 完整业务职责 |
| mode | text | required | 由已安装的专用函数固定提供 |
| depends_on | any | None | 已声明的依赖身份 |
| constant_text | any | None | 固定正文专用函数绑定的用户原文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实保存后的职责记录 |

Use `context`, `id`, `title`, `purpose`, `mode`, `depends_on`=None, `constant_text`=None。

公开接口分别定义固定正文、输入取值和业务运算，模式由这些专用文稿函数绑定。模型不再手写一个容易混进叙述的 mode 参数，也不能靠遗漏参数取得更宽能力。这个组合函数构造原生记录，保存成功才返回职责；不发表方案、不执行实现，更不代替真实用户确认。

依赖为空时建立原生空列表，不把字符串形式的 JSON 数组当作列表。固定正文的业务返回类型为 text，其他模式的具体类型来自公开职责。记录的类型不是作者接口诊断类型；后续模板和独立测试会据此分别检查实际函数的返回。下层 draft 检查身份、阶段和数量，用版本比较保存跨轮事实。调用失败时保留诊断，不能把一个未保存的临时记录显示成已有框架。

1. `depends_on` == None
  We **depends_on = table.empty_list()**.
We **return_type = "any"**.
1. `mode` == "text"
  We **return_type = "text"**.

`unit` =

| id | title | purpose | depends_on | mode | return_type |
|---|---|---|---|---|---|
| `id` | `title` | `purpose` | `depends_on` | `mode` | `return_type` |

1. `constant_text` != None
  We **unit = table.put(in=`unit`,at="constant_text",value=`constant_text`)**.
We **stored = draft(context=`context`,unit=`unit`)**.
1. not access(`stored`,"ok")
  Return *stored*.
Return *unit*.

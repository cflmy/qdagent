---
markup: occlusion
title: 根 SKILL · planning
import:
  routing: routing.mq.md
  workbook: runtime/workbook.mq.md
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

研究与写作模式保留同样的框架确认边界，前置来源未就绪时不会同时启动写作。模式属于用户审阅内容，作者不能临时改成较宽的权限。

基本方案只设计边界、函数单位和验收，不提前实施业务。每个单元是一个具名函数，默认
接收 input，返回 result。框架用叙述说明职责与协作关系，空实现明确写“尚未接通”。
这份骨架保存为 solution/plan.mq.md 并立即交给官方 View 展示，不把一段聊天摘要当成文件。
用户可先修改目标、并发数和子模型，再确认本版本；未确认不能派生子智能体。
单元身份必须稳定、唯一且安全，不允许名称变成路径。依赖只引用已经声明的单元，
最终整合还会检查顺序，避免循环依赖被误当作可以并行。框架中的占位不是运行成功证据。
参数表和返回表放在函数标题下面，正文解释责任与下一步；函数级骨架让并行实现可分工。
源码与状态最后按版本提交，后续阶段始终核对保存文件而不是从答文猜测目标位置。

The outline is a reviewable engineering boundary. Each named unit must have one responsibility and a stable interface, so independent agents can implement different owned functions in one shared manuscript without replacing neighboring sections. The framework remains deliberately incomplete at this point: a runnable placeholder is an honest representation of missing logic, not permission to claim that the business task succeeded. The user reads the actual saved document through the official View, then confirms that exact source version. A changed outline must be reviewed again. Concurrency and model choices are recorded with that decision, so a parent cannot silently raise parallelism or replace a selected child model. A unit name is an identifier rather than a path; validating it prevents accidental overwriting of another unit or access outside the workspace. Later stages keep the accepted responsibilities and explain any limitation in the final source. The artifact, its digest and its pending confirmation form one agreement; a model-written sentence alone cannot supply any of those receipts.

框架的文件摘要必须来自真实文本计算，而非把函数写法当成普通表格数据。确认前先验证这份可阅读骨架，确认时再次比较同一摘要。这样用户看到的职责和实际进入细化的职责保持一致；刷新、并发点击或手动改动不能借用旧确认。每个依赖都只指向前面声明的身份，既方便独立实现，也让最终的执行顺序可核对。

A framework is accepted as an exact artifact, not as an inferred intention. Retain its digest and current revision when requesting approval, and require another explicit review whenever the source changes.

框架模式也是公开契约的一部分。text 明确表示无论输入都返回已确认正文；select 表示从实际输入按字段路径取值；code 才交给作者编写业务运算。这个选择必须出现在用户审阅的方案里，不能在实现阶段临时改变为更宽的权限。对不确定的输入规则应在意图阶段继续询问，不能用一个“通用功能”职责掩盖未知条件。职责按依赖顺序排列；依赖存在只能证明工程可组合，不能证明函数产生了符合业务的返回。

计划文稿保留题目、目标、验收、参数、返回、职责与未接通状态。用户看到的是这些真实边界，后续冻结的测试规格也取自它们。若用户要求调整职责，原摘要、旧独立测试和已实现单元不能继续充当新方案的证据。并发数只是执行上限，不能让后续职责越过前置约束。

用户可以在意图确认时限定业务函数的数量。这个数量描述交付边界，不是并发设置；当前草稿不足或多余时，发表必须失败并返回实际数量，不能为了得到一份完整文稿自动补占位函数。模型随后继续保存真正需要的职责，或者用户通过返工改变原约定。数量正确只是必要条件，职责是否符合业务仍需用户阅读实际框架。

办公产物也是明确的方案契约。没有要求时保持空值，交付角色只得到整合入口，不同时看到与当前任务无关的文件构造函数。确实需要 docx 或 pptx 时，类型写在方案里供用户确认，再开放现有办公插件的调用文稿。办公插件仍可被用户关闭，确认方案不能绕过这个开关，生成失败更不能用一个同名文件链接代替实际结果。

这些约束都与真实方案一起保存。函数数量来自已认证用户选择，产物类型来自可审阅的规划；它们不从一段模型完成消息或执行动画推断。发表前统一核对，发表后暂停等待确切版本确认。任何一项不成立都保留草稿与诊断，不能把未完成的规划直接交给作者实现。

确认前的工作副本只包含骨架，与原方案的函数逐一对应，不代表任何业务已经完成。人工确认仍绑定原始 plan 文稿。后续作者在 index 中填写分配的段落，不能重新定义框架或修改其他函数。每次重新规划都会产生新的代际，避免同名旧函数被悄悄当作新批准的实现。


工作文稿中的函数身份和框架一致；并发数只控制同时填写几个函数，不改变已经批准的拆分。


每个函数段还要明确属于哪一项用户意图。意图清单来自先前真实确认，不能由规划者在发表时重写；如果一条请求包含研究和写作，就分别覆盖，而不是只交付其中容易完成的一项。一个意图允许拆成几个更小的同方式函数，便于子智能体独立实现。多意图时通过 intent_id 指明归属，只有一项时可自动关联；未知身份、遗漏意图或擅自换工作方式都必须返回具体诊断。

路由与职责共同写进实际 plan 文稿，读者在 View 中能看到每段将交给哪份受限 SKILL。文稿位置指向真实函数说明，签名仍由官方解析器读取，不维护另一份业务工具参数表。发表成功后，用户批准的是这份带关联和路由的实际源码摘要，后续测试规格和作者权限仍以各自已确认的单元为边界。路由选择没有使某个插件自动启用，真实浏览、搜索、识别或办公生成仍在原来的权限边界检查。

已有任务没有意图清单时保留原框架的兼容路径，不根据现在的单元反过来伪造过去用户确认的待办。新任务则由根意图入口先保存清单再提问。后续要求改变意图归属或 SKILL 时，必须让用户重新对齐范围，不能靠换一组函数名绕过旧确认。用户预设函数数量也仍然有效：职责必须完整覆盖意图，同时满足实际数量，二者冲突应返回需求澄清，而不是自动删任务或增加无意义占位。

并行实现依旧围绕 index 中各自的二级标题进行。待办清单描述用户目标，函数段描述工程拆分，并发配置描述资源上限；三个层次不能混为一谈。只有真实试运行证明相关函数就绪，前端才可把对应待办标为已验证。通过验证之后仍等待最终业务验收，不能用一组勾选图标代替用户决定。

待办的可读标题用于交流，intent_id 用于稳定关联，两者不能相互替代。用户修改标题不会令一个函数失去归属，同名任务也不会合并成同一个意图。发表前核对的是每项稳定身份都至少有一个实际函数段覆盖，而不是标题中碰巧包含了用户要求的词。

用户回看已经确认过的方案时，应继续取得原版本的职责和路由。新的基本方案只能产生新的确认请求，不能覆盖那次真实决定。该约束同样适用于网络研究失败后改变资料范围的情况：改变业务约束应再次审阅，单纯重试现有来源则仍依据原来的公开契约继续执行。
每个实际段落都同时呈现用户意图与所选方法，用户不需要打开内部运行目录寻找这层对应。机器使用稳定身份作关联，人使用标题和完整叙述审阅边界，两者来自同一次真实发表。

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
We **intents = json.get(value=`state`,key="intent_tasks")**.
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
  1. `mode` != "text" and `mode` != "code" and `mode` != "select" and `mode` != "research" and `mode` != "document"
    Return *result.error(code="root.unit_mode",message="单元方式应为 text、select 或 code",operation="outline")*.
  We **resolved = routing.resolve(mode=`mode`)**.
  1. not access(`resolved`,"ok")
    Return *resolved*.
  We **route = access(`resolved`,"value")**.
  We **unit = table.put(in=`unit`,at="route",value=`route`)**.
  We **unit = table.put(in=`unit`,at="skill_label",value=(access(`route`,"label") + "（" + access(`route`,"document") + " · " + access(`route`,"function") + "）"))**.
  We **bound = routing.bind(unit=table.put(in=`unit`,at="mode",value=`mode`),intents=`intents`)**.
  1. not access(`bound`,"ok")
    Return *bound*.
  We **unit = access(`bound`,"value")**.
  We **unit = table.put(in=`unit`,at="mode",value=`mode`)**.
  We **unit = table.put(in=`unit`,at="depends_on",value=`dependencies`)**.
  We **ids = table.append(list=`ids`,item=`id`)**.
  We **unit = table.put(in=`unit`,at="status",value="pending")**.
  We **prepared = table.append(list=`prepared`,item=`unit`)**.
  We **document = `document` + scaffold(unit=`unit`)**.
We **missing = routing.missing(intents=`intents`,units=`prepared`)**.
1. `missing` != None
  Return *result.error(code="root.intent_coverage",message=("方案遗漏了已确认待办：" + access(`missing`,"title")),operation="outline")*.
We **_ = fs.make_dirs(path="solution")**.
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

We **state = table.put(in=table.put(in=`state`,at="workbook",value=None),at="framework_epoch",value=access(`state`,"revision"))**.
We **saved = core.save(context=`context`,state=table.merge(a=`state`,b=`patch`))**.
1. not access(`saved`,"ok")
  Return *saved*.
Return *workbook.ensure(context=`context`)*.

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
Return *"## unit_" + `id` + "\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| input | any | 本单元的结构化输入 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 尚未接通，细化后才能交付 |\n\nUse \x60input\x60。\n\n" + core.prose(content=access(`unit`,"title")) + "：" + core.prose(content=access(`unit`,"purpose")) + "。实现方式：" + core.prose(content=json.get(value=`unit`,key="mode")) + "；所属意图：" + core.prose(content=json.get(value=`unit`,key="intent_id")) + "；SKILL：" + core.prose(content=json.get(value=`unit`,key="skill_label")) + "。本单元当前只约定输入、输出与职责，不把骨架当作业务完成。后续由子智能体实现并使用真实输入试运行，失败会保留具体诊断，确认前不会调用任何业务操作。\n\n在完整工程中，本单元必须说明如何与其他单元交换数据，并遵循参数、返回表与叙述比例要求。这里的返回值只是明确的未接通标记，不能用它证明实际目标已达成。\n\nWe **provided_input = \x60input\x60**.\nReturn *[尚未接通：" + `id` + "](None)*.\n\n"*.

## draft

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前规划角色的可信现场 |
| unit | map | required | 当前一项业务职责 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已原子保存的草稿状态 |

Use `context`, `unit`。

研究职责和文档职责也只是在此保存公开边界，不会在规划阶段访问页面或创作文章。

规划者可以一次只填写一个职责。草稿随真实根状态保存，下一轮仍能读取，所以无需把多个长调用挤进一次回复，也不依赖模型记住上一次的临时变量。它仍不是已确认框架：只有发表实际 plan.mq.md 并由用户确认后，才允许测试与实现。单元身份和模式在保存前检查，避免错误的正文被悄悄解释成更宽的默认能力。

相同身份表示修订同一职责，保留其他草稿的顺序；不同身份追加，最多八项。用户要求改变框架时清空旧草稿重新规划，不能用隐藏记录把已经删除的职责加回去。草稿仅记录业务边界，不写源码、不冻结案例，也不增加任何文件权限。模型调用一次成功后，下轮上下文会明确给出所有已保存职责，可以继续补充或发表，不必重复声明相同单元。

这里仍使用根状态的版本比较写入。保存成功只说明一份草稿存在，不能把它投影成用户已经同意。并行实现尚未开始，因此没有多个作者争写这份列表；一旦出现待确认方案或阶段不符，修改立即拒绝。输入、返回、来源和约束应写在本单元 purpose 中，不能依赖其他单元的叙述补全测试所需规则。

已保存不代表已批准，任何后续行动都要以实际阶段为准。

草稿与框架刻意分成两种事实。定义一个职责后可以先返回，下一次模型请求会看到该职责的原始说明和身份，而不必取得上一份完整对话。这样多步规划真正由可调用文稿推进；临时变量可以丢失，已保存职责不会丢失。只有全部职责都符合真实用户要求，才发表框架并暂停。

例如用户只要一个固定正文函数，就保存一个 text 职责，然后发表；不需要第二个占位单元。用户要求两个独立函数时分别保存两项，每项都明确自己的返回，不把两个预期混在同一个职责里。模式由专用文稿函数固定绑定。模型只填写该入口所需的业务参数，不能因为职责叙述提到代码而自动取得更宽的编写入口。

职责保存不会改变目标或验收。后续发表将仍然检查数量、依赖和源码叙述，用户能在实际文稿里发现多余职责或缺失规则并要求返工。当前草稿状态可以重建为框架，却不具有人工确认的效力。

职责在这里先核对已确认的意图归属，错误关联不进入草稿数量统计。主任务可以依据明确诊断修订参数，再继续填写；不能把一组有数量却无正确边界的函数锁成只能发表的现场。用户仍可阅读最终实际文稿并拒绝不符合语义的职责，身份正确并不代替业务审阅。

错误归属返回的诊断会留给主任务修正，不能通过改写待办来迎合已有草稿。修订后的相同函数身份只更新自己的职责，其他已保存函数继续保留。真正需要更换意图时由用户重新确认范围，规划者没有隐式批准入口。

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "outline" or json.get(value=`state`,key="pending") or json.get(value=`context`,key="role") != "outline"
  Return *result.error(code="root.draft_scope",message="只可在规划阶段保存自己的职责草稿",operation="draft")*.
We **id = json.get(value=`unit`,key="id")**.
We **mode = json.get(value=`unit`,key="mode")**.
1. not re.is_match(text=`id`,pattern="^[a-z][a-z0-9_]{0,31}$") or (`mode` != "text" and `mode` != "select" and `mode` != "code" and `mode` != "research" and `mode` != "document") or not json.get(value=`unit`,key="purpose")
  Return *result.error(code="root.draft_contract",message="职责 id 必须以小写字母开头且仅含字母数字下划线，最多三十二字符；mode 应是已列出的工作方式，purpose 不能留空",operation="draft")*.
We **bound = routing.bind(unit=`unit`,intents=json.get(value=`state`,key="intent_tasks"))**.
1. not access(`bound`,"ok")
  Return *bound*.
We **unit = access(`bound`,"value")**.
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
| intent_id | text | "" | 对应已确认的意图身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实保存后的职责记录 |

Use `context`, `id`, `title`, `purpose`, `mode`, `depends_on`=None, `constant_text`=None, `intent_id`=""。

公开接口分别定义固定正文、输入取值和业务运算，模式由这些专用文稿函数绑定。模型不再手写一个容易混进叙述的 mode 参数，也不能靠遗漏参数取得更宽能力。这个组合函数构造原生记录，保存成功才返回职责；不发表方案、不执行实现，更不代替真实用户确认。

依赖为空时建立原生空列表，不把字符串形式的 JSON 数组当作列表。固定正文的业务返回类型为 text，其他模式的具体类型来自公开职责。记录的类型不是作者接口诊断类型；后续模板和独立测试会据此分别检查实际函数的返回。下层 draft 检查身份、阶段和数量，用版本比较保存跨轮事实。调用失败时保留诊断，不能把一个未保存的临时记录显示成已有框架。

返回值必须来自已经保存的实际职责，包含规范身份和真实意图关联。不能将绑定前的临时参数作为成功回执，否则模型会从空关联推测新身份，与下一轮事实产生冲突。一个用户意图可由多个函数完成，所有这些函数使用同一个 intent_id；函数名仍分别保持唯一。

函数身份、意图关联和依赖引用都统一将短横线转为下划线，之后只交接实际保存的规范身份。这是输入名称的确定性规范化，不会重写用户职责、修改业务源码或更换工作方式。模型应以下一轮列出的身份继续规划，不依赖自己上轮尚未保存的临时拼写。相同规范身份仍然修订同一职责，原有唯一性与函数数量检查保持有效。

We **id = text.replace(text=`id`,old="-",new="_")**.
We **intent_id = text.replace(text=`intent_id`,old="-",new="_")**.
1. `depends_on` == None
  We **depends_on = table.empty_list()**.
We **normalized_dependencies = table.empty_list()**.
- [依赖使用与实际保存一致的函数身份](for depends_on as dependency)
  We **normalized_dependencies = table.append(list=`normalized_dependencies`,item=text.replace(text=`dependency`,old="-",new="_"))**.
We **depends_on = `normalized_dependencies`**.
We **return_type = "any"**.
1. `mode` == "text"
  We **return_type = "text"**.

`unit` =

| id | title | purpose | depends_on | mode | return_type |
|---|---|---|---|---|---|
| `id` | `title` | `purpose` | `depends_on` | `mode` | `return_type` |

We **unit = table.put(in=`unit`,at="intent_id",value=`intent_id`)**.
1. `constant_text` != None
  We **unit = table.put(in=`unit`,at="constant_text",value=`constant_text`)**.
We **stored = draft(context=`context`,unit=`unit`)**.
1. not access(`stored`,"ok")
  Return *stored*.
We **saved_units = access(access(`stored`,"value"),"draft_units")**.
- [返回真正保存后的规范身份与意图关联](for saved_units as item)
  1. access(`item`,"id") == `id`
    Return *item*.
Return *result.error(code="root.draft_missing",message="未找到刚保存的职责，请重新读取草稿",operation="define")*.

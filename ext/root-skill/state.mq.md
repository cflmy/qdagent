---
markup: occlusion
title: 根 SKILL · state
import:
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

## native

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| operation | text | required | 固定 ABI 操作 |
| payload | map | None | 结构化值，不接受操作系统命令 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际适配结果，失败保留 Result。 |

Use `context`, `operation`, `payload`=None。

这里只有安装好的 qdagent ABI。模型不能决定动态库位置、源码入口、文件根或效果列表。
插件路径由宿主的 MARQDO_EXT 给出；根状态在会话私有目录，业务文件在工作区，二者分开。
ABI 返回的失败不能被另一个成功包装掩盖。它不解释阶段含义，也不自动批准方案。
调用者的结构化参数只是数据，源码仍须通过下方的阶段函数和实际校验。
这个边界让原子锁与进程等待留在操作系统适配层，同时把可阅读的流程保留在本文。
读取状态不会执行候选程序，试运行也只获受限文件效果。取消由宿主的任务进程组传播。

We **_ = [仅加载可信安装的 ABI](plugin.load(path=(sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so")))**.
We **request = table.put(in=`payload`,at="workspace",value=access(`context`,"workspace"))**.
We **request = table.put(in=`request`,at="operation",value=`operation`)**.
Return *[调用固定适配操作](qdagent_transport(request=`request`))*.


## status

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前阶段、版本、用户待确认内容与真实单元证据。 |

Use `context`。

状态是执行边界使用的事实来源，不能根据聊天文字推断已经确认或完成。读取只恢复当前
版本，不修改阶段、不生成示例进度，也不重复执行任何业务操作。根状态缺失时只返回
revision 为零的记录，初始化由宿主的 begin 完成。工作区内的同名 JSON 不拥有状态权限。
每一次写入都要求刚读到的版本；两个子智能体不能用旧记录覆盖彼此的结果。前端只把
这些字段投影成阶段卡片、选择题与进度，不将模型解释当作用户的点击记录。

Return *[读取会话私有的根状态](native(context=`context`,operation="root_read",payload=table.put(in=None,at="root",value=access(`context`,"root"))))*.


## save

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| state | map | required | 包含期望 revision 的新状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原子提交后的新版本，冲突明确失败。 |

Use `context`, `state`。

版本比较与写入由同一把跨进程锁保护。读到旧版本的子智能体必须重新读取，再合并自己的
单元结果，不能覆盖整个任务的其他修改。写入前的 revision 是比较条件，不是模型可以
自选的完成票据。历史记录、用户答复与阶段字段一同持久化，网页刷新不会丢失确认。
保存成功只证明状态提交，不证明业务代码已运行。业务代码仍要带源码摘要和试运行结果，
才能被后续整合函数接纳；保存失败则保留原状态，宿主显示冲突并允许有界重试。

We **payload = table.put(in=None,at="root",value=access(`context`,"root"))**.
We **payload = table.put(in=`payload`,at="revision",value=access(`state`,"revision"))**.
Return *[比较版本后原子提交](native(context=`context`,operation="root_cas",payload=table.put(in=`payload`,at="state",value=`state`)))*.


## begin

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的任务、身份、状态根与工作根 |
| user_input | text | required | 真实用户输入 |
| message_id | text | required | 宿主生成的消息身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 初始化或补充意图，不允许跳过用户确认。 |

Use `context`, `user_input`, `message_id`。

此函数只由宿主在接收用户消息时调用，未注册为模型工具。第一次输入开启意图阶段；
已有任务继续保留阶段，不因另一句模型答复重新获得完成权。完成后的新目标从意图重新
开始，上一轮交付身份仍在对话和状态的 previous_delivery 中。真实用户输入只作为交流
记录保存，不作为 Marqdo 源码执行。重复 message_id 不重复追加，也不会重复产生副作用。
用户在澄清卡片之外直接输入文字时，待回答问题先记录这份真实答复，再允许继续澄清；
文字答复本身不冒充确认按钮。阶段状态因此跨聊天轮次恢复，而不是依赖模型记忆。

A received message is evidence of what the user actually supplied, not an instruction to manufacture approval. Initialization chooses the first mandatory phase and a bounded default configuration; it does not perform research, create an office artifact or approve a framework. A later message adds context while preserving previously approved boundaries. When the current phase is clarification, ordinary chat can supply a free-form answer, but only the authenticated response function can record a confirmation. This distinction lets the user ask follow-up questions without accidentally accepting an unfinished proposal. A completed delivery remains referenced when a new request starts a new intent cycle. Message identity is supplied by the host and is used for deduplication, so calling begin again with the same identity cannot append a second human decision. Readers should inspect history for the actual words and actor, rather than reconstructing them from a model's final summary. All these facts travel in the versioned state and survive a disconnected browser.

We **snapshot = status(context=`context`)**.
We **state = access(`snapshot`,"value")**.
1. not json.get(value=`state`,key="phase") or access(`state`,"phase") == "complete"
  We **settings = json.parse(text="{\"concurrency\":2,\"child_model\":\"inherit\",\"test_model\":\"inherit\",\"unit_models\":{}}")**.

  We **empty = table.empty_list()**.
  We **previous = json.get(value=`state`,key="delivery")**.

  `fresh` =

  | revision | phase | goal | history | units | settings | previous_delivery |
  |---|---|---|---|---|---|---|
  | `state`[^revision] | "intent" | `user_input` | `empty` | `empty` | `settings` | `previous` |

  We **state = `fresh`**.
We **history = access(`state`,"history")**.
1. json.get(value=`context`,key="knowledge_reference")
  We **state = table.put(in=`state`,at="knowledge_reference",value=access(`context`,"knowledge_reference"))**.
- [同一用户消息不重复入账](for history as entry)
  1. json.get(value=`entry`,key="id") == `message_id`
    Return *result.ok(value=`state`)*.
We **entry = table.put(in=None,at="id",value=`message_id`)**.
We **entry = table.put(in=`entry`,at="actor",value="user")**.
We **entry = table.put(in=`entry`,at="text",value=`user_input`)**.
We **state = table.put(in=`state`,at="history",value=table.append(list=`history`,item=`entry`))**.
1. access(`state`,"phase") == "intent"
  We **state = table.put(in=`state`,at="pending",value=None)**.
1. access(`state`,"phase") == "outline" or access(`state`,"phase") == "review"
  We **state = table.put(in=`state`,at="phase",value="outline")**.
  We **state = table.put(in=`state`,at="pending",value=None)**.
Return *save(context=`context`,state=`state`)*.


## respond

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| revision | number | required | 用户看到的确切状态版本 |
| action | text | required | answer、confirm_intent、confirm_outline、revise、accept |
| answer | text | "" | 用户自由输入的原文 |
| choice | text | "" | 用户实际选择的文字 |
| settings | map | None | 宿主验证过的并发数和可用模型身份 |
| accept_stubs | bool | False | 用户是否明确接受已披露的未接通项 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实用户的确认结果；此函数不作为模型工具注册。 |

Use `context`, `revision`, `action`, `answer`="", `choice`="", `settings`=None, `accept_stubs`=False。

The final confirmation binds every separately stored artifact as well as the assembled entry. An article can change without changing the function that reads it, so checking only index.mq.md would let an old review authorize new text. This boundary now rereads each current unit and document digest before recording acceptance. A missing file or altered manuscript returns a precise changed-delivery error. The user must request a revision and repeat verification; the service does not silently approve the new bytes. This protects real user decisions while keeping old readable files and previous discussion available.

只有认证后的用户入口调用本函数。模型目录没有它；普通工具上下文也不能选择 actor。
版本必须与用户看到的卡片一致，避免确认一个已经被替换的方案。意图卡片允许选择、自由
输入或二者一起使用，answer 表示继续澄清，confirm_intent 才表示进入基本方案。
确认基本方案前再次核对保存文件的摘要，人工编辑后必须重新审阅。并发和模型设置同该
次确认一起保存，宿主另行验证身份可用范围。这里的 settings 不能把模型密钥带进文稿。

方案完成还需要最终用户验收。存在未接通项时必须额外确认披露，否则不能把空实现包装
为完整交付。接受带未接通项的版本只记录 partial；没有未接通项才记录 accepted。
用户也可以选择 revise 返回基本方案重新安排边界，不允许模型替用户作这个决定。
所有选择和原文都写入历史，整合时作为叙述保留，不能用模型压缩摘要覆盖真实交流。
错误阶段、旧版本、被修改的框架或不匹配选项都保留明确拒绝，不靠隐藏的前端状态。

This is a human authority boundary. A provider response is never sufficient to call it on behalf of
the user. The HTTP host supplies the owner and task, rejects a concurrent active run, validates model
identities, then invokes this function with the submitted revision. State changes use the same atomic
comparison as child publication, so a double click cannot approve two versions. Free text is retained
as data; it cannot turn into an executable path or a native effect. A confirmation establishes only
the stated agreement. It does not prove implementation, trial success or final business acceptance.
Those later facts must appear in their own stages, and a rejection does not erase existing evidence.
The final record distinguishes a completed scope from explicitly disclosed missing functionality.

A settings update chooses identities, not credentials or source paths. The authenticated host resolves each selected model within the current owner scope before the request arrives here. A parent cannot pass this function in its advertised tool list, and a generated workspace program lacks plugin effects to reach the private state adapter. Approval therefore depends on a separate human request, even if a model produces text that looks like an approval. The review phase also distinguishes accepting an explicitly limited scope from asserting that unconnected features work. A partial acceptance is preserved as partial in the delivery record. Reloading, starting another model turn or asking for a status update must not create an additional confirmation, and a source change must not inherit the approval for its older digest.

最终验收还要对照用户看到的交付摘要。若文件在审阅期间发生变化，即使此前试运行通过，也不能继续接受旧版本。重新整合会产生新的可读入口与证据，再由用户确认。这项比较保护的正是已经审阅的范围，而不是限制用户提出改进意见。

An acceptance refers to one exact delivered source digest. A later edit cannot reuse it. Keep the original decision separate from subsequent feedback so another agent can understand which scope was actually approved.

最终验收同时确认业务范围与当前交付版本，不给未来源码或另一份文稿预先授权。即使用户点击接受，也不能绕过执行证据缺失；应先明确是哪项验证尚未建立，再由返工产生新的可阅读版本。版本冲突和测试缺失都保留各自诊断，不用通用完成消息覆盖。

历史交付缺少独立冻结记录时不可在新版直接接受。文稿与交流继续保留，用户通过返工重新确认边界，再生成当前协议的真实测试，不能通过一次升级追认原来的作者自检。

Working functions now live in one shared document. Human acceptance checks each approved function's own canonical digest and then checks the complete delivery digest. Editing a neighbor during authoring does not invalidate an unrelated function, but changing any tested implementation or the final entry before acceptance still prevents completion. Historical separate files keep their original verification path until a resumed refinement migrates them. This compatibility does not approve an old author-supplied test suite or silently accept an altered manuscript. The authenticated user still decides acceptance after the actual executable entry and its evidence can be inspected.

We **state = access(status(context=`context`),"value")**.
We **pending_view = json.get(value=`state`,key="pending")**.
1. access(`state`,"revision") != `revision`
  Return *result.error(code="root.stale_confirmation",message="方案已变化，请重新阅读当前版本",operation="respond")*.
We **phase = access(`state`,"phase")**.
1. `action` == "revise" and `phase` != "intent"
  We **state = table.put(in=`state`,at="phase",value="outline")**.
  We **state = table.put(in=`state`,at="draft_units",value=table.empty_list())**.
2. `phase` == "intent" and json.get(value=`pending_view`,key="kind") == "intent" and (`action` == "answer" or `action` == "confirm_intent")
  1. `answer` == "" and `choice` == ""
    Return *result.error(code="root.answer",message="请选择一个选项或补充你的想法",operation="respond")*.
  1. `choice` != "" and not table.contains(list=access(`pending_view`,"choices"),item=`choice`)
    Return *result.error(code="root.choice",message="选项不属于当前问题",operation="respond")*.
  1. `action` == "confirm_intent"
    We **state = table.put(in=`state`,at="phase",value="outline")**.
    We **state = table.put(in=`state`,at="intent_confirmed",value=True)**.
2. `phase` == "outline" and json.get(value=`pending_view`,key="kind") == "outline" and `action` == "confirm_outline"
  1. hash.sha256(text=fs.read_text(path="solution/plan.mq.md")) != access(`state`,"outline_sha256")
    Return *result.error(code="root.outline_changed",message="基本方案已被修改，不能沿用旧确认",operation="respond")*.
  We **state = table.put(in=`state`,at="phase",value="refine")**.
  We **state = table.put(in=`state`,at="outline_confirmed",value=True)**.
2. `phase` == "review" and json.get(value=`pending_view`,key="kind") == "review" and `action` == "accept"
  1. not independent_review(state=`state`)
    Return *result.error(code="root.legacy_review",message="该交付缺少当前独立测试证据，请先选择返工重新确认框架",operation="respond")*.
  We **units = access(`state`,"units")**.
  - [用户确认也绑定每份真实源码与正文版本](for units as unit)
    1. json.get(value=`unit`,key="function")
      We **section = native(context=`context`,operation="root_section_read",payload=table.put(in=None,at="unit_id",value=access(`unit`,"id")))**.
      1. not access(`section`,"ok") or access(access(`section`,"value"),"sha256") != access(`unit`,"sha256")
        Return *result.error(code="root.delivery_changed",message="函数段已变化，需要重新验证",operation="respond")*.
    2. else
      1. not fs.exists(path=access(`unit`,"path")) or hash.sha256(text=fs.read_text(path=access(`unit`,"path"))) != access(`unit`,"sha256")
        Return *result.error(code="root.delivery_changed",message="单元源码已变化，需要重新验证",operation="respond")*.
    We **artifact = json.get(value=`unit`,key="artifact")**.
    1. `artifact`
      1. not fs.exists(path=access(`artifact`,"path")) or hash.sha256(text=fs.read_text(path=access(`artifact`,"path"))) != access(`artifact`,"sha256")
        Return *result.error(code="root.delivery_changed",message="正文已变化，需要重新发表与验证",operation="respond")*.
  We **delivery = access(`state`,"delivery")**.
  1. hash.sha256(text=fs.read_text(path=access(`delivery`,"path"))) != access(access(access(`delivery`,"check"),"value"),"sha256")
    Return *result.error(code="root.delivery_changed",message="交付源码已变化，请重新整合后验收",operation="respond")*.
  1. table.len(xs=access(`pending_view`,"stubs")) > 0 and not `accept_stubs`
    Return *result.error(code="root.pending_stubs",message="请明确知悉未接通项后再验收",operation="respond")*.
  We **delivery_status = "accepted"**.
  1. table.len(xs=access(`pending_view`,"stubs")) > 0
    We **delivery_status = "partial"**.
  We **state = table.put(in=`state`,at="delivery_status",value=`delivery_status`)**.
  We **state = table.put(in=`state`,at="phase",value="complete")**.
2. *
  Return *result.error(code="root.stage",message="当前阶段不能执行这个用户操作",operation="respond")*.
1. `settings`
  We **checked_settings = settings_change(state=`state`,previous_phase=`phase`,action=`action`,settings=`settings`)**.
  1. not access(`checked_settings`,"ok")
    Return *checked_settings*.
  We **state = table.put(in=`state`,at="settings",value=access(`checked_settings`,"value"))**.

We **asked = json.get(value=`pending_view`,key="question")**.
We **summarized = json.get(value=`pending_view`,key="summary")**.

`entry` =

| actor | action | text | choice | question | summary | revision |
|---|---|---|---|---|---|---|
| "user" | `action` | `answer` | `choice` | `asked` | `summarized` | `revision` |

We **state = table.put(in=`state`,at="history",value=table.append(list=access(`state`,"history"),item=`entry`))**.
We **saved = save(context=`context`,state=table.put(in=`state`,at="pending",value=None))**.
1. access(`saved`,"ok")
  We **_ = write_decisions(state=access(`saved`,"value"))**.
Return *saved*.


## prose

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| content | any | required | 用户交流或业务说明，始终作为材料而非源码 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 可读的文字，活跃标记经过实体转义 |

Use `content`。需求、选择和说明是文稿的依据，不应因为包含 Markdown 符号就意外成为赋值、
标题、调用或返回。这里保留可见内容，同时把会触发执行语义的标记变成阅读时可显示的
实体。真正的业务代码走明确的 code 函数体，与这份材料参数分开。原始文字仍保留在
私有的用户交流记录中，转义只影响生成源稿的表达，不改变用户所作的真实确认。
同一份文件因此既能被机器检查，也能自然阅读，不让外部材料悄悄新增可执行步骤。

实体转义不会访问链接或追踪地址，也不会把一句需求升级为文件写入。用户材料即使包含变量名、返回标记、标题或表格分隔符，也只作为来源说明展示。需要执行的表达式必须通过作者工具的 body 显式提交，并经历后续检查；两者的权限不能混淆。

Reading this escaped narration never authorizes its links or code examples.

We **safe = str(`content`)**.
1. `content` == None
  Return *"（未填写）"*.
We **safe = text.replace(text=`safe`,old="&",new="&amp;")**.
We **safe = text.replace(text=`safe`,old="*",new="&#42;")**.
We **safe = text.replace(text=`safe`,old="\x60",new="&#96;")**.
We **safe = text.replace(text=`safe`,old="[",new="&#91;")**.
We **safe = text.replace(text=`safe`,old="]",new="&#93;")**.
We **safe = text.replace(text=`safe`,old="#",new="&#35;")**.
We **safe = text.replace(text=`safe`,old=">",new="&gt;")**.
We **safe = text.replace(text=`safe`,old="|",new="&#124;")**.
Return *[交流叙述不会变成额外执行段落](text.replace(text=`safe`,old="\n",new=" "))*.
## write_decisions

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 已经原子保存的真实状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 交流审计文稿的相对路径 |

Use `state`。

工程入口在最终审阅之前已经冻结源码摘要，因此不能在验收之后把确认文字追加到入口，
否则确认的便不再是原来阅读的文件。交流记录单独存为 decisions.mq.md，和 index.mq.md
处于同一工程目录。它持续记录实际提问、选择、补充、返工和验收；索引中的先前交流仍然
保留，阅读者也可以打开这份附带文稿查看后续决定。这里不是业务实现或新的执行授权。

文字材料先经过实体转义，结构化记录则通过 JSON 字面量返回。用户可以把其中的选择
交给其他智能体继续协作，不需要依赖截图或模型事后的记忆摘要。该文件只从已经保存的
真实状态生成，模型不能通过聊天输出给自己伪造用户身份。重新生成也不会改变阶段。
原始记录在宿主私有状态中保留，公开文稿仅属于当前任务拥有者，不包含模型密钥。
每次验收引用的交付摘要仍是原始入口摘要，审计文稿不会冒充新的编译或试运行证明。

The audit manuscript preserves decisions as data. Its callable function returns the recorded history,
while the narration lets a person inspect the same events without learning language syntax. Approval
remains a separate authenticated action; reading this file cannot create approval. The delivered source
keeps its own immutable digest, so later feedback does not silently replace what was reviewed.

We **history = access(`state`,"history")**.
We **source = "---\nmarkup: occlusion\ntitle: 用户交流与验收记录\nimport:\n  json: lib/json.mq.md\n---\n\n## history\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | list | 原始交流记录，只读材料，不授予权限 |\n\n这份文稿保留本工程的真实用户交流、所选选项、问题与最终验收。阅读记录不执行业务操作，也不改变确认状态。工程入口保留自身的交付摘要，后续交流单独记录于此，避免验收后修改已经审阅的源代码。\n\n"**.
- [把每一次用户决定写成可阅读的上下文](for history as entry)
  We **source = `source` + decision_paragraph(entry=`entry`)**.
We **encoded = text.replace(text=json.stringify(value=json.stringify(value=`history`)),old="\x60",new="\\x60")**.
We **source = `source` + "在阅读上述需求与决定后，可以取得对应的原始记录供继续协作。\nReturn *[取得真实交流记录](json.parse(text=" + `encoded` + "))*.\n"**.
We **_ = fs.make_dirs(path="solution")**.
We **_ = fs.atomic_write(path="solution/decisions.mq.md",text=`source`)**.
Return *"solution/decisions.mq.md"*.


## decision_paragraph

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| entry | map | required | 一条已经保存的用户交流记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 能直接放进审计文稿的安全叙述 |

Use `entry`。

这里把交流记录中的每个有意义字段放在同一段说明中。用户原话与选择解释需求来源；
当时的问题与摘要说明用户实际上确认了什么；版本和消息身份帮助下一位开发者追溯。
这些字段不应被省略成一句“用户已确认”，否则它们的限定条件很容易在并行协作中丢失。
某些普通聊天输入没有问题或版本，缺失内容明确表示未填写，不推测一个从未发生的选择。

所有字段先走 prose 的实体转义。这个格式化函数不把文字解释成路径、标题、调用、返回
或变量名，也不根据选项文字调用工具。它不更新私有状态，不负责身份验证，不给记录新增
模型编造的事实。调用者必须先把真实请求保存，再生成面向阅读的工程附件，避免把候选
模型答复当作已经提交的用户决定。另一位智能体可以读取此文稿理解背景，但读取本身仍
没有替原用户再确认一次的权限。

A record carries context as well as a short answer. The question, summary and selected option belong
to the same observed revision, so a reader should see them together. A free-form response may qualify
the apparent choice, and removing that qualification would misrepresent the approved scope. Ordinary
messages may have no question or action; the rendered absence is explicit rather than invented. This
helper only formats stored facts. The host remains responsible for identity, the state adapter remains
responsible for atomic revision changes, and the business program remains responsible for its results.

Keep this narration aligned with the structured history returned by the audit document. Additional
fields that affect the meaning of a future decision must be added to the readable projection too. A
successful formatting operation is neither compiler proof nor business acceptance; those have their
own evidence. User text is escaped before being placed in executable documentation so quotes, labels
and examples remain material rather than new commands. This boundary allows people and models to read
the same source safely and to understand which agreement belongs to which version.

Return *"用户补充：" + prose(content=json.get(value=`entry`,key="text")) + "。当时的问题：" + prose(content=json.get(value=`entry`,key="question")) + "。选择：" + prose(content=json.get(value=`entry`,key="choice")) + "；操作：" + prose(content=json.get(value=`entry`,key="action")) + "。当时展示的理解：" + prose(content=json.get(value=`entry`,key="summary")) + "。对应版本：" + prose(content=json.get(value=`entry`,key="revision")) + "，消息身份：" + prose(content=json.get(value=`entry`,key="id")) + "。这是真实交流的记录，不把理解、确认或接受等同于业务事实已经得到证明。原文、问题和理解一起保留，方便另一位开发者核对决定的上下文，而不依赖摘要猜测授权范围。\n\n"*.

## independent_review

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 待审阅交付的真实状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 是否具备当前独立测试协议的基本证据 |

Use `state`。

旧版本允许作者提供案例，旧交付因此不能直接当成新协议已验证。这里不删除历史文稿，也不替用户重新批准；它只检查每个单元都有独立冻结记录、真实通过与相同测试摘要。缺少任一项时保留可阅读的历史，但必须返回框架重新确认，不能在新版界面里把作者自检显示成独立测试。

这个判断保护最终用户入口，也用于等待消息的事实描述。它不重新执行代码，不生成案例，更不把一个字段改成 True 来迁移旧任务。已完成的历史记录继续保存，新协议的就绪仍由 proof 模块检查源码、规格与冻结版本。空单元列表不能证明存在交付，旧格式缺少必要字段也不能获得默认通过。

来源规则升级后，含外部引用的旧文档还需要当前可读正文证据；保持旧的 passed 字段不能代替重新验证。无需外部来源的函数不因此丢失有效案例。

We **units = access(`state`,"units")**.
1. table.len(xs=`units`) == 0
  Return *False*.
- [逐项核对当前测试证据](for units as unit)
  We **tests = json.get(value=`unit`,key="tests")**.
  We **trial = json.get(value=`unit`,key="trial")**.
  1. not evidence_current(tests=`tests`,trial=`trial`)
    Return *False*.
  1. not `tests` or not `trial` or not json.get(value=`trial`,key="passed") or (json.get(value=`trial`,key="assurance") != "independent_cases" and json.get(value=`trial`,key="assurance") != "independent_contract") or json.get(value=`trial`,key="suite_sha256") != json.get(value=`tests`,key="sha256")
    Return *False*.
Return *True*.

## evidence_current

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| tests | any | required | 已冻结的独立案例或文档规则 |
| trial | any | required | 对应版本的实际试运行 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 来源验证规则是否仍然适用 |

Use `tests`, `trial`。

旧版本可能把空网页计作来源，所以要求实际引用的文档必须经过当前可读正文规则重新核验。已有通过字段不能覆盖这一版本差异。固定输入输出案例和不要求外部来源的文档不受这个来源版本升级影响；它们仍需各自完整的独立验证。此函数只检查规则身份，不读取作者内容、不补造测试结果，也不替用户批准。可信执行器可以重新运行原有独立规则，资料有效时继续复用，资料无效时保留未完成。

Missing evidence is represented by a null value, not an empty record. Check the value shape before looking up fields so an unstarted function remains simply not ready. A legacy malformed receipt is rejected without throwing a parser error or preventing unrelated functions from being scheduled. Source-free exact cases still need a real frozen suite and trial before this version predicate can succeed.

1. type(`tests`) != "map" or type(`trial`) != "map"
  Return *False*.
We **suite = json.get(value=`tests`,key="suite")**.
1. type(`suite`) != "map"
  Return *False*.
1. json.get(value=`suite`,key="kind") == "document"
  We **rules = json.get(value=`suite`,key="rules")**.
  1. type(`rules`) != "map" or json.get(value=`rules`,key="minimum_sources") == None
    Return *False*.
  1. access(`rules`,"minimum_sources") > 0
    We **contract = json.get(value=`trial`,key="contract")**.
    1. type(`contract`) != "map"
      Return *False*.
    Return *(json.get(value=`contract`,key="evidence_version") == "readable-page-v1")*.
Return *True*.

## settings_change

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 当前真实根状态 |
| previous_phase | text | required | 用户操作之前的阶段 |
| action | text | required | 认证用户提交的操作 |
| settings | map | required | 宿主验证过模型身份的配置 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 合法配置的 Result，改变边界需要返工 |

Use `state`, `previous_phase`, `action`, `settings`。

业务函数数量与并发数是不同的约束。前者限定用户要求完成多少个真实职责，后者限定同时启动多少个子任务，不能用其中一个替代另一个。零表示用户不限定确切职责数，正数必须与实际发表的草稿数量相同；这项检查由规划文稿执行，不依靠模型自己记住。缺少新字段的历史配置保持零，不为老数据推断一个未经确认的数量。

用户可以在意图阶段明确数量，或通过返工调整。已经审阅的框架不能在确认、接受时悄悄换成另一个数量约定，改变应回到规划，让用户看到新的真实版本。这里验证的是普通配置原生值，不执行候选源码、不解析模型动作，也不接触模型凭据。模型身份与账号归属由宿主验证，阶段和范围由本文控制。

并发范围仍是一至八。任何无效配置都保留原状态和明确诊断，不把失败更新成默认成功。返回只是经过验证的配置，实际保存和用户决定的历史记录由 respond 一起原子写入；单独调用本函数不能获得批准或更改一个任务。

1. access(`settings`,"concurrency") < 1 or access(`settings`,"concurrency") > 8
  Return *result.error(code="root.concurrency",message="并发数需在一到八之间",operation="settings_change")*.
数量约束改变后必须重新形成真实框架，旧确认不会自动适配新的职责边界。配置验证失败时当前用户决定也不会被部分提交。

We **previous = json.get(value=access(`state`,"settings"),key="expected_units")**.
1. `previous` == None
  We **previous = 0**.
We **expected = json.get(value=`settings`,key="expected_units")**.
1. `expected` == None
  We **expected = `previous`**.
1. `expected` < 0 or `expected` > 8
  Return *result.error(code="root.expected_units",message="业务函数数量应为零到八，零表示不限制",operation="settings_change")*.
1. `expected` != `previous` and `previous_phase` != "intent" and `action` != "revise"
  Return *result.error(code="root.constraint_changed",message="函数数量改变需要先返工并重新确认框架",operation="settings_change")*.
Return *result.ok(value=table.put(in=`settings`,at="expected_units",value=`expected`))*.

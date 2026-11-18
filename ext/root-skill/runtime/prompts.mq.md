---
markup: occlusion
title: 提示词与有界上下文的唯一组装位置
import:
  recovery: recovery.mq.md
  observations: observations.mq.md
  io: io.mq.md
  core: ../state.mq.md
  proof: ../proof.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  document: lib/document.mq.md
  result: lib/result.mq.md
  knowledge: knowledge.mq.md
  materials: materials.mq.md
  memory: memory.mq.md
---

提示词与有界上下文的唯一组装位置。指令来自文稿，动态材料标记来源，角色之间不共享聊天。

## instructions

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| section | text | required | 需要读取的指令章节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 原始提示文稿片段 |

Use `context`, `section`。

读取 .mq.md 中的叙述章节，保留文稿版本和来源。这个操作不执行该章节，不根据宿主中的字符串补角色要求或修复建议。提示改动应像代码一样审阅并进入版本控制。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **read = io.native(context=`context`,operation="runtime_document",payload=table.put(in=None,at="path",value=(access(`context`,"project") + "/ext/root-skill/runtime/instructions.mq.md")))**.
Return *document.section(text=access(access(`read`,"value"),"source"),title=`section`)*.

## facts

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 仅当前角色需要的任务材料 |

Use `context`。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

浏览观察只交给实现角色。每次重新读取真实来源与已就绪依赖，避免成功反馈被清空后丢失材料；测试角色仍立即返回公开规格，不进入材料交接分支。

测试者只取得冻结规格和公开接口，不取得实现、现有运行结果或开发对话；实现者也只看自己的规格。主流程意图与规划只读一份经版本核对的 memory.mq.md 关键状态，最新用户回应也由其投影；不回放多条原始历史。所有材料先转义为叙述，不能因为用户包含代码符号就变成额外执行。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

当前材料不是聊天回放。意图与规划只使用一份按根状态重建的关键文稿，保留最新用户回应与已确认事实；交付只接收单元职责和实际通过状态。测试者和实现者都从同一个已确认规格理解输入返回，彼此的生成过程不成为新的业务规则。材料超过预算时应明确失败或继续按需读取，不把缺失部分悄悄猜出来。

所选知识只在意图与框架阶段作为带来源的数据读取，不能直接交给独立测试者。规划者必须把适用的业务规则写进可审阅方案，确认后才成为测试的公开依据。

用户目标保留最初输入，最近回应保留当前澄清的必要变化。若历史回答之间存在冲突，应在意图阶段提出具体问题，由用户选择，不能只取较晚一句话就悄悄扩大需求。交付者收到的单元状态只用于描述真实进展，不具有重新冻结案例或重写源码的权限。

框架阶段还交接当前根状态中的职责草稿，它们只是已填写的参数，不是已确认范围。模型可逐项补充，完成后发表，不必依赖某次响应中的临时变量。草稿始终只是计划材料，不能让模型跳过等待用户审阅。草稿不会加入实现和测试的上下文，用户最后确认的职责才是后续规格来源。

用户确认的函数数量属于业务范围，草稿数量属于当前进度，二者分别标记，不能用并发数推断交付数量。当前角色根据这些真实值继续填写缺少的职责或发表完整框架；如果需求发生变化，必须回到用户确认，不悄悄更改约定。交付角色只取得实际单元职责和结果状态，不接收规划过程中的临时草稿。

意图身份和函数身份分开交接。只有一项意图时，多个实际函数可以共同承担它，模型不应为第二个函数临时发明第二项已确认任务；有多项意图时则必须逐项明确归属。当前材料直接列出保存后的规范身份，前一轮未保存的临时拼写和模型自称成功都不能覆盖这些事实。需要改变意图清单时仍由用户重新确认，不从一条发表失败诊断推导出更大的授权。

回看阶段记录只服务于用户审阅，不自动加入模型上下文。记录中可能包含其他职责的验证摘要与开发交流，当前角色不因用户点开了一张历史卡片而取得这些材料。每次构造请求仍重新选择本角色需要的公开规格、当前职责、获准来源和自己的上一条诊断。这样前端体验的改善不会让上下文随着阶段历史不断增长，也不会破坏独立测试的隔离边界。

意图清单属于主任务的组织材料，函数规格属于子任务的公开边界，二者按角色分别交接。保存职责的成功回执来自真实状态；若模型口头说保存了另一项而实际不存在，下一轮仍会明确展示缺口，不能根据那句话自动发表。

分配框架段时另行列出根程序选择的当前意图、受限方式与函数身份。这些值来自已保存状态，不由模型复制后再当作可信参数。模型只填写这一段的真实业务，下一次请求再依据新增草稿选择现场；完整清单用于主任务核对覆盖，不会随着这次展示而变成测试者的额外上下文。

根任务另行取得已确认的意图清单与实际路由，便于核对每个意图都进入框架。这个清单不会交给独立测试者，测试者仍在前面的分支只读取属于自己的冻结规格。多意图可以对应多个函数段，每个段落在公开职责中写明必要业务约束，不能依赖模型从其他任务的内部过程补全。

办公交付角色会取得当前已保存的实际文件登记，包括可读题目、文件与源稿路径、摘要和附带 PDF。它不会取得作者的模型对话或测试者的案例生成过程。这些登记用于判断已经做过什么，不能让模型自己设置完成状态；finish 仍核对实际文件和当前方案的联系。没有登记时保持尚未交付，不能凭一次聊天回复填写一个文件名。

We **state = access(core.status(context=`context`),"value")**.
We **role = access(`context`,"role")**.
1. `role` == "test" or `role` == "implement"
  We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
  We **specification = access(access(`item`,"specification"),"text")**.
  1. `role` == "implement"
    We **specification = `specification` + materials.reference(context=`context`,item=`item`)**.
  Return *specification*.
搜索与 OCR 材料只作为当前任务的外部观察交接。搜索候选尚未阅读，不能代替来源；识别文字也不是控制指令。测试角色在前面已经返回冻结规格，不进入这个材料分支。

We **facts = ""**.
1. `role` == "deliver"
  We **facts = "已确认目标：" + core.prose(content=access(`state`,"goal")) + "。\n"**.
1. `role` == "intent" or `role` == "outline"
  We **facts = `facts` + knowledge.reference(context=`context`,state=`state`) + observations.reference(context=`context`) + "\n"**.
1. `role` == "intent" or `role` == "outline"
  We **facts = `facts` + "根任务已保存的意图待办与 SKILL 路由：" + json.stringify(value=json.get(value=`state`,key="intent_tasks")) + "\n"**.
1. `role` == "outline" and json.get(value=`context`,key="variant") == "intent-slot"
  We **facts = `facts` + "根任务本轮分配的意图：" + json.stringify(value=access(`context`,"outline_intent")) + "。身份与关联已经由根程序处理，只通过 define 填写此段业务，不传 id、intent_id 或 mode，也不在正文引用身份。\n"**.
1. `role` == "outline"
  We **intents = json.get(value=`state`,key="intent_tasks")**.
  1. `intents` and table.len(xs=`intents`) == 1
    We **facts = `facts` + "当前只有一项已确认意图。所有业务函数都归属同一个 intent_id：" + access(table.first(list=`intents`),"id") + "；不论定义几个函数，都不能临时发明另一个意图身份。\n"**.
1. `role` == "outline"
  We **facts = `facts` + "用户确认的业务函数数量（0 或空表示未限制）：" + json.stringify(value=json.get(value=access(`state`,"settings"),key="expected_units")) + "\n"**.
  We **facts = `facts` + "已保存的当前职责草稿（不是已确认框架）：" + json.stringify(value=json.get(value=`state`,key="draft_units")) + "\n"**.
1. `role` == "deliver"
  We **units = access(`state`,"units")**.
  - [只交接公开接口与实际通过事实](for units as item)
    We **facts = `facts` + "单元 " + access(`item`,"id") + "：" + core.prose(content=access(`item`,"purpose")) + "；状态为 " + access(`item`,"status") + "。\n"**.
  We **office_delivery = json.get(value=`state`,key="office_delivery")**.
  1. `office_delivery`
    We **facts = `facts` + "当前已保存的真实办公交付：" + json.stringify(value=access(`office_delivery`,"artifact")) + "。该版本仍需在 finish 时核对；不要重复生成。\n"**.
  Return *facts*.
Return *facts*.

## packet

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| feedback | any | None | 上一调用的必要诊断 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 消息与指令来源组成的可审计包 |

Use `context`, `feedback`=None。

同一阶段每轮重新从确定文稿构造上下文，只追加上一次必要诊断，不堆积整个工具对话。公开函数手册由官方解析器按函数范围抽取到第一个执行语句之前；不给模型完整框架实现或全局工具目录。发送的消息和来源摘要将由 ABI 保留，宿主不补隐藏提示。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

消息组装与网络请求分开，便于离线检查模型实际会看到的内容。每一轮只追加上一条诊断，不自动携带前一角色的响应或工具结果；这既限制上下文增长，也防止测试者意外取得开发过程。所有角色约束与修复文字保持在可阅读文稿中。

角色与接口一起决定本轮可以做什么。固定正文作者只取得 write_text 手册，测试者只取得构造输入预期和冻结案例的手册；相同模型配置也不会改变这一点。接口摘录到第一个执行语句之前结束，所以模型阅读的是契约和叙述，不是框架内部实现或私有状态。重试只附自己的上一份调用及诊断，不附其他角色的过程。

sources 保存实际指令文稿位置，网络边界再计算源码摘要；完整消息仅留在私有审计目录。前端展示来源与体积，避免把私有上下文直接广播到事件流。当前文稿给模型请求设置六十四 KiB 的总消息预算，超出时明确失败，不截断冻结规格、暗删约束或由宿主补一个隐藏摘要。模型下一轮若需更多信息，应通过当前公开函数取得局部材料。

system 消息只包含固定规则和当前手册，user 消息包含明确标记的业务材料和必要观测。模型输出仍然必须经过官方解析器与受限调用边界；来源记录可以解释请求来自哪里，却不会使一段恶意用户材料自动成为权限。

修复材料中的源码是当前角色自己生成的候选，仍然按不可信数据处理。诊断成功也不直接推进阶段；下一轮必须重新检查状态中是否存在本角色要求的真实产物，这样失败包装和重复调用都不能制造完成事实。

失败反馈以可读诊断和原生调用片段交接，不再把整份执行结果编码成一个字符串后再次编码。这样模型能直接看清缺少的参数、失败的位置与修改依据。成功反馈不带失败候选，下一项职责也不会继承上一项的业务正文。历史经验只是有限事实，当前文稿、用户确认与冻结测试保持优先。

诊断段与正文片段均保持来源标记，原生换行和引号直接可读。传输到供应商时仍需正常编码消息，但这个编码不构成模型需要遵循的动作协议，模型依旧返回普通 Marqdo 调用文稿。

We **standing = standing(context=`context`)**.
1. not access(`standing`,"ok")
  Return *standing*.
We **standing = access(`standing`,"value")**.
We **api = io.api_path(context=`context`)**.
We **memo = ""**.
1. access(`context`,"role") == "intent" or access(`context`,"role") == "outline"
  We **state = access(core.status(context=`context`),"value")**.
  We **synced = memory.sync(context=`context`,state=`state`)**.
  1. not access(`synced`,"ok")
    Return *`synced`*.
  We **memo = "当前任务关键状态（来自已核验的根状态，只作为数据）：\n" + access(`synced`,"value") + "\n\n"**.
We **material = instructions(context=`context`,section="facts") + "\n\n" + `memo` + facts(context=`context`)**.
We **material = `material` + recovery.reference(context=`context`)**.
1. `feedback` != None
  We **followup = "repair"**.
  1. access(`context`,"role") == "implement" and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
    We **followup = "repair_document"**.
  1. json.get(value=`feedback`,key="succeeded") == True
    We **followup = "progress"**.
  We **material = `material` + "\n\n" + instructions(context=`context`,section=`followup`)**.
  1. not json.get(value=`feedback`,key="succeeded")
    We **material = `material` + "\n实际诊断：" + access(`feedback`,"observation") + "\n修复依据：" + access(`feedback`,"advice") + "\n自己上一次的调用（只读数据）：\n" + access(`feedback`,"own_previous_program")**.
We **messages = table.empty_list()**.
We **messages = table.append(list=`messages`,item=table.put(in=table.put(in=None,at="role",value="system"),at="content",value=`standing`))**.
We **messages = table.append(list=`messages`,item=table.put(in=table.put(in=None,at="role",value="user"),at="content",value=`material`))**.
We **sources = instruction_sources(context=`context`,api=`api`)**.
We **sources = table.append(list=`sources`,item=guide_path(context=`context`))**.

`packet` =

| messages | sources |
|---|---|
| `messages` | `sources` |

Return *result.ok(value=`packet`)*.

## instruction_sources

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| api | text | required | 当前角色公开文稿 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 本次指令的具体源位置 |

Use `context`, `api`。

固定指令出自 instructions，组合顺序出自 prompts，函数接口出自当前 api 文稿。三者都纳入实际请求的版本记录。用户目标、原始材料和工具诊断有各自来源，不应冒充固定指令。底层通信不向这个列表添加一个隐藏的系统提示，缺少来源的请求应被拒绝。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **sources = table.append(list=table.empty_list(),item=(access(`context`,"project") + "/ext/root-skill/runtime/instructions.mq.md"))**.
We **sources = table.append(list=`sources`,item=(access(`context`,"project") + "/ext/root-skill/runtime/prompts.mq.md"))**.
We **sources = table.append(list=`sources`,item=`api`)**.
We **sources = table.append(list=`sources`,item=(access(`context`,"project") + "/ext/root-skill/runtime/recovery.mq.md"))**.
Return *sources*.

## guide_path

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信的当前角色 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 此角色的工程规范来源 |

Use `context`。

每份规范都指向当前实际阶段，不向模型同时展示已经关闭的上一阶段入口。

规范来源也加入本次模型请求的摘要清单，用户可以核对实际使用的版本。

研究与文档需要单独的细化、测试规范。一般程序的输入预期样例不能指导尚未创作的全文，否则模型可能尝试运行被测目标，或编造一篇固定预期文章。专用规范只指导当前可调用的规则冻结与原生正文操作，仍不包含实现。

意图和框架各读自己的规范，独立测试有单独的意图测试规范，实现读细化规范，交付读整合规范。这里选择的是安装文稿的位置，不是模型可传入的任意路径，也不是业务函数注册表。实际内容会随当前公开函数一起发送，来源摘要进入私有审计，缺失文件明确失败。阶段规范更新必须同步真实调用契约，不能保留已经删除的工具参数或旧 JSON 动作示例误导模型。

同一阶段也可能有不同的受限调用现场：先填写职责，再发表框架。指南与真实手册一起变化，避免旧示例给模型造成仍可调用其他阶段函数的错觉。变更规范时要同步参数和实际验证，而不是单独修改一份不可执行的提示副本。

根程序已分配当前框架段时使用专门的填写规范。该规范不要求模型再声明身份或选择工作方式，减少接口之间的重复参数，也明确禁止提前实现或代替用户批准。

We **name = access(`context`,"role")**.
1. `name` == "outline" and json.get(value=`context`,key="variant") == "intent-slot"
  We **name = "outline-slot"**.
1. `name` == "test"
  We **name = "testing"**.
2. `name` == "implement"
  We **name = "refinement"**.
2. `name` == "deliver"
  We **name = "integration"**.
  1. json.get(value=`context`,key="variant") == "office"
    We **name = "integration-office"**.
1. (access(`context`,"role") == "test" or access(`context`,"role") == "implement") and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
  We **name = `name` + "-document"**.
Return *(access(`context`,"project") + "/ext/root-skill/guides/" + `name` + ".mq.md")*.

## standing

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信角色与实现方式 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 本角色固定规则与手册的 Result |

Use `context`。

工程规范和公开函数同时更新，模型不会在一个消息中收到文档模式与旧固定全文测试两套冲突说明；实际执行仍独立复核当前入口。

来源不足时同时收窄公开手册与固定说明，仅剩真实浏览函数。取得页面之后重新构造当前现场，不把前一次工具清单当成永久授权，也不让旧的错误方案在上下文里反复覆盖真实进展。

当前函数手册不是供应商工具 Schema，用户能够在源码中核对这些可调用签名及其行为。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

研究和写作使用专门的文稿现场，独立测试读取文档契约说明，实现者读取原生围栏写作说明。选择来自根状态里的已确认模式，模型无法用自己的参数切换到另一个角色或取得私有实现。

固定上下文由三个部分组成：共同调用规则、当前角色说明和当前公开函数手册。阶段工程规范放在角色说明之后，接口之前。这样模型同时知道要达到什么条件以及有哪些真实函数可以调用，不必了解整个智能体框架的实现，也不需要根据一个外部工具目录猜测如何生成程序。

手册使用官方解析器提取到函数首条可执行语句之前。内部状态读写、权限核对、目录处理和模型通信实现都不会成为模型的任务上下文。固定正文是更窄的现场，只给这个模板的接口和说明；通用作者不能因此向测试角色授予读取实现或修改案例的能力。角色来自当前进程的可信上下文，不从用户材料、候选源码或模型自述推断。

文稿读取失败就停止本轮，不能在宿主字符串中补一个默认角色，也不能跳过缺失规范继续执行。所有读取的位置由安装目录和当前角色确定，之后单独计算来源摘要。这里构造的只是固定指令，用户目标、公开规格与上次诊断另行作为材料组装，二者不能互相冒充。固定规则本身也不代表业务已经执行，真实结果仍由官方解析后的调用和状态核对获得。

意图规范约束真实提问，框架规范要求每个职责完整自足，独立测试规范明确只观察一个函数，实现规范要求叙述与实际代码相符，整合规范保留用户最后验收。不同规范分别版本化，新增要求应修改对应文稿，并用真实角色请求验证实际收到了更新。只在工程目录放一份规范而没有将其送入调用现场，不能视为已经约束模型。

调用函数的参数表、返回表和叙述是手册的一部分；返回类型描述的是接口本身，不能混淆为待生成业务函数的类型。比如 write_text 的诊断返回是 map，但用户业务要求的返回仍是 content 字符串。角色说明与手册保持这一差异，避免把检查包装误写成业务结果。对没有公开的函数不列别名，也不暗中生成供应商 Schema；模型看到和实际可调用的始终是同一份函数文稿。

框架草稿完整后会切换到只含发表函数的文稿，减少前一阶段接口造成的误用。

当前框架段的专用指令和实际手册一起发送。专用现场不会同时附上可任意声明身份的旧规划入口，模型只能读取并调用这份本轮文稿，后续切换由根程序根据实际保存状态决定。

公开函数是否存在来自官方解析后的手册元数据，不扫描模型文字或根据标题猜测能力。只有本轮确实包含 read_office 时才加入办公材料说明，不能向没有该接口的框架槽位或独立测试者提示一个不可调用的函数。办公交付另用专门整合规范，说明从已验证正文组装真实文件、再提交用户审阅的顺序。

当前状态中的真实办公登记也会交给交付角色，使它知道上次生成已经成功，不再因为阶段尚未结束就反复创建相同文件。这些路径属于当前任务产物，不包含凭据与其他角色的内部过程；是否有效仍由实际门禁判断。

读取说明只在官方手册实际列出函数时加入；生成文件所用的真实手册同样记录到当前方案中。指令和文稿同步变化，旧接口不会因历史提示继续授权。

We **api = io.api_path(context=`context`)**.
We **manual = io.native(context=`context`,operation="runtime_handbook",payload=table.put(in=None,at="path",value=`api`))**.
1. not access(`manual`,"ok")
  Return *manual*.
We **section = access(`context`,"role")**.
1. (`section` == "implement" or `section` == "test") and json.get(value=`context`,key="variant") == "text"
  We **section = `section` + "-text"**.
1. (`section` == "implement" or `section` == "test") and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
  We **section = `section` + "_document"**.
1. access(`context`,"role") == "implement" and json.get(value=`context`,key="scene") == "browse"
  We **section = "implement_browse"**.
1. `section` == "outline" and json.get(value=`context`,key="variant") == "intent-slot"
  We **section = "outline_slot"**.
1. `section` == "outline" and json.get(value=`context`,key="variant") == "publish"
  We **section = "outline-publish"**.
1. `section` == "deliver" and json.get(value=`context`,key="variant") == "office"
  We **section = "deliver_office"**.
We **guide = io.native(context=`context`,operation="runtime_document",payload=table.put(in=None,at="path",value=guide_path(context=`context`)))**.
1. not access(`guide`,"ok")
  Return *guide*.
We **standing = instructions(context=`context`,section="common") + "\n\n" + instructions(context=`context`,section=`section`) + "\n\n" + document.section(text=access(access(`guide`,"value"),"source"),title="handbook") + "\n\n当前公开函数文稿：\n" + access(access(`manual`,"value"),"source")**.
1. table.contains(list=access(access(`manual`,"value"),"functions"),item="read_office")
  We **standing = `standing` + "\n\n" + instructions(context=`context`,section="office_material")**.
Return *result.ok(value=`standing`)*.

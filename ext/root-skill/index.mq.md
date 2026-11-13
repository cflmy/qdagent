---
markup: occlusion
title: 求道根 SKILL：从意图到可验收的文稿工程
import:
  core: state.mq.md
  intent: intent.mq.md
  plan: planning.mq.md
  author: authoring.mq.md
  delivery: delivery.mq.md
  flow: policy.mq.md
---


根 SKILL 是求道的必经流程插件。先阅读本文件，再按当前阶段阅读 guides/ 中的工程规范。
意图拆解、基本方案、并行细化和方案落地都是下方可调用的函数，不能靠模型的一句话跨过。
用户确认只从经过认证的交互入口写入；工具不能伪造确认。实际执行仍然形成 marqdo call。

意图阶段由模型提问、用户选择或自由输入，必须留下真实确认。基本方案先产生只含职责、参数与返回的框架，用户在 View 中确认后才能并行。细化阶段要逐个校验并试运行；方案落地整合叙述、业务逻辑和交流证据，最后交给用户验收。

多文件以本 index.mq.md 为入口。ABI 只补原子版本提交、编译器调用与有界试运行；
阶段规则、用户确认、文稿骨架和工程约束在 Marqdo 源码内。并发单元分别写自己的文件，
源文件改变就使原试运行证据失效。用户可以配置并发数与子模型，权限由宿主验证。

调用例：`marqdo call ext/root-skill/index.mq.md status --args-json - --effects plugin,fs.read,fs.write,environment.read --fs-root 工作目录 --json`。
context 由宿主注入，其中 root 是会话的私有状态根，workspace 是用户材料根；它们不得由模型指定。
源码使用同一套参数和返回表，叙述解释为什么执行和怎样验收，而非孤立命令堆积。



工程分工：state.mq.md 保存版本和用户确认；intent.mq.md 对齐目标；planning.mq.md 形成可审阅框架；authoring.mq.md 负责单元创作、案例和汇总；delivery.mq.md 形成完整入口；policy.mq.md 提供模型和执行器共同使用的阶段门禁。

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


具体实现与局部开发说明见 [core 模块](state.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](core.status(context=`context`))*.

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

具体实现与局部开发说明见 [core 模块](state.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](core.begin(context=`context`,user_input=`user_input`,message_id=`message_id`))*.

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

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [intent 模块](intent.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](intent.clarify_intent(context=`context`,summary=`summary`,question=`question`,choices=`choices`))*.

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

具体实现与局部开发说明见 [plan 模块](planning.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](plan.outline(context=`context`,title=`title`,goal=`goal`,acceptance=`acceptance`,units=`units`))*.

## refine

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 需要真实并发细化的状态；全部证据齐全时才进入 implement。 |

Use `context`。

第一次调用请求宿主按已确认配置启动受限子智能体。返回 dispatch_requested 只是调度请求，
并不宣称子任务已经执行；实际开始、模型、退出与结果由宿主发布为事件。每个子任务只写
自己的文件，拥有相同的作者和试运行工具，其模型来自用户允许的设置，不继承隐藏权限。
再次调用会核对每个单元的 ready、trial.passed 和当前文件哈希；有一个缺失就不能前进。

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [author 模块](authoring.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](author.refine(context=`context`))*.

## integrate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主身份和私有任务上下文 |
| narrative | text | required | 最终方案的充分叙述，说明用户决策、实现边界、调用关系与验收方法 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 经过真实整合校验和冒烟试运行、等待用户验收的完整文稿。 |

Use `context`, `narrative`。

方案落地不能只是拼接一段答复。本函数重新读取每个单元源码，对照细化阶段保存的摘要
和案例结果，拒绝陈旧或失败的单元；然后建立多文件工程的 index.mq.md 入口。函数实现
来自已校验的片段，公共标准库导入只保留一次，所有依赖按已确认的顺序连通。
用户原话、选择与确认以叙述写进 run 函数，和业务逻辑在同一份源码中保留。narrative
必须进一步解释设计和限制，不能只写“已完成”；官方叙述比例检查会对每个函数独立验证。

整合使用同一份文件做语法、契约、叙述比例与试运行检查。冒烟通过只证明入口能运行，
不是自动的业务验收。右侧 View 展示实际 index.mq.md，用户验收之后才记录完成。
未接通项从官方 labels 查询取得，显式列出并需要额外知悉，绝不因为 None 能返回就
当作实现。任何失败保留已存在文件与诊断，不隐瞒未完成的工作，也不自动重复业务副作用。

具体实现与局部开发说明见 [delivery 模块](delivery.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](delivery.integrate(context=`context`,narrative=`narrative`))*.

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

具体实现与局部开发说明见 [core 模块](state.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](core.respond(context=`context`,revision=`revision`,action=`action`,answer=`answer`,choice=`choice`,settings=`settings`,accept_stubs=`accept_stubs`))*.

## author_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| unit_id | text | required | 框架已登记的单元身份 |
| narrative | text | required | 解释真实业务逻辑、输入假设、限制与返回 |
| mode | text | "literal" | literal 返回结构化值；select 按 value 键路径读取输入；code 写函数体 |
| body | text | "" | code 模式的函数体，其他模式留空 |
| value | any | None | literal 的原始结构化值，勿先 JSON 编码；select 的字符串键路径数组 |
| cases | list | required | 一到六个 input、expected 案例，必须实际试运行 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 合法候选源码及校验摘要；未校验不能替换工程文件。 |

Use `context`, `unit_id`, `narrative`, `mode`="literal", `body`="", `value`=None, `cases`。

不熟悉语法的模型可以选择 literal，仅填写结构化结果、叙述和案例；工具生成全部声明。
需要业务计算时再选择 code，函数体可使用 input 和已导入的 math、table、text、json、fs、
re、hash。参数与返回表、明确的 input 读取、前置信息和文件组织由模板保证。
候选先写入隔离位置，经官方 MLSP、契约检查和每个函数叙述比例检查通过，才发表到工程。
检查失败返回真实诊断，不用漂亮的文字代替运行。author_unit 只说明代码可被接受，
还没有证明结果正确；必须随后调用 trial_unit，并核对期望与实际返回。

A literal is useful for a readable manuscript, a bounded reference table, or a supplied constant result;
it is not a license to substitute invented data for required research. The narrative must say where
its content came from and which business assumptions remain. Code mode retains the same stable input
contract while allowing actual calculations. The compiler is the syntax authority, not a second Python
implementation of Marqdo. An invalid candidate stays outside the published unit, and the previous
source remains available for inspection. The accepted source digest is recorded with the declared
cases, so a later edit cannot inherit an earlier successful trial. The child owns one identifier and
cannot author the shared entry point or another child's file. Cases include explicit input and expected
values, including null when it is meaningful. Passing a case establishes that observed example only;
final business acceptance remains a separate user action. A result without the required narrative,
contract or compiler evidence remains incomplete and cannot move the root workflow forward.

具体实现与局部开发说明见 [author 模块](authoring.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](author.author_unit(context=`context`,unit_id=`unit_id`,narrative=`narrative`,mode=`mode`,body=`body`,value=`value`,cases=`cases`))*.

## trial_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| unit_id | text | required | 已经发表合法源码的当前单元 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际试运行结果与源码哈希，失败不能标为 ready。 |

Use `context`, `unit_id`。

先核对当前单元的作者身份与阶段，再用保存的哈希确认源码没有变化。ABI 在独立试运行
目录中调用 unit_身份，只有文件读写效果，不允许模型从案例中指定另一个可执行文件。
每个案例都保留实际返回、期望值与退出；全部匹配才成为 ready。失败仍保存诊断，
子智能体可以据此修改自己的单元，再重新校验和试运行，不能只改状态文字。
候选语法通过与试运行通过是两种证据，不能互相替代。最终整合会再次确认摘要，
因此用户或另一个进程改动了文件之后，原来的成功不会悄悄沿用。

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [author 模块](authoring.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](author.trial_unit(context=`context`,unit_id=`unit_id`))*.

## policy

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主身份和私有任务上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前阶段允许的工具身份与对应工程指南。 |

Use `context`。

这份策略既用于模型看到的工具目录，也用于执行前再次授权。两个位置使用同一函数，
不让旧提示词或缓存工具保留越阶段权限。等待用户回答时只允许读状态，模型不能继续写入。
意图与基本方案阶段保留材料读取和纯计算，但没有通用写文件、业务执行或委托能力。
细化必须经过专用作者、校验与试运行；主智能体只能请求受限调度，不能自行提高并发数。
方案落地阶段才开放必要业务工具，其原有插件开关仍须成立。完成记录不会被模型重置，
新的用户目标由宿主重新开启意图阶段。阶段指南与实际源码一起构成模型的可调用开发手册。

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [flow 模块](policy.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](flow.policy(context=`context`))*.

## gate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主身份和私有任务上下文 |
| name | text | required | 执行器准备调用的已登记身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 阶段授权结果；拒绝不能产生业务执行。 |

Use `context`, `name`。

工具注册只是安装事实，不等于当前阶段授权。执行器在开启工具收据和副作用账本之前
调用此门禁；策略变化立即作用于下一次真实调用。拒绝只记录原因，不把模型的请求当作
用户确认，也不将失败转换成另一条不受约束的命令。这个函数不接受模型提交的阶段或
allowed_tools，始终从会话私有根状态读取。用户停用其他插件仍由原注册器再次拒绝，
根 SKILL 停用则不能启动智能体任务，不提供绕过必经步骤的回退模式。

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [flow 模块](policy.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](flow.gate(context=`context`,name=`name`))*.

## schema

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的安装根 |
| function | text | required | 当前根 SKILL 的固定公开或单元函数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 官方 MLSP 从本源码提取的函数契约 |

Use `context`, `function`。

模型工具面从真实参数表投影，不再维护另一份任意签名。
宿主移除 context 这个可信参数，再把 text、list、map 等语言类型映射为供应商接受的
JSON Schema。数组的单元结构仍遵循对应函数的就地说明，并在实际调用时重新验证。
查询只接受固定根函数身份，不读取任意服务器文件，也不执行候选业务程序。
当文档契约发生变化，模型拿到的工具参数随源码更新，而不是继续使用过时的隐藏提示。

这份门面沿用实现模块的真实参数，不重新解释阶段和权限。宿主提供 context，模型仅填写可见业务参数。读取、确认、校验、试运行和验收保持各自职责，错误记录不被成功文字覆盖。所有必要事实都从当前任务状态和实际文件恢复，刷新页面不会产生额外授权。

具体实现与局部开发说明见 [core 模块](state.mq.md)。修改行为时更新实现和对应阶段指南；此处始终保持同一调用契约。

Return *[通过已说明的函数执行本阶段](core.schema(context=`context`,function=`function`))*.



## author_text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的私有状态根与受限单元身份 |
| unit_id | text | required | 当前已确认框架中的单元身份 |
| narrative | text | required | 解释来源、业务规则、输入假设和限制 |
| content | text | required | 用户明确提供或依据真实材料形成的正文，原样返回，不是字段名 |
| cases | list | required | 一到六个真实 input、expected 案例 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实作者结果，仍需实际试运行，不代表业务验收 |

Use `context`, `unit_id`, `narrative`, `content`, `cases`。

这是给不熟悉语言语法的模型使用的专用作者函数。只填写已经明确的业务材料，无需撰写
源码、编码 JSON、选择生成模式或拼接返回语法。工具负责生成参数表、返回表和自然叙述，
再经过官方编译器检查与叙述比例检查，才替换自己的工程单元。案例仍交给独立调用执行，
没有真实运行结果不能把单元改为就绪。所有权限、源码摘要和用户确认边界与通用作者一致。

如果需要固定文字，调用 author_text，content 直接填写那段文字。如果需要动态取值，
调用 author_select，path 填写字符串数组，不把数组转换成一段文字。两种模板都不会替
缺失的业务操作编造数据；需要实际计算或其他处理时，应继续使用通用 author_unit 的
code 模式，先阅读对应库源码再写函数体。内容与假设需根据真实用户交流解释，不从示例
推断外部事实。模板成功仅表示合法实现已经发表，后续试运行失败仍需修复。

这个函数不修改确认范围，不选择另一个子智能体，不调整并发和模型。多个作者同时工作
时，只归并本单元的新状态，不能用自己的快照覆盖他人的结果。最终工程仍由主流程整合，
并由用户在实际 View 中审阅。不能把模板便利当成省略阶段或替用户接受交付的理由。

Return *[通过已校验的模板发表本单元](author.author_unit(context=`context`,unit_id=`unit_id`,narrative=`narrative`,mode="literal",body="",value=`content`,cases=`cases`))*.


## author_select

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的私有状态根与受限单元身份 |
| unit_id | text | required | 当前已确认框架中的单元身份 |
| narrative | text | required | 解释来源、业务规则、输入假设和限制 |
| path | list | required | 从 input 开始的字符串键路径，例如 request、text 两层 |
| cases | list | required | 一到六个真实 input、expected 案例 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实作者结果，仍需实际试运行，不代表业务验收 |

Use `context`, `unit_id`, `narrative`, `path`, `cases`。

这是给不熟悉语言语法的模型使用的专用作者函数。只填写已经明确的业务材料，无需撰写
源码、编码 JSON、选择生成模式或拼接返回语法。工具负责生成参数表、返回表和自然叙述，
再经过官方编译器检查与叙述比例检查，才替换自己的工程单元。案例仍交给独立调用执行，
没有真实运行结果不能把单元改为就绪。所有权限、源码摘要和用户确认边界与通用作者一致。

如果需要固定文字，调用 author_text，content 直接填写那段文字。如果需要动态取值，
调用 author_select，path 填写字符串数组，不把数组转换成一段文字。两种模板都不会替
缺失的业务操作编造数据；需要实际计算或其他处理时，应继续使用通用 author_unit 的
code 模式，先阅读对应库源码再写函数体。内容与假设需根据真实用户交流解释，不从示例
推断外部事实。模板成功仅表示合法实现已经发表，后续试运行失败仍需修复。

这个函数不修改确认范围，不选择另一个子智能体，不调整并发和模型。多个作者同时工作
时，只归并本单元的新状态，不能用自己的快照覆盖他人的结果。最终工程仍由主流程整合，
并由用户在实际 View 中审阅。不能把模板便利当成省略阶段或替用户接受交付的理由。

Return *[通过已校验的模板发表本单元](author.author_unit(context=`context`,unit_id=`unit_id`,narrative=`narrative`,mode="select",body="",value=`path`,cases=`cases`))*.

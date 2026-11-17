---
markup: occlusion
title: 根 SKILL · authoring
import:
  workbook: runtime/workbook.mq.md
  core: state.mq.md
  proof: proof.mq.md
  trial_engine: runtime/trial.mq.md
  contract: runtime/document-contract.mq.md
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

## unit_record

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 当前任务状态 |
| unit_id | text | required | 稳定单元身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 匹配的单元记录；不存在时为 None。 |

Use `state`, `unit_id`。

这是内部纯查询，身份不能变成文件路径或另一会话的编号。后续作者和试运行入口都使用
同一份状态记录，避免从模型答文猜测单元是否存在。返回 None 表示没有授权的框架单元，
不是一个可以随意新增文件的空白授权。读取不会改变 revision，也不重新执行已有案例。
父任务核验职责与交接内容时可以复用查询结果，但不能据此伪造子任务的完成证据。

We **units = access(`state`,"units")**.
- [只匹配当前框架登记的单元](for units as unit)
  1. access(`unit`,"id") == `unit_id`
    Return *unit*.
Return *None*.



## publish_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| unit | map | required | 本次校验或试运行后的单元记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 版本合并后的真实单元状态。 |

Use `context`, `unit`。

每个子智能体只能发表自己的单元。宿主把 unit_id 注入子上下文，模型参数不能扩大它。
发布前重新读取整份状态，合并自身记录，并保留其他单元的最新结果。原子版本冲突返回
明确失败，调用方有界重试；不能用整个旧快照覆盖另一个子智能体刚交回的代码摘要。
这个函数不改变工程阶段，全部单元就绪还需要 refine 汇总。源文件哈希与试运行摘要
随同单元一起保存，后续整合必须再次读取真实源码，任何手动修改都会使旧证据失效。

这次更新仅归并本单元的观测事实，不批准下一个阶段；另一个子任务的进度和用户确认必须原样保留。

Return *proof.save_unit(context=`context`,item=`unit`)*.


## author_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| unit_id | text | required | 框架已登记的单元身份 |
| narrative | text | required | 解释真实业务逻辑、输入假设、限制与返回 |
| mode | text | "literal" | literal 返回结构化值；select 按 value 键路径读取输入；code 写函数体 |
| body | text | "" | code 模式的函数体，其他模式留空 |
| value | any | None | literal 的原始结构化值，勿先 JSON 编码；select 的字符串键路径数组 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 合法候选源码及校验摘要；未校验不能替换工程文件。 |

Use `context`, `unit_id`, `narrative`, `mode`="literal", `body`="", `value`=None。

来源记录与正文文件分开管理。只有实际浏览或已就绪依赖交回的观察才可成为文章依据；作者没有手动登记一个“已访问”网址的权限。模板保存正文时不替作者添加未声明结论，也不会把猜测文章改成一份固定原文契约。

研究与文档职责只接受原生正文文本，不把结构化状态或一个返回文件名的对象当作文章。模板通过检查后仍须面对测试者冻结的文档契约，缺少真实来源无法就绪。

Text manuscripts have a separate source of truth: the raw Markdown artifact. The generated function reads that exact file and checks its digest, rather than decoding an escaped representation of the article. The executable explanation and the article remain separately readable. A compiler receipt cannot substitute for missing research, and the existence of a file cannot substitute for a successful independent trial. A model changing its narration does not update a frozen contract. Revisions must go through the same authoring and verification boundary.

不熟悉语法的模型可以选择 literal，仅填写原始结构化结果、叙述和案例；不要自行 JSON 编码。
读取输入时选择 select，value 例如 ["request","text"]，工具生成逐层取值语句；空数组返回整个输入。
select 不执行键名中的代码，缺失字段返回 None，并仍须通过所有实际案例。工具生成全部声明。独立案例由测试者冻结，实现者不提供预期。
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
source remains available for inspection. The accepted source digest is bound to independently frozen
cases, so a later edit cannot inherit an earlier successful trial. The child owns one identifier and
cannot change the root entry or another child's function section. Cases include explicit input and expected
values, including null when it is meaningful. Passing a case establishes that observed example only;
final business acceptance remains a separate user action. A result without the required narrative,
contract or compiler evidence remains incomplete and cannot move the root workflow forward.

每个字段的来源和空值行为都应让后续接手的开发者能够从源码直接理解。

输入取值模板同样遵守业务约束：键路径描述字段来源，不描述执行语句。模板只读取调用时真正传入的对象，不访问服务器全局状态，不猜测缺失材料，不允许把另一个单元的私有结果当作输入。作者应至少用两个不同的字段值验证这种读取行为，并在叙述中解释空值是否属于有效输出。若任务要求转换、汇总或写入文件，应改用真实业务代码，不能通过选择模板掩盖这些尚未实现的操作。检验案例仍由宿主在隔离目录实际执行，模板便利不会降低任何验收条件。

The author must not infer that compiler acceptance makes a claim factually correct. Keep the original evidence and write limitations into the narration; the final reviewer will still see those boundaries.

Each publication changes only the assigned function in the working copy of the approved plan. The controller first checks an isolated candidate, then submits that function fragment under a lock. The current shared file is reread inside the lock; an author never writes its remembered copy of the whole document. Other sections, their running trials and their valid receipts remain intact. A candidate containing another function or changing the fixed imports is rejected. Trial material is a separate snapshot of this exact section and does not become a second implementation. The parent later connects these already verified functions rather than generating a different combined implementation.


We **initialized = workbook.ensure(context=`context`)**.
1. not access(`initialized`,"ok")
  Return *initialized*.
We **state = access(`initialized`,"value")**.
We **unit = unit_record(state=`state`,unit_id=`unit_id`)**.
1. access(`state`,"phase") != "refine" or `unit_id` != json.get(value=`context`,key="unit_id") or not `unit`
  Return *result.error(code="root.unit_scope",message="未获此单元的细化授权",operation="author_unit")*.
1. (json.get(value=`unit`,key="mode") == "research" or json.get(value=`unit`,key="mode") == "document") and type(`value`) != "text"
  Return *result.error(code="root.document_body",message="研究与文章必须提供原生 Markdown 正文",operation="author_unit")*.
1. `narrative` == ""
  Return *result.error(code="root.cases",message="必须写明真实业务逻辑",operation="author_unit")*.
We **document_path = None**.
We **document_sha = None**.
1. `mode` == "literal"
  1. type(`value`) == "text"
    We **document_path = "solution/documents/" + `unit_id` + ".md"**.
    We **_ = fs.make_dirs(path="solution/documents")**.
    We **_ = fs.atomic_write(path=`document_path`,text=`value`)**.
    We **document_sha = hash.sha256(text=`value`)**.
    We **body = document_body(unit_id=`unit_id`,path=`document_path`,sha256=`document_sha`)**.
  2. *
    We **body = "Return *[返回本单元明确声明的结构化结果](json.parse(text=" + literal(value=`value`) + "))*."**.
2. `mode` == "select"
  We **body = "We **selected = \x60input\x60**.\n"**.
  1. type(`value`) != "list" or table.len(xs=`value`) > 8
    Return *result.error(code="root.select_path",message="select 的 value 必须是至多八个字符串组成的键路径",operation="author_unit")*.
  - [依次读取用户明确声明的键路径](for value as key)
    1. type(`key`) != "text"
      Return *result.error(code="root.select_path",message="键路径只接受字符串",operation="author_unit")*.
    We **body = `body` + "We **selected = [读取已声明的输入字段](json.get(value=\x60selected\x60,key=json.parse(text=" + literal(value=`key`) + ")))**.\n"**.
  We **body = `body` + "在依次读取声明字段之后，我们得到原始内容并直接返回。\nReturn *[返回实际输入字段](\x60selected\x60)*."**.
3. `mode` != "code" or `body` == ""
  Return *result.error(code="root.author_mode",message="选择 literal、select 或有实际函数体的 code",operation="author_unit")*.
We **fragment = "## unit_" + `unit_id` + "\n\n| 参数 | 类型 | 默认 | 说明 |\n|---|---|---|---|\n| input | any | None | 记录，包含 request 与 dependencies |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 本单元真实结果，案例在工程状态中单独核验 |\n\nUse \x60input\x60=None。\n\n" + core.prose(content=`narrative`) + "\n\n本单元遵循已确认框架，输入由调用者明确提供。下面读取该输入后才进入实际业务逻辑；固定结果必须说明数据来源，计算结果必须说明适用条件。结构与语法校验并不等同于业务验收，真实案例将独立保存参数、返回与退出证据。\n\n工程整合会再次检查源码摘要，发生修改后必须重新试运行。本文既是可阅读的说明，也是唯一被调用的实现，不允许用聊天总结替代它，也不允许把尚未接通的操作描述为已经完成。\n\nWe **provided_input = \x60input\x60**.\n" + `body` + "\n"**.
We **header = source_header()**.
We **source = `header` + `fragment`**.
We **candidate = ".agent/root-candidates/" + `unit_id` + ".mq.md"**.
We **_ = fs.make_dirs(path=".agent/root-candidates")**.
We **_ = fs.atomic_write(path=`candidate`,text=`source`)**.
We **checked = core.native(context=`context`,operation="root_check",payload=table.put(in=table.put(in=None,at="path",value=`candidate`),at="single_function",value=("unit_" + `unit_id`)))**.
1. not access(`checked`,"ok") or not json.get(value=access(`checked`,"value"),key="valid")
  Return *result.error(code="root.invalid_source",message=json.stringify(value=`checked`),operation="author_unit")*.
We **write_args = table.put(in=None,at="unit_id",value=`unit_id`)**.
We **write_args = table.put(in=`write_args`,at="candidate",value=`candidate`)**.
We **write_args = table.put(in=`write_args`,at="expected_sha256",value=json.get(value=`unit`,key="sha256"))**.
We **committed = core.native(context=`context`,operation="root_section_write",payload=`write_args`)**.
1. not access(`committed`,"ok")
  Return *committed*.
We **section = access(`committed`,"value")**.
We **path = "solution/index.mq.md"**.
We **details = access(`checked`,"value")**.

`patch` =

| path | fragment | sha256 | check | status |
|---|---|---|---|---|
| `path` | `section`[^fragment] | `section`[^sha256] | `details` | "written" |

We **patch = table.put(in=`patch`,at="function",value=access(`section`,"function"))**.
1. `mode` == "literal" and type(`value`) == "text"
  We **artifact = table.put(in=table.put(in=None,at="path",value=`document_path`),at="sha256",value=`document_sha`)**.
  We **patch = table.put(in=`patch`,at="artifact",value=`artifact`)**.
Return *publish_unit(context=`context`,unit=table.merge(a=`unit`,b=`patch`))*.



## source_header

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 所有生成单元共享的标准库导入头。 |

Use 。

这个内部模板是固定的安装能力集合，不接受模型提供的插件路径。生成程序仍受每次调用的
效果限制，导入 fs 不代表拥有服务器文件权限。所有工作在受限工作根内执行，试运行没有
进程、网络或插件效果。标题是稳定的文稿类型，不将用户输入拼进 YAML 元数据。
单元合并时只保留一个导入头，避免重复声明、路径漂移或让项目入口依赖临时子目录。
模板不含业务结论或伪造的成功值；真实逻辑写在函数里，随后独立验证。

Return *workbook.header()*.



## trial_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 由宿主注入，子智能体另有受限 unit_id |
| unit_id | text | required | 已经发表合法源码的当前单元 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际试运行结果与源码哈希，失败不能标为 ready。 |

Use `context`, `unit_id`。

The suite can describe either exact input/output cases or a document contract. Exact cases compare native values; document contracts check the actual returned text and citations against observations obtained through the browser. Neither kind is created by the implementation role. The selected kind is frozen with the approved specification, so an author cannot downgrade an exact-return task into a length check. Both run the actual generated function in the official CoW sandbox before inspecting results. Source and artifact digests are checked again when the parent considers integration. A contract passing means its stated structural assertions passed; it is not a claim that the article is scientifically correct, comprehensive, or approved by the user. These limits stay visible in the receipt, and the final review gate still requires authenticated user input.

先核对当前单元的作者身份与阶段，再用保存的哈希确认源码没有变化。ABI 在独立试运行
目录中调用 unit_身份，只有文件读写效果，不允许模型从案例中指定另一个可执行文件。
作者自检不授予就绪。这里只使用另一受限测试角色根据冻结规格提供的独立案例。
每个独立案例都保留实际返回、期望值与退出；全部匹配才成为 ready。失败仍保存诊断，
子智能体可以据此修改自己的单元，再重新校验和试运行，不能只改状态文字。
候选语法通过与试运行通过是两种证据，不能互相替代。最终整合会再次确认摘要，
因此用户或另一个进程改动了文件之后，原来的成功不会悄悄沿用。

The process output is an observation, not a request for another tool. A child cannot broaden effects by writing instructions into stdout. Each case runs the fixed generated function against its explicit input; the adapter records the actual exit and decoded return before comparison. A timeout remains a failure, even if a partial file exists. The final record belongs to this source version only, which makes independent retries inspectable and prevents stale evidence from promoting the next stage.

独立测试的摘要随这次试运行保留，整合时还会再次比对。同样的函数名和相同返回类型不能证明沿用的是同一套预期；规格或测试被改动之后，原有通过记录必须失效。实现者自检仅能帮助定位问题，不再授予阶段推进的资格。

We **state = access(core.status(context=`context`),"value")**.
We **unit = unit_record(state=`state`,unit_id=`unit_id`)**.
1. access(`state`,"phase") != "refine" or `unit_id` != json.get(value=`context`,key="unit_id") or not json.get(value=`unit`,key="sha256")
  Return *result.error(code="root.unit_scope",message="先在当前单元完成源码校验",operation="trial_unit")*.

We **suite = proof.cases(context=`context`)**.
1. not access(`suite`,"ok")
  Return *suite*.
We **independent_cases = access(access(`suite`,"value"),"cases")**.
We **member = "unit_" + `unit_id`**.

`payload` =

| path | function | cases | sha256 |
|---|---|---|---|
| `unit`[^path] | `member` | `independent_cases` | `unit`[^sha256] |

We **frozen = access(`suite`,"value")**.
We **document_contract = json.get(value=`frozen`,key="kind") == "document"**.
1. `document_contract`
  We **independent_cases = table.append(list=table.empty_list(),item=table.put(in=None,at="input",value=None))**.
We **artifacts = table.empty_list()**.
1. json.get(value=`unit`,key="artifact")
  We **artifacts = table.append(list=`artifacts`,item=access(`unit`,"artifact"))**.
We **snapshot = workbook.snapshot(context=`context`,item=`unit`)**.
1. not access(`snapshot`,"ok")
  Return *snapshot*.
We **snapshot = access(`snapshot`,"value")**.
We **observed = trial_engine.run(context=`context`,path=access(`snapshot`,"path"),function=`member`,cases=`independent_cases`,sha256=access(`unit`,"sha256"),artifacts=`artifacts`,smoke=`document_contract`)**.
1. not access(`observed`,"ok")
  Return *observed*.
We **trial = access(`observed`,"value")**.
1. `document_contract`
  We **trial = contract.check(context=`context`,item=`unit`,rules=access(`frozen`,"rules"),trial=`trial`)**.
We **trial = table.put(in=`trial`,at="suite_sha256",value=access(access(`unit`,"tests"),"sha256"))**.
We **assurance = "independent_cases"**.
1. `document_contract`
  We **assurance = "independent_contract"**.
We **trial = table.put(in=`trial`,at="assurance",value=`assurance`)**.
We **next = "failed"**.
1. access(`trial`,"passed")
  We **next = "ready"**.
We **unit = table.put(in=`unit`,at="trial",value=`trial`)**.
Return *publish_unit(context=`context`,unit=table.put(in=`unit`,at="status",value=`next`))*.



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

Parallel implementation is an engineering consequence of the approved boundaries, not an instruction
to run an unbounded number of agents. The host enforces the selected concurrency and cancellation
scope, while this function decides whether the evidence is sufficient for the next document stage.
A ready label without a passed trial is rejected. A passed trial for a different source digest is also
rejected. The worker may retry a compiler error within its own budget, but a failed or interrupted
child remains visible. This aggregate check is separate from all of those individual operations and
cannot be replaced by the parent saying that the children probably finished. Independent files avoid
a shared edit buffer, and compare-and-swap prevents one child's state update from erasing another's
result. A restart can inspect already valid units and continue only the missing work. New source must
be tested again; neither a cached answer nor an old execution receipt transfers automatically.

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "refine" or json.get(value=`state`,key="pending")
  Return *result.error(code="root.stage",message="需要用户先确认基本方案",operation="refine")*.
We **ready = True**.
We **units = access(`state`,"units")**.
- [逐个核对真实源码和试运行](for units as unit)
  We **own = table.put(in=`context`,at="unit_id",value=access(`unit`,"id"))**.
  1. not proof.ready(context=`own`,item=`unit`)
    We **ready = False**.
1. `ready`
  We **state = table.put(in=`state`,at="phase",value="implement")**.
  Return *core.save(context=`context`,state=table.put(in=`state`,at="dispatch_requested",value=False))*.
Return *core.save(context=`context`,state=table.put(in=`state`,at="dispatch_requested",value=True))*.



## literal

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | any | required | 要放进生成函数里的结构化数据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 安全的 Marqdo 字符串字面量，内容是 JSON 文本 |

Use `value`。JSON 序列化会保护引号、换行与反斜杠，但 Marqdo 的引号内仍有反引号插值。
因此把数据中的反引号再编码成官方支持的十六进制字面字符，防止材料中的示例变量
被误当成生成器自己的变量。返回文本交给 json.parse，最终得到原始值，不靠模型手写
复杂引号或数组语法。这个纯函数不读取文件，不执行值中的代码，也不扩展工具权限。
literal 模式尤其适合先建立可调用的文稿与结构化案例；事实来源仍需在叙述中明确。

Return *[按字面保留材料而不提前插值](text.replace(text=json.stringify(value=json.stringify(value=`value`)),old="\x60",new="\\x60"))*.



## author_text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的私有状态根与受限单元身份 |
| unit_id | text | required | 当前已确认框架中的单元身份 |
| narrative | text | required | 解释来源、业务规则、输入假设和限制 |
| content | text | required | 用户明确提供或依据真实材料形成的正文，原样返回，不是字段名 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实作者结果，仍需实际试运行，不代表业务验收 |

Use `context`, `unit_id`, `narrative`, `content`。

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

Return *[通过已校验的模板发表本单元](author_unit(context=`context`,unit_id=`unit_id`,narrative=`narrative`,mode="literal",body="",value=`content`))*.


## author_select

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主注入的私有状态根与受限单元身份 |
| unit_id | text | required | 当前已确认框架中的单元身份 |
| narrative | text | required | 解释来源、业务规则、输入假设和限制 |
| path | list | required | 从 input 开始的字符串键路径，例如 request、text 两层 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实作者结果，仍需实际试运行，不代表业务验收 |

Use `context`, `unit_id`, `narrative`, `path`。

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

Return *[通过已校验的模板发表本单元](author_unit(context=`context`,unit_id=`unit_id`,narrative=`narrative`,mode="select",body="",value=`path`))*.

## document_body

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| unit_id | text | required | 已检查单元身份 |
| path | text | required | 真实正文相对路径 |
| sha256 | text | required | 发表时正文摘要 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | document_body 的真实结果，失败保留诊断 |

Use `unit_id`, `path`, `sha256`。

生成一个读者能够直接理解的文档函数体。正文是独立数据文件，文章中的引号、反引号、原生 Markdown 表格和嵌套代码示例都保持原样，不需要作者手工转义。可执行文稿解释来源与版本，调用时真正读取正文，再比较发表时的内容摘要；它不是把聊天回答包装成一句“已完成”。

文件路径来自已确认的稳定身份，不能用网页标题或模型给出的任意路径替代。相对路径从任务执行根解释；独立试运行会将同一正文按摘要写入官方 CoW 上层，所以测试读取的材料和实际调用读取的材料属于同一个版本。修改正文必须重新发表与试运行，旧源码也不会悄悄返回新数据。返回 None 明确表示版本保护拒绝，不是假装获得空白的有效文章。

这个纯生成器不写文件、不执行正文、不作事实断言；保存与编译是作者入口的责任。链接供人类寻找完整材料，函数中的 fs.read_text 才是实际取值。正文虽作为 Markdown 数据保存，业务调用仍由 Marqdo 函数定义；不把一个长 JSON 字符串当作可阅读源稿，也不伪称文章自然语言本身会执行。

Return *"完整正文位于任务路径 solution/documents/" + `unit_id` + ".md，引号、换行与示例围栏保持原样。调用时实际读取这份材料并核对内容摘要，不从嵌套 JSON 字符串还原正文。正文变化后需要重新发表与验证，不能沿用旧证据。\nWe **content = [读取本单元的真实正文](fs.read_text(path=" + json.stringify(value=`path`) + "))**.\n1. hash.sha256(text=\x60content\x60) != " + json.stringify(value=`sha256`) + "\n  Return *[正文版本已变化，拒绝沿用旧验证](None)*.\n在读取并确认当前版本之后，我们得到了所需的正文，此时直接返回原始内容。\nReturn *\x60content\x60*."*.

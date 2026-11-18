---
markup: occlusion
title: 独立测试的规格、冻结与验证
import:
  workbook: runtime/workbook.mq.md
  core: state.mq.md
  io: runtime/io.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  hash: lib/hash.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

独立测试的规格、冻结与验证。测试者只读取公开意图，预期结果不由实现者提供。

## unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 真实根状态 |
| unit_id | text | required | 已确认单元身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 命中时的单元记录；身份不存在时为 None，调用方必须拒绝 |

Use `state`, `unit_id`。

按照稳定身份寻找一个单元，不猜测同名函数或任意路径。找不到时返回空值，调用者必须拒绝，不得把缺失记录当作已经验证的实现。这个纯读取不改变任何状态。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **units = access(`state`,"units")**.
- [寻找当前单元](for units as item)
  1. access(`item`,"id") == `unit_id`
    Return *item*.
Return *None*.

## prepare

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 从已确认框架得到的无执行语义规格 |

Use `context`。

只有框架确认后的细化阶段能建立测试规格。规格只使用已批准的本单元职责与公开契约，固定公开输入返回；不读取实现文件、开发对话或已有输出。文字先实体转义，官方 AST 再检查没有可执行语句。它与框架摘要绑定，不因实现修改而改变。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

同一框架内多次恢复应取得同一规格，不能把实现者后续写入的说明混进测试上下文。公开规格另存为可阅读材料，文件路径与摘要随单元保留；缺少规格时必须重新从已确认框架生成，不能临时询问实现者要一份能通过的预期。

准备顺序刻意先于实现。最初规格没有作者源码可读，恢复时也只复用状态中已经冻结的规格，绝不从新实现反推规则。原生解析检查覆盖整个文稿的函数体与导入，确认没有赋值、分支、调用或隐含执行；如果转义后的用户文字仍被识别成语句，准备操作失败，测试者不会接收这份材料。公开参数和返回类型保留，因为独立测试需要知道如何观察行为；内部变量、辅助函数与实际条件分支不属于公开意图。

规格的可读文件用于右侧审阅，私有状态中的文本和摘要用于执行绑定。它们由同一次准备生成，随后只把自己的单元记录合并进最新状态。出现并发冲突时重新读取，而不是用较早快照覆盖其他作者。规格缺失、框架未确认或单元身份不存在都会阻止继续，不能把空规格理解为允许测试任何结果。

规格摘要始终指向这一份已确认规则，实施细节不能成为规格的隐含来源。

We **state = access(core.status(context=`context`),"value")**.
We **item = unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
1. access(`state`,"phase") != "refine" or not `item`
  Return *result.error(code="root.spec_scope",message="先确认框架与单元",operation="prepare")*.
1. json.get(value=`item`,key="specification")
  Return *result.ok(value=access(`item`,"specification"))*.
We **source = specification_source(item=`item`)**.
We **checked = io.native(context=`context`,operation="runtime_intent",payload=table.put(in=None,at="source",value=`source`))**.
1. not access(`checked`,"ok")
  Return *checked*.
We **_ = fs.make_dirs(path="solution/specifications")**.
We **spec_path = "solution/specifications/" + access(`item`,"id") + ".intent.md"**.
We **_ = fs.atomic_write(path=`spec_path`,text=`source`)**.
We **specification = table.put(in=access(`checked`,"value"),at="path",value=`spec_path`)**.
We **specification = table.put(in=`specification`,at="outline_sha256",value=access(`state`,"outline_sha256"))**.
We **item = table.put(in=`item`,at="specification",value=`specification`)**.
Return *save_unit(context=`context`,item=`item`)*.

## merge_once

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| item | map | required | 自己单元的新记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原子归并后的根状态 |

Use `context`, `item`。

独立测试和实现可以在不同进程中工作，写入时必须先重新读取整份状态，再替换自己的单元，保留其他单元与真实用户决定。版本冲突由调用层有界重试，不能覆盖整个旧快照。这个函数不改变阶段。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **state = access(core.status(context=`context`),"value")**.
We **items = access(`state`,"units")**.
We **updated = table.empty_list()**.
- [只归并本单元](for items as old)
  1. access(`old`,"id") == access(`item`,"id")
    We **old = `item`**.
  We **updated = table.append(list=`updated`,item=`old`)**.
Return *core.save(context=`context`,state=table.put(in=`state`,at="units",value=`updated`))*.

## submit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| cases | any | required | 独立测试者提供的输入预期或文档契约 |
| rationale | text | required | 业务规则、边界和预期来源 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 冻结测试元数据，不能沿用实现者自检 |

Use `context`, `cases`, `rationale`。

Document rules are frozen before the author runs. They describe observable properties of the eventual output, not a guessed answer. The native boundary validates their numeric limits and retains the test-only role check. The same atomic root revision carries the rules and their digest; implementation retries cannot replace either. If the public specification changes, return to framework confirmation instead of accepting a convenient new rule.

只有测试角色可提交自己的案例。相同规格的测试一旦冻结就不能被替换，实现者只能修复代码。测试随根状态以同一个版本原子保存，角色工作根里没有实现，也没有修改其他记录的入口。修改需求必须重新确认框架。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

冻结记录把案例、理由、规格身份与框架身份放进同一个原生值。ABI 负责数量、结构、体积与测试角色的复核，根状态的版本提交负责原子性；案例和摘要不会分别写入两个可能不同步的文件。案例输入是被测函数接收的真实原生值，expected 是根据规则独立给出的业务返回，不是作者工具的诊断包装。缺少明确预期的观测不能算验收案例。

一旦已有冻结记录，本次调用直接拒绝替换。错误实现可以多次修复，但必须反复面对同一份案例。若测试规则本身存在歧义，应该把问题带回用户，修订并重新确认框架，而不是看到实际输出后偷偷改 expected。记录理由是为了让审阅者知道预期的规则来源，不赋予一段叙述额外的批准权限。

We **state = access(core.status(context=`context`),"value")**.
We **item = unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
1. access(`state`,"phase") != "refine" or json.get(value=`context`,key="role") != "test" or not json.get(value=`item`,key="specification") or `rationale` == ""
  Return *result.error(code="root.test_scope",message="只有受限测试者可以冻结公开规格的案例",operation="submit")*.
1. json.get(value=`item`,key="tests")
  Return *result.error(code="root.tests_frozen",message="同一公开规格的测试已经冻结，不能改写预期",operation="submit")*.
We **specification = access(`item`,"specification")**.
We **suite = suite_value(state=`state`,item=`item`,cases=`cases`,rationale=`rationale`)**.
1. json.get(value=`item`,key="mode") == "research" or json.get(value=`item`,key="mode") == "document"
  We **suite = table.put(in=`suite`,at="kind",value="document")**.
  We **suite = table.put(in=`suite`,at="rules",value=`cases`)**.
  We **suite = table.put(in=`suite`,at="cases",value=table.empty_list())**.
We **stored = io.native(context=`context`,operation="runtime_suite",payload=table.put(in=None,at="suite",value=`suite`))**.
1. not access(`stored`,"ok")
  Return *stored*.
We **item = table.put(in=`item`,at="tests",value=access(`stored`,"value"))**.
We **saved = save_unit(context=`context`,item=`item`)**.
1. not access(`saved`,"ok")
  Return *saved*.
Return *result.ok(value=access(`item`,"tests"))*.

## cases

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前版本冻结案例的 Result |

Use `context`。

实现作者不能决定验收预期。调用者在宿主内部读取测试者已冻结的案例，用元数据摘要校验冻结原生值；读取失败、规格不匹配或源文件被改动都应停止。返回值只给可信执行器，不加入实现模型的上下文。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **state = access(core.status(context=`context`),"value")**.
We **item = unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
We **tests = json.get(value=`item`,key="tests")**.
1. not `tests` or access(`tests`,"outline_sha256") != access(`state`,"outline_sha256") or access(`tests`,"spec_sha256") != access(access(`item`,"specification"),"sha256")
  Return *result.error(code="root.tests_missing",message="先冻结当前规格的独立测试",operation="cases")*.
Return *io.native(context=`context`,operation="runtime_suite_verify",payload=table.put(in=None,at="tests",value=`tests`))*.

## ready

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| item | map | required | 当前单元记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 源码与独立测试证据是否仍然有效 |

Use `context`, `item`。

试运行摘要必须与当前单元源码摘要相同，不能把别的版本的通过结果归到当前文件。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

就绪还核对正文材料摘要；源码未变而正文被替换，同样不能使用旧测试。文章的引用检查属于本次运行版本，最终人工审阅不能跳过这些版本核验。

就绪必须同时满足源码摘要、真实案例结果、独立测试版本和规格绑定。一个 ready 字段不能替代这些事实。刷新、继续或另一个模型不能把被改动的程序或测试冒充旧版本。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

就绪检查读取当前主文稿里的那个函数段。并行作者修改其他段不改变本段摘要，也不会让已经通过的案例重新消耗模型请求。只有自己的实际函数、共享导入、正文依据或独立规则发生变化，才失去已有证据。状态中的 fragment 是缓存，不能覆盖真实文件的观察。


核验只读取实际文件，不执行其他函数，也不将其他作者的上下文交给测试者。当前实现缺失或无法定位时明确保留未就绪。


来源规则升级会使旧的文档来源证明失效。重新验证仍使用已冻结契约，不把空快照伪装为重新读取成功，也不影响无需外部来源的固定值函数。

1. not `item`
  Return *False*.
We **trial = json.get(value=`item`,key="trial")**.
We **tests = json.get(value=`item`,key="tests")**.
1. not core.evidence_current(tests=`tests`,trial=`trial`)
  Return *False*.

1. not `tests` or not `trial` or json.get(value=`item`,key="status") != "ready" or not access(`trial`,"passed") or json.get(value=`trial`,key="sha256") != json.get(value=`item`,key="sha256") or json.get(value=`trial`,key="suite_sha256") != access(`tests`,"sha256")
  Return *False*.
1. json.get(value=`item`,key="function")
  We **section = workbook.read(context=`context`)**.
  1. not access(`section`,"ok") or access(access(`section`,"value"),"sha256") != access(`item`,"sha256")
    Return *False*.
2. else
  1. not fs.exists(path=access(`item`,"path")) or hash.sha256(text=fs.read_text(path=access(`item`,"path"))) != access(`item`,"sha256")
    Return *False*.
We **artifact = json.get(value=`item`,key="artifact")**.
1. `artifact`
  1. not fs.exists(path=access(`artifact`,"path")) or hash.sha256(text=fs.read_text(path=access(`artifact`,"path"))) != access(`artifact`,"sha256")
    Return *False*.
We **read = cases(context=`context`)**.
Return *access(`read`,"ok")*.

## specification_source

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| item | map | required | 公开业务单元 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 没有执行语句的公开意图文稿 |

Use `item`。

从已确认的本单元职责组成规格，不读取作者源码。参数 input 是公开的业务记录，返回 result 按任务要求解释；这些接口名是测试所需信息，不代表暴露内部变量或条件分支。文稿文字即使包含 Markdown 标记也先转义，随后还要通过官方解析器验证没有执行语句。测试者看到的是规则而非现有实现，不能据代码生成预期。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **return_type = json.get(value=`item`,key="return_type")**.
1. not `return_type`
  We **return_type = "any"**.
Return *"## unit_" + access(`item`,"id") + "\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| input | any | 包含 request 和 dependencies 的业务输入记录 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | " + `return_type` + " | 根据下述公开业务规则观察返回 |\n\n本次只测试与实现当前这一个函数，不能把其他单元的预期混入它的案例。\n\n单元职责：" + core.prose(content=access(`item`,"purpose")) + "。\n\n业务验收：根据上面的当前单元职责，对不同输入观察该函数自己的返回。\n\n本规格不含实现和实际控制流，测试依据公开规则独立形成，不能从现有程序抄取结果。\n"*.

## suite_value

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 已确认根状态 |
| item | map | required | 包含冻结规格的单元 |
| cases | any | required | 独立案例列表或已声明的文档契约 |
| rationale | text | required | 预期结果的规则依据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 带规格与框架身份的原生测试值 |

Use `state`, `item`, `cases`, `rationale`。

把独立案例与规格、框架身份绑定。source digest 描述规则版本，outline digest 描述用户批准的边界；两者共同防止同名函数更新后沿用旧测试。这个纯函数不读取实现，不执行函数取得预期，不写任何文件；冻结与持久化由调用者单独完成。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **specification = access(`item`,"specification")**.
We **suite = table.put(in=None,at="unit_id",value=access(`item`,"id"))**.
We **suite = table.put(in=`suite`,at="spec_sha256",value=access(`specification`,"sha256"))**.
We **suite = table.put(in=`suite`,at="outline_sha256",value=access(`state`,"outline_sha256"))**.
We **suite = table.put(in=`suite`,at="cases",value=`cases`)**.
We **suite = table.put(in=`suite`,at="rationale",value=`rationale`)**.
Return *suite*.

## save_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前单元身份 |
| item | map | required | 只属于自己单元的新记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 重新读取并归并后的状态 |

Use `context`, `item`。

并行提交可能发生版本冲突。每次重试重新读取整个最新状态，只替换当前单元，不能把旧状态原样重放。文件已经冻结后也不能让模型重新生成测试，归并重试属于确定性的状态操作，不需要额外模型上下文。最多六次，其他错误立即原样返回。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **attempts = table.range(start=1,end=7)**.
- [在最新状态上重新归并](for attempts as attempt)
  We **saved = merge_once(context=`context`,item=`item`)**.
  1. access(`saved`,"ok")
    Return *saved*.
  1. not text.contains(text=json.stringify(value=`saved`),sub="root_skill.conflict")
    Return *saved*.
Return *saved*.

## fixed

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前受限测试角色 |
| rationale | text | required | 公开规则与案例依据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 固定正文契约的冻结测试 Result |

Use `context`, `rationale`。

固定正文的完整规则已经由用户确认，无需让模型重新猜测显示用的引号是否属于返回。这里读取的原文来自框架职责中的显式契约，尚未读取或运行作者实现。用空输入和一个不同输入分别验证同一返回，可以发现作者增加包装、误读输入或改动正文等错误。两条案例的预期保持原生字符串，任何实际引号与换行都不会被删改。

模板只复用公开规则，完全没有读取作者程序的步骤，所以错误实现仍会面对同一份独立预期。测试通过不能改变原始契约的内容。

这种确定性模板只适用于固定返回，不能把业务计算或动态输入推断为常量，也不能从试运行结果复制预期。没有明确原文时失败，要求重新审阅规格。测试角色仍须实际调用，说明验收规则的来源；之后才能开始实现。submit 使用相同的角色、阶段、规格摘要和冻结检查，原生边界仍复核测试权限，不因为使用模板就给作者修改案例的入口。

执行此函数只产生测试证据，尚未证明任何实现通过。实际单元编译、不同输入的运行、原生值比较与源码摘要绑定都在后续可信执行器完成，失败就保持未完成。用户改变原文时必须返回框架重新确认，不用已有测试为新正文背书。

We **state = access(core.status(context=`context`),"value")**.
We **item = unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
We **constant = json.get(value=`item`,key="constant_text")**.
1. json.get(value=`item`,key="mode") != "text" or `constant` == None
  Return *result.error(code="root.fixed_contract_missing",message="固定正文原文未明确，请重新审阅框架",operation="fixed")*.
We **first = table.put(in=table.put(in=None,at="input",value=None),at="expected",value=`constant`)**.
We **second = table.put(in=table.put(in=None,at="input",value="独立测试的不同输入"),at="expected",value=`constant`)**.
We **cases = table.append(list=table.append(list=table.empty_list(),item=`first`),item=`second`)**.
Return *submit(context=`context`,cases=`cases`,rationale=`rationale`)*.

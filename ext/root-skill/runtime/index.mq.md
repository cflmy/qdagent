---
markup: occlusion
title: 根状态机的真实执行入口
import:
  workbook: workbook.mq.md
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
  turn: turn.mq.md
  author: ../authoring.mq.md
  subtask: lib/subtask.mq.md
---

根状态机的真实执行入口。宿主只启动本函数并转发事件，不定义阶段或业务工具。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实等待、未完成或完成状态 |

Use `context`。

每次从持久状态恢复。意图、框架和最终审阅都需要真实用户输入；细化由本文件调用独立子文稿，整合由公开阶段函数完成。没有模型工具目录或 JSON 动作路由。模型输出必须是能被官方编译器绑定的 Marqdo 调用，实际执行后才检查下一步。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

新运行不会从模型的一句总结推断已经到达哪一步。等待问题或审阅时直接恢复已有状态，不发起额外模型请求；只有当前阶段确实缺少程序结果时才进入角色调用。并行结束也要重新读取所有摘要，不使用子进程结束时间或聊天中的完成承诺。

用户取消后保留已写文稿和诊断，新的继续请求恢复同一个阶段。已有实现通过的单元可以复用，但框架、测试或源码变动会使旧证据失效。整合不能覆盖这些边界；模型没有产生有效调用时仅记录未完成。

入口先检查插件可用性，再读取当前阶段。已有待答问题会直接返回等待消息，不多发一次模型请求；细化阶段才进入受限并行程序，聚合有效后再交给交付角色。完整验收由真实用户入口保存，模型没有调用这个入口的权限，因此一次供应商响应不可能同时完成澄清、确认和验收。

角色失败与传输失败都保留未完成状态。继续会恢复同一个任务的事实，而不是从一段自然语言总结重建流程。界面上的阶段、源码预览和执行经过均从真实记录派生，任何一种展示都不能代替其他证据。

入口返回等待时不会启动后台猜测任务；下一次推进必须来自新的真实运行请求。

交付角色的接口还取决于用户确认的产物范围。普通工程只开放 finish，不提供重建单元或无关数据构造函数；明确要求办公文件时才读取对应文稿，调用真实插件后仍须完成统一整合。此选择由根状态中的已确认契约决定，模型不能通过给自己的函数调用增加一个 variant 参数改变它。

窄接口避免把已经完成的步骤重新当成待办，也限制上下文大小。它不代替测试或权限检查：每次实际调用仍核对阶段、角色、源码和冻结案例，文稿列出某项能力也不意味着当前插件一定处于启用状态。

We **permission = io.require(context=`context`,id="root-skill")**.
1. not access(`permission`,"ok")
  Return *io.outcome(answer="根文稿插件不可用，已有进度保留。",status="failed")*.
We **state = access(core.status(context=`context`),"value")**.
1. json.get(value=`state`,key="pending")
  Return *waiting(state=`state`)*.
We **phase = access(`state`,"phase")**.
1. `phase` == "refine"
  We **observed = parallel(context=`context`)**.
  1. not access(`observed`,"ok")
    Return *io.outcome(answer="单元尚未通过独立验证，已有文稿与诊断保留。请展开对应执行步骤查看具体问题。",status="incomplete")*.
  We **state = access(core.status(context=`context`),"value")**.
  We **phase = access(`state`,"phase")**.
We **role = `phase`**.
1. `phase` == "implement"
  We **role = "deliver"**.
1. `phase` == "complete"
  Return *io.outcome(answer="当前交付已经由用户验收。",status="succeeded")*.
We **own = table.put(in=`context`,at="role",value=`role`)**.
1. `role` == "deliver" and (json.get(value=`state`,key="artifact_kind") == "docx" or json.get(value=`state`,key="artifact_kind") == "pptx")
  We **own = table.put(in=`own`,at="variant",value="office")**.
We **acted = turn.run(context=`own`)**.
We **state = access(core.status(context=`context`),"value")**.
1. json.get(value=`state`,key="pending")
  Return *waiting(state=`state`)*.
Return *io.outcome(answer="当前阶段仍未完成，不能跳过所需程序或用户确认。请查看对应步骤的实际诊断。",status="incomplete")*.

## parallel

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际子任务执行与聚合验证结果 |

Use `context`。

Development proceeds in at most eight material waves because the approved framework contains at most eight units. Runtime data dependencies do not serialize ordinary function authors; only genuine material requirements delay research and document authors. Unrelated ready jobs still run concurrently under the user's limit. A failed research job blocks its downstream writer; it does not trigger a speculative article. The attempted set prevents repeated model spending on the same failed unit during one root invocation. A later explicit continuation can retry while preserving successful independent units.

父文稿先为每个单元冻结无执行语义的公开规格，再用标准库 subtask.run_many 按用户配置并行执行子文稿。作业文件只含可信调用与任务上下文，不放模型凭据。所有子进程继承取消范围；返回时重新核对每个单元的源码和独立测试摘要，不能仅凭零退出前进。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

作业列表是父程序生成的可信文稿路径，不包含模型写出的进程参数。每份作业恢复同一个运行身份和自己的单元，使用单独角色会话。标准库负责启动数量与等待期限；用户设置的上限只控制同时运行多少个单元，不让一个子任务读取另一个子任务的上下文。

等待结束后重新聚合公开规格、源码摘要与冻结案例。退出码为零而没有有效试运行证据时仍然失败，部分成功不能推进整合。恢复会跳过仍然有效的单元，避免重复调用模型与覆盖已经确认的成果。父程序不会为了给动画一个结束状态而改写失败结果。

每次聚合都会重读当前版本，因此恢复期间产生的新事实也必须满足同一套验收要求。

We **state = access(core.status(context=`context`),"value")**.
We **attempted = table.empty_list()**.
We **waves = table.range(start=0,end=8)**.
We **ran = table.empty_list()**.
We **_ = io.event(context=`context`,kind="parallel_start",data=table.put(in=None,at="count",value=table.len(xs=access(`state`,"units"))))**.
- [按依赖就绪情况执行有界的并行波次](for waves as wave)
  We **jobs = jobs(context=`context`,attempted=`attempted`)**.
  1. not access(`jobs`,"ok")
    Return *jobs*.
  We **jobs = access(`jobs`,"value")**.
  1. table.len(xs=`jobs`) > 0
    We **batch = table.empty_list()**.
    - [本次运行中同一单元最多启动一次](for jobs as job)
      We **attempted = table.append(list=`attempted`,item=access(`job`,"id"))**.
      We **batch = table.append(list=`batch`,item=table.put(in=None,at="path",value=access(`job`,"path")))**.
    We **observed = subtask.run_many(tasks=`batch`,limit=access(access(`state`,"settings"),"concurrency"),timeout_ms=900000)**.
    We **ran = table.append(list=`ran`,item=`observed`)**.
We **aggregated = author.refine(context=`context`)**.
1. access(`aggregated`,"ok") and access(access(`aggregated`,"value"),"phase") == "implement"
  We **_ = io.event(context=`context`,kind="parallel_end",data=table.put(in=None,at="status",value="succeeded"))**.
  Return *result.ok(value=True)*.
We **_ = io.event(context=`context`,kind="parallel_end",data=table.put(in=None,at="status",value="failed"))**.
Return *result.error(code="root.children_incomplete",message=json.stringify(value=`ran`),operation="parallel")*.

## waiting

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 实际待用户回应的状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 文稿生成的等待消息 |

Use `state`。

前端的选择、确认和验收卡片来自同一份状态。这里的文字说明已经保存的真实问题或实际文件，不创建新的批准，不猜测模型想表达什么。宿主只转发返回，不在 Python 中维护另一套消息和阶段判断。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

历史文稿仍保留原始内容与来源，新流程不会删除它们；缺少独立案例时只说明需要重新验证，不把旧作者自检换一个名字继续宣称通过。用户可以阅读后选择返工，明确重新批准的边界。

We **pending = access(`state`,"pending")**.
1. access(`pending`,"kind") == "intent"
  Return *io.outcome(answer=("我对目标的理解是：" + access(`pending`,"summary") + "\n\n" + access(`pending`,"question") + "\n\n请在下方选择或补充，可以多轮澄清。"),status="waiting_user")*.
1. access(`pending`,"kind") == "outline"
  Return *io.outcome(answer="基本方案已写入 solution/plan.mq.md，请在右侧阅读实际框架，确认职责、验收、子模型和并发数后再继续。",status="waiting_user")*.
1. not core.independent_review(state=`state`)
  Return *io.outcome(answer="这份历史交付缺少当前独立测试证据。文稿仍可阅读，请选择返工，重新确认框架并完成独立验证后验收。",status="waiting_user")*.
Return *io.outcome(answer="完整方案已写入 solution/index.mq.md。独立测试和整合验证已经实际执行，请阅读来源、实现和限制，再决定验收或返工。",status="waiting_user")*.

## jobs

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| attempted | any | None | 本次根运行已启动过的单元身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 需要运行的子文稿列表 |

Use `context`, `attempted`=None。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

每次只创建当前依赖已经就绪且尚未尝试的作业；依赖不满足时保留等待，不把缺失材料替换为空数据。

先准备无执行语义规格，再检查每个现有实现是否仍通过独立验证。已经有效的单元不会重复调用模型；失效单元只创建自己的作业，其他单元和用户确认保持不变。作业列表是普通原生值，交给标准子任务库运行，不是模型动作 JSON 或另一套业务调度语言。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

每个作业绑定主文稿中的一个函数段，独立快照只用于受限试运行。父任务不会把职责拆成新的完整工程，也不会允许两个作者各自覆盖整份主方案。


We **bound = workbook.ensure(context=`context`)**.
1. not access(`bound`,"ok")
  Return *bound*.
We **state = access(`bound`,"value")**.
We **units = access(`state`,"units")**.
We **jobs = table.empty_list()**.
We **_ = fs.make_dirs(path=".agent/root-jobs")**.
- [为每个业务单元建立独立调用现场](for units as item)
  We **eligible = dependencies_ready(context=`context`,state=`state`,item=`item`)**.
  1. `attempted` and table.contains(list=`attempted`,item=access(`item`,"id"))
    We **eligible = False**.
  1. `eligible`
    We **own = table.put(in=`context`,at="unit_id",value=access(`item`,"id"))**.
    We **prepared = proof.prepare(context=`own`)**.
    1. not access(`prepared`,"ok")
      Return *prepared*.
    We **fresh = proof.unit(state=access(core.status(context=`context`),"value"),unit_id=access(`item`,"id"))**.
    1. not proof.ready(context=`own`,item=`fresh`)
      We **path = job(context=`own`)**.
      We **jobs = table.append(list=`jobs`,item=table.put(in=table.put(in=None,at="path",value=`path`),at="id",value=access(`item`,"id")))**.
Return *result.ok(value=`jobs`)*.

## job

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前单元的可信作业文件路径 |

Use `context`。

作业文件是普通 Marqdo 程序，只恢复身份、工作根和单元身份，再调用同一份 child 文稿。密钥不进入源码。JSON 在这里仅用于可信进程间原生值的安全传输，不承载模型动作或选择函数的路由。字符串中的反引号编码成字面字符，避免任务材料在生成代码时提前插值。实际启动仍由标准库管理进程，作业源码本身不能证明子任务完成。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **path = ".agent/root-jobs/" + access(`context`,"unit_id") + ".mq.md"**.
We **literal = text.replace(text=json.stringify(value=json.stringify(value=`context`)),old="\x60",new="\\x60")**.
We **source = "---\nmarkup: occlusion\nimport:\n  child: " + access(`context`,"project") + "/ext/root-skill/runtime/child.mq.md\n  json: lib/json.mq.md\n---\n\n## main\n\n此作业只恢复自己的可信上下文并执行一个独立单元。模型凭据不在源文件中；阶段与角色仍由所调用的文稿定义。源码不能代替真实调用证据。\n\nWe **context = json.parse(text=" + `literal` + ")**.\nReturn *[执行自己的测试与实现](child.run(context=\x60context\x60))*.\n"**.
We **_ = fs.atomic_write(path=`path`,text=`source`)**.
Return *path*.

## dependencies_ready

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信根现场 |
| state | map | required | 刚读取的实际状态 |
| item | map | required | 本单元 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | dependencies_ready 的真实结果，失败保留诊断 |

Use `context`, `state`, `item`。

运行依赖不等于开发顺序。普通代码、取值和固定正文函数可以依据各自公开输入返回契约并行填写，实际 run 仍按确认的依赖传值。只有研究与文章等必须取得实际资料的职责等待前置材料：研究和报告不是两个同时猜测材料的作者：研究失败时，依赖它的报告保持等待，不消耗模型请求，也不编造缺失资料。无依赖的职责仍可并行，所有依赖关系来自用户批准的框架，不能临时扩大。恢复后重新核对前置源码、正文与独立测试摘要；一个旧 ready 标签不能授权交接。失败职责在本次根运行不会无限重试，新的继续请求才开始新的有界尝试。

We **mode = json.get(value=`item`,key="mode")**.
1. `mode` != "research" and `mode` != "document"
  Return *True*.
We **dependencies = json.get(value=`item`,key="depends_on")**.
- [每个前置单元必须仍有有效证据](for dependencies as dependency)
  We **prior = proof.unit(state=`state`,unit_id=`dependency`)**.
  We **own = table.put(in=`context`,at="unit_id",value=`dependency`)**.
  1. not proof.ready(context=`own`,item=`prior`)
    Return *False*.
Return *True*.

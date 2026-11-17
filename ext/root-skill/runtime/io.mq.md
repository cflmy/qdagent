---
markup: occlusion
title: 系统边界与 Marqdo 调用现场
import:
  routing: ../routing.mq.md
  core: ../state.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  plugin: lib/plugin.mq.md
  call: ../../../pages/control/call.mq.md
---

系统边界与 Marqdo 调用现场。阶段和提示属于文稿，ABI 只提供官方解析、隔离进程、模型传输和事件。

## native

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| operation | text | required | 固定系统边界操作 |
| payload | map | None | 系统参数，始终作为数据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原生 Result，错误不被改写 |

Use `context`, `operation`, `payload`=None。

插件只加载本仓库安装的动态库。源码根由宿主环境给出，不允许模型提供。模型输出只会进入经过官方解析器校验的调用文稿，不能直接调用这个内部边界。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **_ = plugin.load(path=(sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so"))**.
We **request = table.put(in=`payload`,at="operation",value=`operation`)**.
Return *qdagent_transport(request=table.put(in=`request`,at="context",value=`context`))*.

## current

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前进程的可信角色上下文 |

调用文稿没有 context 参数。它不能通过传参选择身份、角色或另一个工作根；这个值由执行进程从私有文件恢复，文件位置由宿主设置，文件里不放模型密钥。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **raw = native(context=table.empty_map(),operation="runtime_context")**.
Return *access(`raw`,"value")*.

## event

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| kind | text | required | 前端事件身份 |
| data | map | required | 实际事件内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 持久化后的事件结果 |

Use `context`, `kind`, `data`。

事件描述已经发生的模型请求、函数调用和子任务，不凭模型文字制造成功。多个子进程共用有锁的追加日志，Python 仅转发这些事件，Go 持久化并向页面发送。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

Return *native(context=`context`,operation="runtime_event",payload=table.put(in=table.put(in=None,at="kind",value=`kind`),at="data",value=`data`))*.

## unfence

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| source | any | required | 模型返回的文稿或绑定的 Marqdo 代码块 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 不含展示围栏的真实源文本 |

Use `source`。

模型可能给文稿套展示围栏。这里仅去掉完整外层围栏，不解释正文里的调用、参数或业务分支；实际语法随后交官方解析器判断。绑定的代码块先转成原始展示形式，内部换行与标记保留。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **plain = text.str_trim(s=str(`source`))**.
1. text.starts_with(text=`plain`,prefix="\x60\x60\x60") and text.ends_with(text=`plain`,suffix="\x60\x60\x60")
  We **lines = text.str_split(s=`plain`,sep="\n")**.
  Return *text.str_join(xs=table.slice(list=`lines`,start=1,end=(table.len(xs=`lines`) - 1)),sep="\n")*.
Return *plain*.

## execute

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| api | text | required | 本阶段公开文稿的绝对路径 |
| body | text | required | 模型返回的 Marqdo 调用正文 |
| step | number | required | 当前阶段的真实轮次 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际函数返回或官方解析诊断 |

Use `context`, `api`, `body`, `step`。

调用正文只允许读取自己定义的值并调用提供文稿中的函数。不得新增导入、函数、分支、循环或宿主调用，阶段控制属于根文稿。执行文件与角色工作根分离，标准输入只传空参数，身份由独立私有文件提供。候选保留真实源码与摘要，实际 CLI 目标是 act，函数内部由 Marqdo 正常绑定其他函数。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **source = "---\nmarkup: occlusion\nimport:\n  api: " + `api` + "\n---\n\n## act\n\n本次调用由根文稿提供有限接口，模型只填写本阶段的业务参数。身份、权限和下一步来自真实调用现场，结果必须通过后续程序验证。\n\n" + unfence(source=`body`) + "\n"**.
We **args = table.put(in=None,at="api",value=`api`)**.
We **args = table.put(in=`args`,at="source",value=`source`)**.
We **checked = preflight(context=`context`,args=`args`,step=`step`)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **args = table.put(in=`args`,at="api_sha256",value=access(access(`checked`,"value"),"api_sha256"))**.
Return *native(context=`context`,operation="runtime_execute",payload=table.put(in=`args`,at="step",value=`step`))*.


## require

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| id | text | required | 已安装插件身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前主体的真实授权 |

Use `context`, `id`。

插件安装与当前允许使用是两个事实。真实调用前读取持久化开关，根插件或模型插件停用时停止运行；页面仍能打开设置和停止任务。检查结果不自动注册任何业务工具。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **args = table.put(in=None,at="principal",value=access(`context`,"owner"))**.
Return *call.invoke(file=(access(`context`,"project") + "/pages/control/plugins.mq.md"),function="require",arguments=table.put(in=`args`,at="id",value=`id`),root=access(`context`,"project"),effects="plugin,fs.read,fs.write,environment.read")*.

## model_once

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| messages | list | required | 由 Marqdo 文稿生成的消息包 |
| sources | list | required | 所有指令来源文稿 |
| model_id | text | "inherit" | 宿主已经授权的模型身份 |
| step | number | required | 本阶段轮次 |
| attempt | number | 1 | 当前模型请求的实际尝试次数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 模型真实返回的 Marqdo 源文本 |

Use `context`, `messages`, `sources`, `model_id`="inherit", `step`, `attempt`=1。

网络层原样发送这里的消息，不附加工具 Schema、角色说明或修复指令。上下文按调用现场组织；每个指令来源保存源码摘要，实际发送的上下文包单独记录，便于用户查看模型究竟知道什么。模型密钥只在 ABI 的私有传输中解析，不进入文稿和消息。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

同一业务轮次可以有两次网络尝试，attempt 仅标记传输事实，不改变角色、接口、模型身份或权限。每次尝试保存单独的来源和请求审计，失败不会覆盖前一次记录，也不把已经返回过的半段文字当成可执行结果。只有完整模型返回才交后续校验。

We **permission = require(context=`context`,id="ai")**.
1. not access(`permission`,"ok")
  Return *permission*.
We **permission = require(context=`context`,id="root-skill")**.
1. not access(`permission`,"ok")
  Return *permission*.
We **args = table.put(in=None,at="messages",value=`messages`)**.
We **args = table.put(in=`args`,at="sources",value=`sources`)**.
We **args = table.put(in=`args`,at="model_id",value=`model_id`)**.
We **args = table.put(in=`args`,at="step",value=`step`)**.
We **args = table.put(in=`args`,at="attempt",value=`attempt`)**.
We **args = table.put(in=`args`,at="max_context_bytes",value=65536)**.
Return *native(context=`context`,operation="runtime_model",payload=table.put(in=`args`,at="title",value=("执行文稿 · " + access(`context`,"role"))))*.

## api_path

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 由当前角色确定的已安装公开文稿位置 |

Use `context`。

来源不足的现场提供搜索、浏览和授权材料识别，不能凭一次未授权的发表调用提前写文章。搜索摘要和 OCR 结果都不会冒充已浏览的网页。切换只是根文稿依据事实缩小或恢复已批准能力，不新增权限。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

研究与文档模式只选择已安装的专用文稿，不增加模型动作表。公开签名、可读说明和实际调用仍指向同一文件。

角色由根状态机设置，模型不能把它作为自己的调用参数。测试角色只有提交独立案例的接口，编写角色没有修改测试或用户确认的接口，交付角色也不能重新批准框架。这里仅形成文稿位置，实际调用仍由编译器绑定。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

实现者的实际文稿通过根路由函数取得，与已确认待办所显示的位置相同。研究现场来源不足时收窄为浏览文稿，获得有效材料后才恢复写作；这个临时收窄不会改变原意图或授权其他职责。精确正文始终使用单独的窄文稿，测试者始终取得独立测试入口。模型无权通过自己的输出更换这些路由。

文稿路由的结果属于当前调用现场，不是模型提交的目标地址。前端可以据此展示分工，但不能据此扩大效果或调用尚未授权的模块。
基本方案也可以使用根任务分配的窄入口。它仅接受本轮业务内容，不要求模型重复传意图身份、模式或路径；当前身份来自真实已确认清单。全部职责保存并满足数量后再切换为发表文稿，不能让一个实现角色通过请求同名函数重新得到规划权限。

调用现场中的分配结果随私有角色文件传递，不放进用户可编辑的业务文稿作为授权。读取同一份手册不等于获得另一个任务的身份，换模型也不会重新计算更宽的权限。实际调用与源码检查继续由原来的官方解析和受限执行边界完成。

We **name = access(`context`,"role")**.
1. `name` == "outline" and json.get(value=`context`,key="variant") == "intent-slot"
  Return *(access(`context`,"project") + "/ext/root-skill/calls/outline-slot.mq.md")*.
1. `name` == "implement" and json.get(value=`context`,key="scene") != "browse"
  We **mode = json.get(value=`context`,key="variant")**.
  1. not `mode`
    We **mode = "code"**.
  We **route = routing.resolve(mode=`mode`)**.
  1. access(`route`,"ok")
    Return *(access(`context`,"project") + "/" + access(access(`route`,"value"),"document"))*.

1. `name` == "test" and json.get(value=`context`,key="variant") == "text"
  We **name = `name` + "-text"**.
1. `name` == "test" and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
  We **name = `name` + "-document"**.
1. access(`context`,"role") == "implement" and json.get(value=`context`,key="scene") == "browse"
  We **name = "implement-browse"**.
1. `name` == "deliver" and json.get(value=`context`,key="variant") == "office"
  We **name = "deliver-office"**.
1. `name` == "outline" and json.get(value=`context`,key="variant") == "publish"
  We **name = "outline-publish"**.
Return *(access(`context`,"project") + "/ext/root-skill/calls/" + `name` + ".mq.md")*.

## outcome

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| answer | text | required | 可读说明，由文稿生成 |
| status | text | required | 真实运行状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 返回给宿主的终态事件 |

Use `answer`, `status`。

宿主只转发此返回，不根据模型文本猜测完成。等待用户、验证未通过和最终完成保持不同状态；旧的退出码或一个正常返回值不能代替用户验收。消息仍来自本次真实程序结果。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

`value` =

| answer | status |
|---|---|
| `answer` | `status` |

Return *value*.


## call_identity

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 宿主给出的角色与函数段 |
| step | number | 当前模型轮次 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 校验与执行共用的真实调用身份 |

Use `context`, `step`。

同一段测试与实现可以各有第一轮，不能仅用轮次把它们合成一条事件。调用身份同时包含函数段、角色与轮次，父任务的身份由固定名称表示。子任务保留自己的分组身份，call_id 则精确定位到这一次调用，前端可以把校验、参数、执行和恢复放在同一处阅读。

身份不是模型参数，也不包含认证凭据。模型不能换一个身份获得另一个角色的文件，校验事件只说明已经开始检查，不能代替实际执行与退出证据。这里不生成工具名、不选择 SKILL，不推断调用已经成功。网页断线后按持久化事件恢复，同一身份的各个实际阶段仍能对应起来。

例如，同一函数段的独立测试第一轮和实现第一轮会得到不同的调用身份，模型请求另以尝试次数区分。页面刷新只重放已有事件，不能生成新的调用；用户手动收起详情也不会改变后台的执行顺序。身份用于关联审计，而不是授予读写范围。

We **unit = json.get(value=`context`,key="unit_id")**.
1. not `unit`
  We **unit = "root"**.
We **id = `unit` + "-" + access(`context`,"role") + "-" + json.stringify(value=`step`)**.
We **data = table.put(in=None,at="id",value=`id`)**.
1. json.get(value=`context`,key="unit_id")
  We **data = table.put(in=`data`,at="id",value=`unit`)**.
We **data = table.put(in=`data`,at="call_id",value=`id`)**.
We **data = table.put(in=`data`,at="role",value=access(`context`,"role"))**.
Return *table.put(in=`data`,at="step",value=`step`)*.

## preflight

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 当前可信调用现场 |
| args | map | 实际 API 文稿与待执行源码 |
| step | number | 当前轮次 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 官方解析和外部参数绑定结果，失败时不启动工具 |

Use `context`, `args`, `step`。

先检查整份调用文稿，再开始任何实际操作。函数、参数和类型来自当前文稿的官方解析结果，外部参数绑定器核对未知名称、重复名称、必填项和已知值类型，不另建 JSON 工具 Schema。声明的默认值不在预检时执行，嵌套工具也不会被提前调用，避免为了检查参数产生一次真实副作用。

有些参数来自另一次函数返回，预检只能确认它的调用范围与参数结构，不能假装已经取得实际返回。事件明确记录这种运行时才能确定的值；真正执行时仍由 Marqdo 按实际契约复核。静态检查通过不表示业务成功，源码、试运行与用户验收继续拥有各自门禁。

校验失败返回原始诊断并标明 validation_failed。模型可以依据错误修订同一职责，原调用不会进入执行阶段，用户也能看见失败发生在参数或语法检查。通过时保留接口源码摘要，执行前再次核对，不能校验一份文稿却执行另一版。安装包只读并不替代这项版本联系。

用户看到检查通过后仍应等待工具的实际返回。如果第二个调用的参数已经确定有误，即使第一个调用本来合法，也不会先执行第一个再报告错误。这能避免半份请求提前写入文件。对于调用结果才能决定的值，页面说明延迟复核，不能将结构检查包装成业务保证。

校验事件包括当前真实函数名和可静态确认的参数，用户可以直接对照文稿阅读。这里没有让模型选择另一个操作身份，也不会仅凭模型文字中的“检查通过”放行。失败候选保留在私有审计目录，便于定位；普通界面展示必要源码片段与诊断，不广播整份私有模型请求。

We **data = call_identity(context=`context`,step=`step`)**.
We **prefix = ""**.
1. json.get(value=`context`,key="unit_id")
  We **prefix = "child_"**.
We **_ = event(context=`context`,kind=(`prefix` + "call_check"),data=`data`)**.
We **checked = native(context=`context`,operation="runtime_validate",payload=table.put(in=`args`,at="step",value=`step`))**.
1. not access(`checked`,"ok")
  We **_ = event(context=`context`,kind=(`prefix` + "call_rejected"),data=table.put(in=table.put(in=`data`,at="source",value=access(`args`,"source")),at="result",value=`checked`))**.
  Return *table.put(in=`checked`,at="validation_failed",value=True)*.
We **_ = event(context=`context`,kind=(`prefix` + "call_checked"),data=table.put(in=table.put(in=`data`,at="status",value="succeeded"),at="validation",value=access(`checked`,"value")))**.
Return *checked*.


## model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信调用现场 |
| messages | list | required | 文稿生成的本轮消息 |
| sources | list | required | 实际指令来源 |
| model_id | text | "inherit" | 已由宿主授权的模型 |
| step | number | required | 当前业务轮次 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 完整模型返回，或保留真实错误 |

Use `context`, `messages`, `sources`, `model_id`="inherit", `step`。

仅对暂时的模型网络错误做至多两次请求，间隔半秒，不重放工具。模型生成发生在源码检查与实际执行之前，因此这次重试不会重新写文件、再次提交 OCR 或重复调用外部业务。需要修改参数、语法或实现的错误仍交给当前角色依据诊断修订，不靠网络重试掩盖。

鉴权失败、未知模型、来源缺失和上下文超预算不会通过换凭据、切模型或解除限制重试。暂时失败只包括已报告的限流、网关、超时和连接错误；两次之后仍失败就保留错误，等待明确继续。实际模型身份和原消息保持一致，用户配置不会被悄悄替换。

重试事件对用户可见，包含原轮次、尝试次数与真实原因。新尝试拥有独立模型事件身份和审计文件，之前的半段输出仍可核对，但不会拼入新候选源码。取消仍由宿主进程组传播，等待是有上限的系统 I/O，不会产生无限循环。请求成功也不证明调用文稿正确，后续官方参数检查、独立验证和人工验收继续执行。

We **attempts = table.range(start=1,end=3)**.
We **observed = None**.
- [只重试尚未产生业务副作用的暂时模型请求失败](for attempts as attempt)
  We **observed = model_once(context=`context`,messages=`messages`,sources=`sources`,model_id=`model_id`,step=`step`,attempt=`attempt`)**.
  1. access(`observed`,"ok")
    Return *observed*.
  We **data = table.put(in=call_identity(context=`context`,step=`step`),at="attempt",value=`attempt`)**.
  We **data = table.put(in=`data`,at="result",value=`observed`)**.
  We **prefix = ""**.
  1. json.get(value=`context`,key="unit_id")
    We **prefix = "child_"**.
  1. `attempt` == 2 or not retryable(observed=`observed`)
    We **_ = event(context=`context`,kind=(`prefix` + "provider_failure"),data=`data`)**.
    Return *observed*.
  We **_ = event(context=`context`,kind=(`prefix` + "model_retry"),data=`data`)**.
  We **_ = native(context=`context`,operation="runtime_pause",payload=table.put(in=None,at="milliseconds",value=500))**.
Return *observed*.

## retryable

| 参数 | 类型 | 说明 |
|---|---|---|
| observed | map | 真实的模型网络错误 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 是否属于可以有限重试的暂时传输失败 |

Use `observed`。

只读取错误消息中的明确网络事实，不分析业务需求，也不增加新的函数分派。限流、网关失败、超时和连接中断可能在稍后恢复，所以允许相同请求再试一次；普通程序错误和权限拒绝不会因为重试而变成合法调用。

判断结果不是成功，不改变模型身份、用户范围或消息。错误不属于这些已知类别时直接返回原错误，用户能看见真实原因。该判断只用于模型生成，不能套在任意有副作用的工具上，更不能重放已完成的文件写入或来源登记。

例如，服务返回五百零三时，相同模型请求可以在短暂停顿后重新发送；如果返回四百零一，则需要修正模型服务的授权配置，继续请求没有意义。这里只检查运输层已经报告的错误，不读取网页内容来选择权限，也不会把错误文本作为程序执行。连续两次失败后保持未完成，并保留每次尝试的独立输出与诊断。根流程不会因为某家服务暂时异常而切换到另一模型，用户看到的模型身份应始终与实际请求一致。

传输层也会提供中文事实诊断。域名解析失败、连接中断与读取超时可能是短暂波动，和已知的英文网络诊断遵循同一次数上限。本机服务未启动或明确拒绝连接时，用户应先恢复服务，原样重发没有帮助，因此中文的连接拒绝不属于暂时故障。安全连接与证书失败也不能靠放宽验证来修复。这个判断不把诊断文字交给系统命令，不自动重启宿主服务；服务恢复属于管理员操作，智能体仍只能在已有授权和剩余额度内发起请求。

We **message = json.stringify(value=`observed`)**.
Return *(text.contains(text=`message`,sub="HTTP 429") or text.contains(text=`message`,sub="HTTP 502") or text.contains(text=`message`,sub="HTTP 503") or text.contains(text=`message`,sub="HTTP 504") or text.contains(text=`message`,sub="timed out") or text.contains(text=`message`,sub="deadline exceeded") or text.contains(text=`message`,sub="connection") or text.contains(text=`message`,sub="Connection") or text.contains(text=`message`,sub="rate limit") or text.contains(text=`message`,sub="超时") or text.contains(text=`message`,sub="连接中断") or text.contains(text=`message`,sub="域名解析失败"))*.

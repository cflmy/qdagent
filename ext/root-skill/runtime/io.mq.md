---
markup: occlusion
title: 系统边界与 Marqdo 调用现场
import:
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

## model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| messages | list | required | 由 Marqdo 文稿生成的消息包 |
| sources | list | required | 所有指令来源文稿 |
| model_id | text | "inherit" | 宿主已经授权的模型身份 |
| step | number | required | 本阶段轮次 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 模型真实返回的 Marqdo 源文本 |

Use `context`, `messages`, `sources`, `model_id`="inherit", `step`。

网络层原样发送这里的消息，不附加工具 Schema、角色说明或修复指令。上下文按调用现场组织；每个指令来源保存源码摘要，实际发送的上下文包单独记录，便于用户查看模型究竟知道什么。模型密钥只在 ABI 的私有传输中解析，不进入文稿和消息。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

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

来源不足的现场只有浏览函数，不能凭一次未授权的发表调用提前写文章。切换只是根文稿依据事实缩小或恢复已批准能力，不新增权限。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

研究与文档模式只选择已安装的专用文稿，不增加模型动作表。公开签名、可读说明和实际调用仍指向同一文件。

角色由根状态机设置，模型不能把它作为自己的调用参数。测试角色只有提交独立案例的接口，编写角色没有修改测试或用户确认的接口，交付角色也不能重新批准框架。这里仅形成文稿位置，实际调用仍由编译器绑定。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **name = access(`context`,"role")**.
1. (`name` == "implement" or `name` == "test") and json.get(value=`context`,key="variant") == "text"
  We **name = `name` + "-text"**.
1. (`name` == "implement" or `name` == "test") and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
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

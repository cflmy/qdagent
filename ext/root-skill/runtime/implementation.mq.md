---
markup: occlusion
title: 单元实现与独立验证的可信组合
import:
  io: io.mq.md
  author: ../authoring.mq.md
  proof: ../proof.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  call: ../../../pages/control/call.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

单元实现与独立验证的可信组合。函数体由模型填写，测试权不交给实现者。

## write

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| mode | text | required | literal、select 或 code |
| value | any | required | 模板所需的原生值 |
| body | text | required | 实际函数体 |
| narrative | text | required | 业务说明 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 本单元有界诊断，不返回整个工程状态 |

Use `context`, `mode`, `value`, `body`, `narrative`。

文档失败还返回冻结的最小正文与来源要求、实际正文长度和引用检查结果；这些是修复所需的运行观测，不向作者授予修改契约的入口。

先检查当前角色和阶段，再发表合法单元并运行独立案例。返回只包含当前单元的源码路径、检查诊断和通过事实，不把其他单元、私有测试文稿、完整聊天或框架状态塞回模型上下文。需要修复时依据真实失败继续，不用自报预期来覆盖独立测试。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

作者函数成功只表示合法源码已经发表，独立案例失败仍必须返回失败 Result。必要观测可以提供给实现者修复，但只传失败输入、实际返回与对应预期，不返回完整测试文稿或其他角色对话。下一次发表会使旧源码摘要失效，必须对新代码重新验证。

作者模板只决定如何把业务内容组成合法函数，不能决定验收。实际发表成功后，确定性执行器立刻使用冻结案例运行该函数；观测结果与业务预期按原生类型比较，字符串和同名字段的 map 不会被当成相同返回。诊断中仅返回失败输入和相应实际值，帮助作者定位问题，其他单元的结果不随便附带。

如果新代码仍然失败，源码保留，单元保持不可整合。下一轮模型能够看到自己上一次调用及诊断，却拿不到修改案例的函数。这个安排同时支持调试与隔离：不隐藏必要失败事实，也不把产生验收规则的权限重新交回作者。

We **permit = flow.authorize(context=`context`,phase="refine",role="implement")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **written = author.author_unit(context=`context`,unit_id=access(`context`,"unit_id"),narrative=`narrative`,mode=`mode`,body=`body`,value=`value`)**.
1. not access(`written`,"ok")
  Return *written*.
We **observed = author.trial_unit(context=`context`,unit_id=access(`context`,"unit_id"))**.
1. not access(`observed`,"ok")
  Return *observed*.
We **item = proof.unit(state=access(`observed`,"value"),unit_id=access(`context`,"unit_id"))**.
We **trial = access(`item`,"trial")**.
We **diagnostic = table.put(in=None,at="status",value=access(`item`,"status"))**.
We **diagnostic = table.put(in=`diagnostic`,at="path",value=access(`item`,"path"))**.
We **diagnostic = table.put(in=`diagnostic`,at="passed",value=access(`trial`,"passed"))**.
We **failures = table.empty_list()**.
We **cases = access(`trial`,"cases")**.
- [仅提供修复所需的失败观测](for cases as test)
  1. not access(`test`,"passed")
    We **failures = table.append(list=`failures`,item=`test`)**.
We **diagnostic = table.put(in=`diagnostic`,at="failures",value=`failures`)**.
We **diagnostic = table.put(in=`diagnostic`,at="contract",value=json.get(value=`trial`,key="contract"))**.
1. not access(`trial`,"passed")
  Return *result.error(code="root.independent_test_failed",message=json.stringify(value=`diagnostic`),operation="publish")*.
Return *result.ok(value=`diagnostic`)*.

## publish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前单元 |
| mode | text | required | 明确的作者模板 |
| value | any | required | 原生模板参数 |
| body | text | required | 待验证的函数体 |
| narrative | text | required | 真实业务叙述 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 在任务根内实际创作与验证的结果 |

Use `context`, `mode`, `value`, `body`, `narrative`。

调用现场只给模型一个空的角色工作根。真实作者在固定源码入口与当前任务根内执行，模型不能自行传入路径、函数或效果；业务参数仍是原生 Marqdo 值。这个显式跨根调用保持文件隔离，不需要给调用文稿整个宿主文件系统权限。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **args = table.put(in=None,at="context",value=`context`)**.
We **args = table.put(in=`args`,at="mode",value=`mode`)**.
We **args = table.put(in=`args`,at="value",value=`value`)**.
We **args = table.put(in=`args`,at="body",value=`body`)**.
We **args = table.put(in=`args`,at="narrative",value=`narrative`)**.
Return *call.invoke(file=(access(`context`,"project") + "/ext/root-skill/runtime/implementation.mq.md"),function="write",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,environment.read")*.

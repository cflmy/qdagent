---
markup: occlusion
title: 一个受限单元的独立测试与实现
import:
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
---

一个受限单元的独立测试与实现。子智能体不能再派生子智能体，也不能选择其他单元。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 一个单元的真实结果 |

Use `context`。

测试角色先从公开意图冻结案例，再启动独立上下文的实现角色。两次模型请求不共享历史或工作根；测试角色没有查看实现的接口。实现者取得必要失败观测可以修复，但测试不随代码变化而改预期。不同业务单元由父文稿按用户并发配置同时运行。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

一个单元作为独立进程持有自己的调用现场，测试和实现分别形成消息包。开始事件只证明任务已经启动，结束事件依据实际函数结果填写，不能用动画代替执行。并发限制来自用户确认设置，具体模型由宿主验证身份后提供，文稿里只传模型身份，不传凭据。

失败时保留本单元源码、诊断和独立案例，父流程随后重新核对所有单元。其他单元的成功不会把本单元变成就绪，恢复时也不会用一个旧快照覆盖并行作者刚交回的成果。

每个子进程只负责一个已确认身份。模型选择先查单元覆盖项，再使用共同子模型配置；实际凭据由宿主按当前账号解析，事件里只出现身份。开始和结束事件围住真实工作调用，耗时或动画进度不参与就绪判断。一个子进程失败不会抹去另一个进程已经提交的成果。

We **state = access(core.status(context=`context`),"value")**.
We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
We **started = table.put(in=None,at="id",value=access(`item`,"id"))**.
We **started = table.put(in=`started`,at="title",value=access(`item`,"title"))**.
We **started = table.put(in=`started`,at="status",value="running")**.
We **settings = access(`state`,"settings")**.
We **model = json.get(value=access(`settings`,"unit_models"),key=access(`item`,"id"))**.
1. not `model`
  We **model = access(`settings`,"child_model")**.
We **_ = io.event(context=`context`,kind="child_start",data=table.put(in=`started`,at="model",value=`model`))**.
We **observed = work(context=`context`,model_id=`model`)**.
We **status = "failed"**.
1. access(`observed`,"ok")
  We **status = "succeeded"**.
We **_ = io.event(context=`context`,kind="child_end",data=table.put(in=table.put(in=`started`,at="status",value=`status`),at="result",value=`observed`))**.
Return *observed*.

## work

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| model_id | text | required | 实现角色选定的模型 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 一个单元的测试与实现结果 |

Use `context`, `model_id`。

恢复时先读取已保存的冻结测试和有效实现，已经成功的步骤不重复调用模型。每次角色变化都重新组成消息，没有先前开发或测试的聊天。测试模型可由用户独立选择，继承仅指使用同一配置，不共享上下文。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

固定正文测试只看到公开原文契约，使用专用入口生成不同输入案例；通用测试仍独立填写业务预期。两种入口都没有读取实现的能力。任何测试模板都不能代替用户确认，也不能为未知业务生成默认答案。

继承模型配置不意味着继承另一角色的消息或文件可见范围。

顺序是先冻结案例，再启动作者。已有有效案例不重复生成；已有源码仍须结合摘要和案例判断是否有效。固定正文使用只含 write_text 的窄接口，不把代码编写或文件读取权限一并提供。测试模型配置可以继承，实现与测试的消息包和角色工作目录始终分开，两个请求不会共享模型聊天历史。

We **state = access(core.status(context=`context`),"value")**.
We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
1. not json.get(value=`item`,key="tests")
  We **testing = json.get(value=access(`state`,"settings"),key="test_model")**.
  1. not `testing`
    We **testing = "inherit"**.
  We **test_context = table.put(in=`context`,at="role",value="test")**.
  We **test_context = table.put(in=`test_context`,at="variant",value=json.get(value=`item`,key="mode"))**.
  We **tested = turn.run(context=`test_context`,model_id=`testing`)**.
  1. not access(`tested`,"ok")
    Return *tested*.
We **item = proof.unit(state=access(core.status(context=`context`),"value"),unit_id=access(`context`,"unit_id"))**.
1. proof.ready(context=`context`,item=`item`)
  Return *result.ok(value=True)*.
We **own = table.put(in=`context`,at="role",value="implement")**.
We **own = table.put(in=`own`,at="variant",value=json.get(value=`item`,key="mode"))**.
Return *turn.run(context=`own`,model_id=`model_id`)*.

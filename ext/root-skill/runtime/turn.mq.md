---
markup: occlusion
title: 一次角色工作的有界调用循环
import:
  io: io.mq.md
  core: ../state.mq.md
  proof: ../proof.mq.md
  materials: materials.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  document: lib/document.mq.md
  result: lib/result.mq.md
  prompts: prompts.mq.md
---

一次角色工作的有界调用循环。所有阶段选择和重试规则都在 Marqdo 中执行。

## done

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 当前角色是否已经留下必要事实 |

Use `context`。

判断只读取真实状态与摘要，不依据模型回答是否包含完成字样。待用户回应是主阶段的暂停，冻结案例是测试角色的完成，独立案例与源码共同有效才是实现角色的完成。角色完成不能代替整个工程最终验收。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **state = access(core.status(context=`context`),"value")**.
We **role = access(`context`,"role")**.
1. `role` == "test" or `role` == "implement"
  We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
  1. `role` == "test"
    Return *(json.get(value=`item`,key="tests") != None)*.
  Return *proof.ready(context=`context`,item=`item`)*.
Return *(json.get(value=`state`,key="pending") != None)*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的当前调用现场 |
| model_id | text | "inherit" | 此角色明确选择的模型身份 |
| limit | number | 6 | 本阶段最多模型轮数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实角色完成或未完成结果 |

Use `context`, `model_id`="inherit", `limit`=6。

每一轮先检查已有事实，再加载当前文稿、请求模型并执行真实调用。无有效程序时保留诊断，有限重试；达到上限只能返回未完成，不生成基础提问、猜测框架或代替模型生成业务结果。阶段迁移始终由根文稿和用户确认决定。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

失败轮次只保留修复所需的上一条观测，成功轮次只交接真实进展，不让历史候选堆积成新的上下文。

每一轮保存的上一份调用只属于本角色。它是待修复的源码材料，不是系统指令，不会自动获得额外导入、文件根或内部函数的使用权。模型可以依据具体错误重新填写参数，但不能重写当前阶段规则。达到轮数上限后返回未完成，用户继续时仍可读取已经发表的文稿和失败记录。网络连接正常、模型产生文本或调用进程退出都不足以独立证明阶段完成；只有状态校验通过才返回成功。

框架规划允许十二轮，以便逐个保存最多八项职责再发表；其他角色仍按默认六轮，超时与预算不因草稿而取消。

成功调用与阶段完成分别记录。保存一项草稿可以真实成功，但规划仍需继续；这一情况发送进展说明，不把成功结果误称为错误，更不要求模型修复原本正确的参数。成功后的旧候选不再重复加入下一轮消息，当前状态会交接已经保留的事实。只有实际失败才附上自己的上一份程序与诊断，供模型修正。

当用户限定的职责数已满足，下一轮只给发表入口，避免反复定义同一个职责。这个限制由 scene 读取真实状态决定；模型即使重复输出原来的函数名，也会被当前公开文稿边界拒绝。发表仍然需要实际调用，阶段仍需用户确认，不能把接口收窄本身当成任务已经完成。

Document research has more bounded steps than a fixed return. A query, a failed address, a second source and a final publication are separate calls. This role therefore has up to eighteen turns, while ordinary implementation keeps six and outline keeps twelve. The limit is still explicit and the process deadline still applies. Failed addresses have their own two-attempt network bound, so increasing the role budget does not authorize endless retries. Successful observations survive between turns and user continuations. A section that is already independently ready exits immediately; a partial section remains incomplete rather than receiving a fabricated result at the budget boundary.


We **feedback = None**.
1. access(`context`,"role") == "outline"
  We **limit = 12**.
1. access(`context`,"role") == "implement" and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
  We **limit = 18**.
We **rounds = table.range(start=1,end=(`limit` + 1))**.
- [在当前调用现场有界推进](for rounds as step)
  1. done(context=`context`)
    Return *result.ok(value=True)*.
  We **context = scene(context=`context`)**.
  We **packet = prompts.packet(context=`context`,feedback=`feedback`)**.
  1. not access(`packet`,"ok")
    Return *packet*.
  We **packet_value = access(`packet`,"value")**.
  We **generated = io.model(context=`context`,messages=access(`packet_value`,"messages"),sources=access(`packet_value`,"sources"),model_id=`model_id`,step=`step`)**.
  1. not access(`generated`,"ok")
    Return *generated*.
  We **executed = io.execute(context=`context`,api=io.api_path(context=`context`),body=access(access(`generated`,"value"),"text"),step=`step`)**.
  We **succeeded = access(`executed`,"ok")**.
  1. `succeeded` and json.get(value=access(`executed`,"value"),key="ok") == False and json.get(value=access(`executed`,"value"),key="error") != None
    We **succeeded = False**.
  We **feedback = table.put(in=None,at="succeeded",value=`succeeded`)**.
  1. not `succeeded`
    We **feedback = table.put(in=`feedback`,at="own_previous_program",value=access(access(`generated`,"value"),"text"))**.
    We **feedback = table.put(in=`feedback`,at="observation",value=`executed`)**.
1. done(context=`context`)
  Return *result.ok(value=True)*.
Return *result.error(code="root.role_incomplete",message=("本阶段未取得必要的真实结果：" + access(`context`,"role")),operation="run")*.

## scene

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前角色的可信现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 根据实际草稿状态选择的下一调用现场 |

Use `context`。

The next callable document comes from persisted facts. Planning with a fixed approved unit count narrows to publication once those drafts exist. Research with an unsatisfied source contract narrows to browsing. These are actual program branches, not requests that a model politely remember a sequence. Every turn recomputes the scene; a model cannot preserve an obsolete broader interface through its own output.

当用户明确限定职责数，且实际草稿已达到这个数量，规划的下一步就是发表框架。本函数此时只提供发表文稿，不再提供重复定义职责的函数，减少无意义重试和上下文。数量尚未满足时仍提供职责定义接口；用户没有限定数量则保留普通规划现场，不猜测业务边界。

这项选择由根状态和真实用户配置决定，不来自模型自述。它不发表文稿、不代确认，也不把数量满足等同于职责正确。实际发表仍会检查完整依赖、契约和叙述，再交用户审阅确切版本。其他角色保持自己的测试、实现或办公范围，不因一次调用成功而扩大权限。

数量只是约束的一部分，下一份发表文稿仍将职责原文和验收完整呈现给用户，不替用户判断这些业务内容是否正确。

We **role = access(`context`,"role")**.
1. `role` == "implement" and (json.get(value=`context`,key="variant") == "research" or json.get(value=`context`,key="variant") == "document")
  Return *document_scene(context=`context`)*.
1. `role` != "outline"
  Return *context*.
We **state = access(core.status(context=`context`),"value")**.
We **expected = json.get(value=access(`state`,"settings"),key="expected_units")**.
We **drafts = json.get(value=`state`,key="draft_units")**.
1. `expected` != None and `expected` > 0 and `drafts` and table.len(xs=`drafts`) == `expected`
  Return *table.put(in=`context`,at="variant",value="publish")*.
Return *table.put(in=`context`,at="variant",value="")*.

## document_scene

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前研究或文章作者 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | document_scene 的真实结果，失败保留诊断 |

Use `context`。

Source readiness is measured before exposing publication. The writer may reuse observed materials from verified dependencies, so this restriction does not force unnecessary network requests. The selected scene does not freeze new rules, adjust the minimum or mark the unit ready. Publication still has to satisfy its immutable independent contract and later human review.

研究没有来源时不能先发表一篇猜测文章。根文稿从测试者冻结的要求和真实浏览记录决定当前现场：来源不足只提供 browse；满足实际来源数量后才提供文档发表函数。已验证依赖交回的来源同样可用，无需重复抓取。这个选择不放宽独立契约，不代替用户审阅，也不把一次成功抓取当作研究质量合格。模型无法通过给自己的参数设置 scene 跳过检查，每轮都会重新读取真实状态。

We **state = access(core.status(context=`context`),"value")**.
We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
We **rules = json.get(value=json.get(value=access(`item`,"tests"),key="suite"),key="rules")**.
We **observed = materials.sources(context=`context`,item=`item`)**.
We **scene = ""**.
1. `rules` and table.len(xs=`observed`) < access(`rules`,"minimum_sources")
  We **scene = "browse"**.
Return *table.put(in=`context`,at="scene",value=`scene`)*.

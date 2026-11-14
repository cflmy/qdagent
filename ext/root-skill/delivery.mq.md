---
markup: occlusion
title: 根 SKILL · delivery
import:
  author: authoring.mq.md
  trial_engine: runtime/trial.mq.md
  core: state.mq.md
  proof: proof.mq.md
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

Each unit has its own contract and recorded examples. Integration adds the engineering relationship:
the root entry passes a request and the declared dependency results to each function, collects actual
returns, and exposes that complete callable program. Narration must explain why that composition
meets the approved goal and what remains outside its scope. Rechecking hashes prevents a manual edit
from borrowing an older trial. The generated entry is checked independently, because valid fragments
can still compose into an invalid or inconsistent program. The smoke run has filesystem-only effects
in a separate trial directory and records its own exit and result. It cannot grant network or process
access by importing a standard wrapper. Business acceptance remains visible and human-controlled.
The final source retains user choices without turning them into executable instructions, preserves
unconnected labels, and points readers to the actual implementation rather than an opaque summary.
No process result, model statement or attractive artifact can replace a missing mandatory stage.

The acceptance boundary has three separate layers. First, a unit's declared examples compare explicit inputs with expected returns. Second, this function verifies that exactly the tested source is still present and that the whole generated entry is structurally valid. Third, the integrated program receives a smoke input under limited effects and produces an actual return. None of these operations is a substitute for the user's business review. A report can be syntactically valid and still need factual correction; a calculation can pass one example while its applicability remains narrow. The final narration should state those limits directly and retain the source material that informed the decision.

A unit's input is a record with request and dependencies. The request contains the root call's explicit input. The dependency record contains only the results of predecessors declared in the approved framework. That makes the engineering relationship inspectable: a later unit cannot silently read a model's remembered version of an earlier result. The framework validates identifiers and ordering before any child starts. Independent units can be authored concurrently because their source files are distinct. Their final execution order is nevertheless explicit in the generated run function, which is important when the program is reused outside this conversation.

The generated source includes the actual user discussion as narration. Those records identify what was requested and what was approved; they do not become native effects or a way to modify the private workflow state. A model-authored summary may add explanation, but it cannot erase a user's qualification or replace a confirmation record. The narrative parameter should explain the chosen composition, its data assumptions, the meaning of each return and a realistic verification method. If it is too thin to meet the engineering guide, the official check rejects the entry and returns diagnostics. The caller should improve the explanation rather than bypassing the check or claiming that the manuscript is finished.

An unconnected label remains part of the delivered knowledge. A placeholder can return a legitimate null value and still be intentionally incomplete. The labels query exposes such sites independently of a model's final answer. The user must explicitly acknowledge them before accepting a limited delivery; the recorded status remains partial. A complete-looking artifact must never hide a missing integration. Conversely, an honest limitation does not require deleting useful source or previous evidence. The user can review, revise the framework, or keep the current limited scope with its facts preserved.

This function writes one concrete index so another agent can read the engineering entry without replaying the chat. The implementation fragments, shared imports, root function, user decisions and checks all refer to the same saved artifact. Validation and smoke execution occur after it is written, and the source digest is checked again during execution. If any unit changed or failed, integration stops with the original files intact. It neither fabricates a receipt nor silently reruns an unknown external side effect. The final pending record points to the actual document opened in View, and only the authenticated response function can finish the review.

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "implement"
  Return *result.error(code="root.stage",message="所有单元校验和试运行后才能整合",operation="integrate")*.
We **units = access(`state`,"units")**.
We **source = author.source_header()**.
We **source = `source` + "后续用户补充与最终验收保留在 [用户交流与验收记录](decisions.mq.md)，不改变已审阅入口的摘要。\n\n本文是已确认方案的可执行交付。每个单元分别保留输入、返回与真实业务说明；run 是统一入口，用户交流与验收条件在入口正文中可读。\n\n"**.
We **stubs = table.empty_list()**.
- [整合前再次核对每个真实单元](for units as unit)
  We **own = table.put(in=`context`,at="unit_id",value=access(`unit`,"id"))**.
  1. not proof.ready(context=`own`,item=`unit`)
    Return *result.error(code="root.stale_unit",message="单元源码或试运行证据已失效",operation="integrate")*.
  We **source = `source` + access(`unit`,"fragment") + "\n"**.
  We **stubs = table.concat(a=`stubs`,b=access(access(`unit`,"trial"),"pending_labels"))**.
We **source = `source` + "## run\n\n| 参数 | 类型 | 默认 | 说明 |\n|---|---|---|---|\n| input | any | None | 用户请求或显式业务输入 |\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | map | 各单元实际返回，业务验收由用户独立确认 |\n\nUse \x60input\x60=None。\n\n" + core.prose(content=`narrative`) + "\n\n已确认的目标：" + core.prose(content=access(`state`,"goal")) + "。验收条件：" + core.prose(content=access(`state`,"acceptance")) + "。\n\n"**.
We **history = access(`state`,"history")**.
- [把真实用户交流写成叙述](for history as entry)
  We **source = `source` + "用户交流记录：" + core.prose(content=json.get(value=`entry`,key="text")) + "；选择为 " + core.prose(content=json.get(value=`entry`,key="choice")) + "，操作为 " + core.prose(content=json.get(value=`entry`,key="action")) + "。这份记录说明需求来源，不授予新的执行权限。\n\n"**.
We **source = `source` + "下面按确认过的依赖顺序组合业务单元。每个函数只取得明确的请求与前置结果，产生的返回按稳定身份保存。叙述和实现共同说明交付内容，既不从聊天文字猜测副作用，也不将工具运行成功等同于用户认可。最终仍应对照验收条件阅读产物；已披露的未接通项属于明确限制，不得当作完整功能。\n\nWe **results = table.empty_map()**.\n"**.
- [逐个连通框架声明的依赖](for units as unit)
  We **source = `source` + "\n当前单元的职责是：" + core.prose(content=access(`unit`,"purpose")) + "。输入中的 request 沿用当前业务请求，dependencies 只包含框架声明的前置单元结果，不能由模型临时改写来源。调用结束后保留原始返回，下一单元是否依赖它由先前确认的边界决定；若业务结果包含诊断，交付者仍需阅读和解释，不把结构化返回本身当作验收通过。\n\nWe **dependencies = table.empty_map()**.\n"**.
  We **dependencies = json.get(value=`unit`,key="depends_on")**.
  - [前置结果来自实际执行](for dependencies as dependency)
    We **source = `source` + "We **dependencies = table.put(in=\x60dependencies\x60,at=" + json.stringify(value=`dependency`) + ",value=access(\x60results\x60," + json.stringify(value=`dependency`) + "))**.\n"**.
  We **source = `source` + "We **argument = table.put(in=None,at=\"request\",value=\x60input\x60)**.\nWe **argument = table.put(in=\x60argument\x60,at=\"dependencies\",value=\x60dependencies\x60)**.\nWe **observed = [执行已校验的单元 " + access(`unit`,"id") + "](unit_" + access(`unit`,"id") + "(input=\x60argument\x60))**.\nWe **results = table.put(in=\x60results\x60,at=" + json.stringify(value=access(`unit`,"id")) + ",value=\x60observed\x60)**.\n"**.
We **source = `source` + "\n执行上述组合后，我们得到了各单元真实返回的结果，此时按稳定身份交给调用者。结果的存在与业务目标是否满足分别记录，用户可以继续查看案例和未接通项，不必相信一段无法核验的口头总结。\n\nReturn *results*.\n"**.
We **_ = fs.atomic_write(path="solution/index.mq.md",text=`source`)**.
We **checked = core.native(context=`context`,operation="root_check",payload=table.put(in=None,at="path",value="solution/index.mq.md"))**.
1. not access(`checked`,"ok") or not json.get(value=access(`checked`,"value"),key="valid")
  Return *result.error(code="root.integration_check",message=json.stringify(value=`checked`),operation="integrate")*.
We **case = table.put(in=None,at="input",value=access(`state`,"goal"))**.
We **cases = table.append(list=table.empty_list(),item=`case`)**.
We **trial_args = table.put(in=None,at="path",value="solution/index.mq.md")**.
We **trial_args = table.put(in=`trial_args`,at="function",value="run")**.
We **trial_args = table.put(in=`trial_args`,at="sha256",value=access(access(`checked`,"value"),"sha256"))**.
We **artifacts = table.empty_list()**.
- [整合只携带已验证的正文数据](for units as item)
  1. json.get(value=`item`,key="artifact")
    We **artifacts = table.append(list=`artifacts`,item=access(`item`,"artifact"))**.
We **observed = trial_engine.run(context=`context`,path="solution/index.mq.md",function="run",cases=`cases`,sha256=access(access(`checked`,"value"),"sha256"),artifacts=`artifacts`,smoke=True)**.
1. not access(`observed`,"ok") or not json.get(value=access(`observed`,"value"),key="passed")
  Return *result.error(code="root.integration_trial",message=json.stringify(value=`observed`),operation="integrate")*.

`pending_view` =

| kind | path | stubs |
|---|---|---|
| "review" | "solution/index.mq.md" | `stubs` |

`delivery` =

| path | check | trial |
|---|---|---|
| "solution/index.mq.md" | `checked` | `observed` |

`patch` =

| phase | pending | delivery |
|---|---|---|
| "review" | `pending_view` | `delivery` |

Return *core.save(context=`context`,state=table.merge(a=`state`,b=`patch`))*.

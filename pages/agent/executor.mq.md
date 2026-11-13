---
markup: occlusion
title: 工具执行的真实边界与收据
import:
  agent: ext/ai/agent.mq.md
  call: ../control/call.mq.md
  events: events.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  text: lib/text.mq.md
---

复用已有智能体工具注册、Schema 校验和效果账本。与旧 subtask 适配器不同，
本应用的分发始终形成实际 marqdo call，并保存命名参数、退出与返回结果。
模型不能决定文件根、效果权限或可执行文件；这些值都来自受信任的工具定义。

## available

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 会话管理器保存的上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 当前可用工具的实际注册契约 |

Use `context`。目录在工程根读取开关，执行在任务根使用它，二者不能混用路径。
每轮重新读取，关闭的拓展不会一直留在旧提示词里。此调用只读取可信登记，不让模型自己
补充权限；原生工具注册器随后继续检查 Schema 是否受支持。

The principal comes from the saved context, never from model arguments. A child context may additionally name a trusted tool subset. That subset filters both the model's directory and the executor's actual whitelist; it is not merely a prompt hint. A guessed writable tool therefore fails even when the parent could use it.

We **project = access(`context`, "project")**.
We **specs = [从真实登记源取得工具](call.invoke(file=(`project` + "/pages/agent/catalog.mq.md"), function="tools", arguments=table.put(in=None, at="principal", value=access(`context`,"owner")), root=`project`, effects="plugin,fs.read,fs.write,environment.read"))**.
We **subset = json.get(value=`context`,key="tool_ids")**.
1. not `subset`
  Return *specs*.
We **allowed = text.str_split(s=`subset`,sep=",")**.
We **filtered = table.empty_list()**.
- [宿主限制同时约束提示和实际执行](for specs as spec)
  - [只匹配明确的完整身份](for allowed as id)
    1. access(`spec`,"id") == `id`
      We **filtered = table.append(list=`filtered`,item=`spec`)**.
Return *filtered*.

## execute

| 参数 | 类型 | 说明 |
|---|---|---|
| name | text | 模型选择的登记工具身份 |
| arguments | any | 待校验的参数对象 |
| context | map | 可信会话上下文 |
| run_id | text | 当前真实任务身份 |
| step | number | 当前动作序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际工具 Result，拒绝时没有执行 |

Use `name`, `arguments`, `context`, `run_id` and `step`。
先注册真实目录，再由原生工具契约执行白名单和参数检查，最后重新确认插件开关。
Schema 失败和插件拒绝不会启动工具。真正进入执行之后才创建工具 span，并保存实际 CLI
参数向量；模型的公开说明不是证据，更不是替换目标函数或文件根的机会。

Read tools are observed normally. Mutating calls reserve an effect-ledger record before the process
starts. A committed operation is not blindly repeated; an interrupted or unknown effect requires
inspection rather than an automatic retry. The result cache is written before committing the receipt.
A failed child may have produced a partial effect, so it is conservatively recorded as unknown.

The native SDK exposes registration and authorization as separate operations. Register the structured specifications, then pass an explicit list of their identities as the whitelist. A specification record is not itself a whitelist string. After validation, select execution metadata from the trusted source definition: the SDK's prepared receipt deliberately contains only a small execution summary and must not be mistaken for the full application adapter.

For a read, the observed child result is enough to describe the operation. For write or execute effects, reserve a ledger operation using a stable run and step identity before starting the child. The transition to started means the process may produce effects; it does not mean they succeeded. Save the real returned Result before committing the receipt. If execution fails after starting, record unknown conservatively because partial filesystem effects may exist.

Reusing a committed operation returns its cached actual result. A prepared, started or unknown effect is not permission to run the same mutation again blindly. The native ledger is host-relative and is resolved under the worker's session root. The workflow process runs with that current directory explicitly. Development callers should use the same session context when testing ledger behavior and should not share a global receipt directory across unrelated tasks.

The argument object cannot choose the executable, source root, target member or effect list. Workspace tools receive the narrow workspace root; library adapters receive the engineering root only for their documented operations. The optional extension's current permission is checked again immediately before dispatch, even if the model saw it in an earlier prompt. Schema or authorization rejection creates a rejected event and no tool process.

An event span begins only when a real tool is about to run. Its input is the actual validated argument object, and its finish event contains the real CLI argv, process exit and decoded business result. A public model sentence saying “created” cannot supply those facts. The UI may animate the running span, but it must display failure or interruption when the corresponding operation does not finish successfully.

Cancellation stops the workflow process group rather than just a polling request. Calls made through this boundary inherit that group, including a workspace program invoked through run_marqdo. A cancelled mutation keeps its ledger and filesystem evidence for inspection. Restarting the UI, disabling a plugin or asking a follow-up question must not erase uncertainty by rewriting an old receipt as committed.

We **specs = [本次重新读取授权](available(context=`context`))**.
We **_ = [复用原生工具注册器](agent.tools_register(specs=`specs`))**.
We **names = [白名单只传登记身份](table.empty_list())**.
We **spec = None**.
- [登记契约与授权名称分开](for specs as item)
  We **names = [只授权已登记名称](table.append(list=`names`, item=access(`item`, "id")))**.
  1. access(`item`, "id") == `name`
    We **spec = `item`**.
We **operation = `run_id` + "-" + str(`step`)**.
We **prepared = [原生校验和授权](agent.tools_prepare_call(tool_id=`name`, arguments=`arguments`, tools=`names`, call_id=`operation`, operation_id=`operation`, logical_run_id=`run_id`, step_id=str(`step`)))**.
1. not json.get(value=`prepared`, key="ok")
  We **span = [拒绝不是执行成功](events.append(kind="rejected", title=("拒绝工具请求 " + `name`), details=`arguments`))**.
  We **_ = [记录未执行原因](events.finish(span=`span`, details=`prepared`, status="failed"))**.
  Return *prepared*.
We **project = access(`context`, "project")**.
We **permission = [执行前再次检查插件](call.invoke(file=(`project` + "/pages/control/plugins.mq.md"), function="require", arguments=table.put(in=table.put(in=None, at="principal", value=access(`context`,"owner")), at="id", value=access(`spec`, "plugin")), root=`project`, effects="plugin,fs.read,fs.write,environment.read"))**.
1. not json.get(value=`permission`, key="ok")
  Return *permission*.
We **ledger = "data/dialogue/proj/effects"**.
We **needs = json.get(value=`prepared`, key="needs_ledger")**.
We **cache = "data/dialogue/proj/results/" + `operation` + ".json"**.
1. `needs`
  We **reservation = [准备已有效果账本](agent.effects_prepare(operation_id=`operation`, idempotency_key=json.get(value=`prepared`, key="idempotency_key"), args_digest=json.get(value=`prepared`, key="args_digest"), effect_class=access(`spec`, "effect"), logical_run_id=`run_id`, step_id=str(`step`), ledger_dir=`ledger`))**.
  We **state = json.get(value=json.get(value=`reservation`, key="record"), key="state")**.
  1. `state` == "committed" and fs.exists(path=`cache`)
    Return *[返回已有收据而不重做](fs.read_json(path=`cache`))*.
  1. `state` != "prepared"
    Return *[未知效果不能盲目重试](result.error(code="qdagent.effect_pending", message=str(`reservation`), operation=`name`))*.
  We **_ = [声明实际执行即将开始](agent.effects_transition(operation_id=`operation`, state="started", ledger_dir=`ledger`))**.
We **root = access(`context`, "workspace")**.
1. access(`spec`, "root_kind") == "project"
  We **root = `project`**.
We **effective = `arguments`**.
1. `name` == "call_plugin" or `name` == "read_library" or `name` == "create_office" or `name` == "delegate_task"
  We **effective = [执行上下文只由可信宿主注入](table.put(in=`arguments`, at="context", value=`context`))**.
We **span = [工具阶段真实开始](events.append(kind="tool", title=("调用 " + `name`), details=`effective`))**.
We **evidence = [真实调用与真实退出](call.observed(file=(`project` + "/" + access(`spec`, "file")), function=access(`spec`, "function"), arguments=`effective`, root=`root`, effects=access(`spec`, "cli_effects")))**.
We **outcome = [业务结果保持原样](call.decode(evidence=`evidence`))**.
We **status = "failed"**.
1. json.get(value=`outcome`, key="ok")
  We **status = "succeeded"**.
We **details = [保留实际参数向量](table.put(in=None, at="call", value=access(`evidence`, "argv")))**.
We **details = [保留实际业务结果](table.put(in=`details`, at="result", value=`outcome`))**.
We **details = [保留真实退出](table.put(in=`details`, at="exit_code", value=access(`evidence`, "code")))**.
We **_ = [结束属于同一个 span](events.finish(span=`span`, details=`details`, status=`status`))**.
1. `needs`
  We **_ = [建立收据目录](fs.make_dirs(path="data/dialogue/proj/results"))**.
  We **_ = [先保留真实返回](fs.atomic_write(path=`cache`, text=json.stringify(value=`outcome`)))**.
  We **receipt_state = "unknown"**.
  1. `status` == "succeeded"
    We **receipt_state = "committed"**.
  We **_ = [实际结果才推进账本](agent.effects_transition(operation_id=`operation`, state=`receipt_state`, result_ref=`cache`, ledger_dir=`ledger`))**.
Return *outcome*.




## permission

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 实际拓展身份 |
| context | map | required | 可信会话上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 工程根的当前能力授权 |

Use `id` and `context`。宿主加载的 ABI 不代表模型一直获得授权。每次模型请求重新读取工程开关，用户停用 AI 后不会继续请求下一轮；任务停止和历史阅读仍属于宿主管理。

The same owner scope is used for model and tool authorization.

We **project = access(`context`, "project")**.
Return *[读取最新插件授权](call.invoke(file=(`project` + "/pages/control/plugins.mq.md"), function="require", arguments=table.put(in=table.put(in=None, at="principal", value=access(`context`,"owner")), at="id", value=`id`), root=`project`, effects="plugin,fs.read,fs.write,environment.read"))*.

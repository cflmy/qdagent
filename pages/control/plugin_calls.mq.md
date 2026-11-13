---
markup: occlusion
title: 已登记拓展入口的实际调用
import:
  json: lib/json.mq.md
  plugins: plugins.mq.md
  call: call.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

拓展即插件不能只是一张列表。这个适配器把插件登记中明确公开的入口函数交给智能体，复用现有 ABI 与源码。没有登记的函数不会因为模型知道名字就获得执行权。

## invoke

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| plugin | text | required | 真实拓展身份 |
| operation | text | required | 入口登记的实际函数 |
| arguments | any | None | 命名业务参数 |
| context | map | required | 执行器注入的可信上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际插件函数 Result，停用或未登记操作明确失败 |

Use `plugin`, `operation`, `arguments`=None and `context`。模型只提供前三项，context 在 Schema 校验之后由执行器注入，模型不能扩展工作目录。先重新读取开关与可用性，再核对登记的操作名；真正调用仍然是 marqdo call。每个插件的参数契约可以通过 read_library 读取实际入口文档。

The operation list is an explicit host registration, not unrestricted reflection. For example, quantum exposes its documented Bell circuit helpers, while Web exposes preview and development guidance rather than its blocking server main. Missing native packages remain unavailable. Engineering command execution and arbitrary shared-library loading are not exposed through this adapter.

The controller reads the capability registry under the project root, then invokes the selected trusted source with the narrower workspace root from the injected context. Optional arguments stay absent so the target can apply its documented defaults. A plugin failure remains a failure Result, and the outer executor records the actual call and effect receipt. Enabling a package does not fabricate a result; the specific operation must still run.

To add a future capability, update the installed package, its readable entry, the ABI artifact declaration and the operation list together. Do not accept a file path or effect set from the model. A disabled extension is checked again here even if the generic call_plugin tool remains part of the built-in environment. Host management remains available so users can recover settings and stop existing tasks.

We **allowed = [实际调用前重新授权](plugins.require(id=`plugin`, principal=access(`context`,"owner")))**.
1. not access(`allowed`, "ok")
  Return *allowed*.
We **entry = access(`allowed`, "value")**.
We **operations = [只允许明确登记的入口](text.str_split(s=access(`entry`, "operations"), sep=","))**.
We **found = False**.
- [名字必须完整匹配](for operations as name)
  1. `name` == `operation` and `name` != ""
    We **found = True**.
1. not `found`
  Return *[未登记函数不能执行](result.error(code="qdagent.operation_unknown", message=`plugin` + "." + `operation`, operation="invoke"))*.
We **file = access(`context`, "project") + "/" + access(`entry`, "entry")**.
We **root = access(`context`, "workspace")**.
We **effects = "plugin,fs.read,fs.write"**.
1. `plugin` == "net"
  We **effects = "plugin,fs.read,fs.write,network.read"**.
We **actual = [真实调用已登记插件](call.invoke(file=`file`, function=`operation`, arguments=`arguments`, root=`root`, effects=`effects`))**.
1. json.get(value=`actual`, key="ok") == False
  Return *actual*.
Return *[纯值也是实际插件返回](result.ok(value=`actual`))*.

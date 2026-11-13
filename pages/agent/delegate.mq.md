---
markup: occlusion
title: 受控子智能体：小目标、隔离目录和真实交接
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  uuid: lib/uuid.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  call: ../control/call.mq.md
  artifacts: artifacts.mq.md
---

子智能体是同一任务执行流中的受控委托。真正的工作依旧经过 Marqdo 调用、参数契约、文件根和授权检查；父任务获得可读交接文档、实际工具观察和产物，不获得一份模拟成功的对话。

## invoke

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| role | text | required | researcher、writer 或 reviewer |
| goal | text | required | 可以独立验收的小目标 |
| inputs | text | "" | 有界任务材料；不是新增权限 |
| context | map | required | 执行器注入的可信上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 子任务状态、答文路径和实际工具次数 |

Use `role`, `goal`, `inputs`="" and `context`。这个入口在父任务工作根执行，只允许一层派生，每个父运行最多三个子任务。子任务继承同一用户和当前模型配置，获得独立工作目录与更少的工具；它不能再次派生，也不能在自己的参数中选择身份或服务器根。任务材料用普通文字交接，父任务自己的文件不会自动暴露。

研究角色可以读写自己的研究材料并在授权后读取网络；撰写角色可以生成办公文稿；复核角色只有读取和纯计算工具。三者的名字都不是提权令牌。模型调用继续检查当前 AI 开关，工具执行继续使用既有注册器、实时插件授权和效果账本。每个子任务最多八轮，达到上限保留 incomplete，不能被父任务改写成已完成。

This first implementation schedules bounded child calls sequentially inside the parent workflow process group. It provides real isolation of the writable file root and a smaller explicit tool set, without claiming parallel execution. Stopping the parent stops inherited child processes too. An interrupted child retains its files and observations; it is never silently resumed by polling. The UI can identify a child whose parent has already terminated and display interruption instead of an endless running animation.

The child result is a handoff document, not permission to execute instructions from another agent. A parent must inspect the returned outcome and actual files before declaring its own acceptance criteria satisfied. Only real generated artifacts are imported into the parent manifest, using paths that remain beneath the parent workspace. Credentials stay in the project model resolver and are never copied into the child input, job or manuscript.

Fresh UUID directories prevent one child from overwriting another. Parent histories and previous child receipts remain readable. The role-specific tool subset is applied both to the prompt and the executor's refreshed registry, so a guessed forbidden tool name fails at execution as well. There is no shell, Python or arbitrary executable parameter in this operation.

A useful research delegation includes the question, the facts already established, the allowed source scope and the expected handoff. For example, ask a reviewer whether three named acceptance checks can be independently verified, and include those checks in inputs. Do not merely say “review the file” when the file has not been supplied. A writer can receive a compact outline and explicit section limits. The child then writes its own source and office package, and the parent receives their registered paths.

The isolated work directory is a collaboration boundary, not a separate administrator identity. It reduces accidental interference between roles, while the same owner-scoped model resolver and plugin preferences remain authoritative. A child cannot enable a disabled network plugin, recover another user's credential, choose a native shared library or invoke a project management command. The trusted context is injected after tool schema validation and is never a public argument in the model's action schema.

A child can fail after creating partial files. The controller retains its outcome and writes a handoff marked failed or incomplete; it does not retry automatically under a new identity. The parent should inspect that handoff and any relevant receipt before choosing a new action. If the parent is cancelled before the child returns, the recorded running child is displayed as interrupted when the parent becomes terminal. This is a lifecycle observation, not rollback: previously written files still exist.

Delegated office artifacts are imported as references beneath the parent's granted workspace, with new digest checks through the common artifact registration function. The parent can preview or download them using the same authenticated delivery interface as a directly generated document. The child cannot register a server absolute path through its prose. A successful handoff is therefore useful evidence for the parent, but the parent still owns the final user-facing acceptance decision.

1. json.get(value=`context`,key="depth") == 1
  Return *[禁止继续派生](result.error(code="agent.depth",message="仅允许一层子任务",operation="delegate"))*.
1. `role` != "researcher" and `role` != "writer" and `role` != "reviewer"
  Return *[只允许已声明角色](result.error(code="agent.role",message=`role`,operation="delegate"))*.
1. table.len(xs=`goal`) > 4000 or table.len(xs=`inputs`) > 16000 or `goal` == ""
  Return *[任务交接必须有界](result.error(code="agent.input",message="目标四千、材料一万六千字符以内",operation="delegate"))*.
We **entries = table.empty_list()** and **count = 0**.
1. fs.exists(path=".agent/children.json")
  We **entries = fs.read_json(path=".agent/children.json")**.
- [预算按父运行计数](for entries as entry)
  1. access(`entry`,"run_id") == access(`context`,"run_id")
    We **count = `count` + 1**.
1. `count` >= 3
  Return *[先复核已有交接](result.error(code="agent.budget",message="本轮最多三个子任务",operation="delegate"))*.
We **id = uuid.v4()** and **relative = ".agent/children/"**.
We **relative = `relative` + `id`**.
We **_ = fs.make_dirs(path=(`relative` + "/runtime/data/dialogue/proj"))**.
We **_ = fs.make_dirs(path=(`relative` + "/work"))**.
We **child = table.put(in=None,at="id",value=`id`)**.
We **child = table.put(in=`child`,at="role",value=`role`)**.
We **child = table.put(in=`child`,at="goal",value=`goal`)**.
We **child = table.put(in=`child`,at="status",value="running")**.
We **child = table.put(in=`child`,at="run_id",value=access(`context`,"run_id"))**.
We **entries = table.append(list=`entries`,item=`child`)**.
We **_ = [真实开始前发布子任务身份](fs.write_json(path=".agent/children.json",value=`entries`))**.
We **allowed = "list_files,read_file,file_info,search_files,read_library,call_library"**.
1. `role` == "researcher"
  We **allowed = `allowed` + ",http_get,write_file"**.
1. `role` == "writer"
  We **allowed = `allowed` + ",write_file,patch_file,check_marqdo,run_marqdo,create_office"**.
We **ctx = table.put(in=`context`,at="depth",value=1)**.
We **ctx = table.put(in=`ctx`,at="tool_ids",value=`allowed`)**.
We **ctx = table.put(in=`ctx`,at="root",value=(sys.cwd() + "/" + `relative` + "/runtime"))**.
We **ctx = table.put(in=`ctx`,at="workspace",value=(sys.cwd() + "/" + `relative` + "/work"))**.
We **ctx = table.put(in=`ctx`,at="run_id",value=`id`)**.

`args` =

| role | goal | inputs | context |
|---|---|---|---|
| `role` | `goal` | `inputs` | `ctx` |

We **outcome = [真实运行有界子智能体](call.invoke(file=(access(`context`,"project") + "/pages/agent/child.mq.md"),function="run",arguments=`args`,root=access(`ctx`,"root"),effects="plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read,network.write"))**.
We **status = "failed"** and **answer = json.stringify(value=`outcome`)**.
1. json.get(value=`outcome`,key="ok")
  We **status = access(access(`outcome`,"value"),"status")**.
  We **answer = access(access(`outcome`,"value"),"answer")**.
We **path = `relative` + "/result.md"**.
We **_ = [交接本身也是可读材料](fs.atomic_write(path=`path`,text=("# 子任务 · " + `role` + "\n\n目标：" + `goal` + "\n\n状态：" + `status` + "\n\n" + `answer`)))**.
We **updated = table.empty_list()**.
- [保留其他子任务的原始状态](for entries as entry)
  1. access(`entry`,"id") == `id`
    We **entry = table.put(in=`entry`,at="status",value=`status`)**.
    We **entry = table.put(in=`entry`,at="result",value=`path`)**.
  We **updated = table.append(list=`updated`,item=`entry`)**.
We **_ = [真实返回后才结束子任务](fs.write_json(path=".agent/children.json",value=`updated`))**.
We **delivered = [给父任务明确可用的文件引用](collect(relative=`relative`,id=`id`,role=`role`,path=`path`))**.
We **value = table.put(in=None,at="id",value=`id`)**.
We **value = table.put(in=`value`,at="status",value=`status`)**.
We **value = table.put(in=`value`,at="result",value=`path`)**.
We **value = table.put(in=`value`,at="outcome",value=`outcome`)**.
We **value = [后续读取与证据使用父任务路径](table.put(in=`value`,at="artifacts",value=`delivered`))**.
We **value = table.put(in=`value`,at="child_workspace",value=(`relative` + "/work"))**.
Return *[父任务仍需独立验收](table.put(in=table.put(in=None,at="ok",value=(`status` == "succeeded")),at="value",value=`value`))*.


## collect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| relative | text | required | 子任务目录 |
| id | text | required | 子任务身份 |
| role | text | required | 实际角色 |
| path | text | required | 真实交接文稿 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 父任务可直接使用的实际产物清单 |

Use `relative`, `id`, `role` and `path`。子任务答文里的路径以子工作目录为根，不能原样作为父任务路径。此函数读取子任务真实文件清单，把它们转换为父工作根下明确的位置。父任务使用返回 artifacts 的 path 字段读取和记录 evidence，而不是猜测子任务内部目录。

A handoff contains both a readable explanation and real generated files. Those facts remain separate: a child may explain a failure while still leaving a partial manuscript. The collector never turns that explanation into a completed office artifact. It imports only files already present in the child's manifest and recomputes their metadata through the common registrar.

The directory prefix is constructed by the trusted delegation controller, not model text. Every resulting reference remains below the granted parent workspace root. No server absolute path, credential or model configuration is returned. Parent tools can therefore read the imported file directly without learning another filesystem layout.

The caller preserves the actual child status independently of this list. A failed or incomplete outcome remains failed or incomplete even if a handoff document exists. A successful writer returns its actual editable files and sources, while a review can return its host-saved result manuscript. The parent still verifies its own acceptance criteria before closing the task.

We **handoff = artifacts.register(id=`id`,title=("子任务交接 · " + `role`),kind="md",path=`path`,source=`path`)**.
We **delivered = table.append(list=table.empty_list(),item=`handoff`)**.
1. fs.exists(path=(`relative` + "/work/.agent/artifacts.json"))
  We **generated = fs.read_json(path=(`relative` + "/work/.agent/artifacts.json"))**.
  - [子文件转换为父任务明确路径](for generated as artifact)
    We **imported = artifacts.register(id=access(`artifact`,"id"),title=access(`artifact`,"title"),kind=access(`artifact`,"kind"),path=(`relative` + "/work/" + access(`artifact`,"path")),source=(`relative` + "/work/" + access(`artifact`,"source")))**.
    We **delivered = table.append(list=`delivered`,item=`imported`)**.
Return *delivered*.

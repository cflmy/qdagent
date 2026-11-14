---
markup: occlusion
title: 官方写时复制沙盒中的真实试运行
import:
  core: ../state.mq.md
  sandbox: ext/ai/sandbox.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  hash: lib/hash.mq.md
  fs: lib/fs.mq.md
  result: lib/result.mq.md
---

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信当前现场 |
| path | text | required | 已检查的本任务源码 |
| function | text | required | 固定生成函数 |
| cases | list | required | 冻结输入预期或整合输入 |
| sha256 | text | required | 源码检查摘要 |
| artifacts | any | None | 允许交接的正文文件 |
| smoke | bool | False | 整合冒烟不比较预期 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | run 的真实结果，失败保留诊断 |

Use `context`, `path`, `function`, `cases`, `sha256`, `artifacts`=None, `smoke`=False。

每轮运行都重新检查这项空目录条件，恢复任务也不能复用意外留下的底层材料。

沙盒底层必须为空，检查到已有文件时明确拒绝。可信控制器只向上层交接获准正文，不把工作区、配置文件或角色状态作为底层挂载，避免试运行偶然读到未授权材料。

当前角色不能通过结果文字更换职责。实现、测试、来源观察与最终验收分别保留自己的证据；只有同一版本下实际执行过的检查，才能用于后续恢复和审阅。

官方沙盒暂不支持文件系统模块导入，因此可信包装把已校验单元源码与固定 main 入口组合后运行；不修改 Marqdo 核心，也不把普通子进程冒充 CoW。

执行器复用 Marqdo 官方 sandbox.open/run/diff/discard；不把一个普通临时目录称为沙盒。每个案例获得新的写时复制会话，只有可信程序写入当前单元获准的正文数据，没有开发对话、私有状态或其他单元实现。候选函数的文件写入只进入会话上层，进程、网络与插件效果关闭，结束后明确丢弃。真实运行、实际返回和文件变化分别保留，失败不会补一个成功结果。

先复核源码摘要与官方检查，再执行固定函数；输入值只是数据，不允许指定另一个函数或效果。正文材料也逐个检查摘要，任何修改都使本次验证失败。字符串、空值与原生记录按各自类型比较。一次通过只证明这些案例，结构契约和最终用户验收另行执行。没有 OS 子进程退出的会话不伪造 exit_code，证据明确标注 marqdo-cow。最后重读源码摘要，防止试运行期间替换文件。

We **checked = core.native(context=`context`,operation="root_check",payload=table.put(in=None,at="path",value=`path`))**.
1. not access(`checked`,"ok")
  Return *checked*.
We **details = access(`checked`,"value")**.
1. not access(`details`,"valid") or access(`details`,"sha256") != `sha256`
  Return *result.error(code="root.trial_version",message="源码未通过检查或版本已变化",operation="run")*.
We **_ = fs.make_dirs(path=".agent/cow-empty")**.
1. table.len(xs=fs.list_dir(path=".agent/cow-empty")) > 0
  Return *result.error(code="root.sandbox_dirty",message="沙盒底层必须为空，不能交接工作区私有内容",operation="run")*.
We **observations = table.empty_list()**.
We **passed = True**.
- [每个独立输入使用新的官方写时复制会话](for cases as case)
  We **observation = run_case(context=`context`,path=`path`,function=`function`,case=`case`,artifacts=`artifacts`,smoke=`smoke`)**.
  We **passed = `passed` and access(`observation`,"passed")**.
  We **observations = table.append(list=`observations`,item=`observation`)**.
We **passed = `passed` and hash.sha256(text=fs.read_text(path=`path`)) == `sha256`**.
We **pending_labels = access(`details`,"pending_labels")**.

`trial` =

| passed | sha256 | cases | pending_labels | engine |
|---|---|---|---|---|
| `passed` | `sha256` | `observations` | `pending_labels` | "marqdo-cow" |

Return *result.ok(value=`trial`)*.


## run_case

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信现场 |
| path | text | required | 固定的已检查单元源码 |
| function | text | required | 生成函数身份 |
| case | map | required | 当前独立案例 |
| artifacts | any | required | 获准正文数据列表 |
| smoke | bool | required | 是否仅作冒烟 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | run_case 的真实结果，失败保留诊断 |

Use `context`, `path`, `function`, `case`, `artifacts`, `smoke`。

The official in-memory runner resolves embedded standard libraries only. The controller therefore appends a trusted main function to the already checked generated source, rather than importing a filesystem module inside the trial. It does not transform the candidate's control flow or introduce another parser. Generated units have stable functions and standard-library imports, which makes this composition explicit. Actual execution still uses the original body and original data. The wrapper's input literal is controller-generated from a frozen native value, not a model-supplied command. Files seeded into the upper layer remain visible in the resulting diff; they are not concealed as if the sandbox had produced no changes. Trial observations distinguish these writes from publication, and the discarded layer never commits them into the host workspace. A returned value that matches an expectation cannot authorize any undeclared external effect.

每条输入都使用新建的写时复制会话，不能看见上一案例留下的副作用。正文数据先由可信控制器读入上层；候选只能在这个会话中读写，不能读取真实私有状态，不能启动进程或接入网络。执行结果由官方解释器产生，失败时保留错误，不能从 stdout 猜测返回。

源码中的 main 包装器只调用已确认函数。输入经原生 JSON 传输还原为值，这属于执行器传值，模型仍提交普通 Marqdo 文稿而不是动作对象。模型无法通过案例参数改函数名、导入路径或效果。文件变化是 CoW 的真实 diff，不代表已经写入用户工作区。无论案例匹配与否都丢弃会话；只有明确后续作者操作才能发表文件。

本函数返回原生案例观测；actual.ok 描述程序是否成功运行，passed 还比较独立业务预期。两者应分别阅读。整合冒烟只核对能否执行，不把它标成独立语义测试。材料摘要不符时应停止并丢弃会话，让作者重新发表，不使用修改后正文冒充原文版本。

We **session = sandbox.open(root=(access(`context`,"workspace") + "/.agent/cow-empty"))**.
We **id = access(`session`,"id")**.
1. `artifacts`
  - [只交接获准且摘要仍一致的正文](for artifacts as artifact)
    We **content = fs.read_text(path=access(`artifact`,"path"))**.
    1. hash.sha256(text=`content`) != access(`artifact`,"sha256")
      We **_ = sandbox.discard(id=`id`)**.
      Return *result.error(code="root.artifact_changed",message="正文材料已变化，需要重新发表",operation="run")*.
    We **_ = sandbox.write(id=`id`,path=access(`artifact`,"path"),text=`content`)**.
We **literal = text.replace(text=json.stringify(value=json.stringify(value=access(`case`,"input"))),old="\x60",new="\\x60")**.
We **wrapper = fs.read_text(path=`path`) + "\n\n## main\n\nWe **input = json.parse(text=" + `literal` + ")**.\nReturn *" + `function` + "(input=\x60input\x60)*.\n"**.
We **ran = sandbox.run(id=`id`,source=`wrapper`)**.
We **changes = sandbox.diff(id=`id`)**.
We **_ = sandbox.discard(id=`id`)**.
We **matched = access(`ran`,"ok") and (`smoke` or access(`ran`,"value") == json.get(value=`case`,key="expected"))**.
We **actual = table.put(in=table.put(in=None,at="ok",value=access(`ran`,"ok")),at="result",value=json.get(value=`ran`,key="value"))**.
We **evidence = table.put(in=table.put(in=None,at="engine",value="marqdo-cow"),at="changes",value=`changes`)**.
We **evidence = table.put(in=`evidence`,at="error",value=json.get(value=`ran`,key="error"))**.

We **expected = json.get(value=`case`,key="expected")**.

`observation` =

| passed | input | expected | actual | evidence |
|---|---|---|---|---|
| `matched` | `case`[^input] | `expected` | `actual` | `evidence` |

Return *observation*.

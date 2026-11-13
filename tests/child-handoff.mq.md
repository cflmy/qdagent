---
markup: occlusion
title: 子任务文件引用的真实交接回归
import:
  sessions: ../pages/control/sessions.mq.md
  office: ../ext/office/index.mq.md
  call: ../pages/control/call.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  uuid: lib/uuid.mq.md
  table: lib/table.mq.md
  test: capabilities.mq.md
  result: lib/result.mq.md
---



## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实子文件转换为父任务可读路径 |

独立任务下先建立子工作目录，用生产 Office 入口在那里生成真实报告，再运行生产 collect。报告和交接文稿都必须登记，返回的报告路径必须带子目录前缀，并能从父工作根读到相同摘要。测试不调用外部模型，也不清理用户数据。

This regression covers a concrete collaboration error. A child can correctly report artifacts/id/document.docx, while that shorthand names no file under the parent root. The returned artifact reference must therefore be converted explicitly. Merely copying a child's final answer is insufficient. The office package is created by the production generator, not a fixture claiming that a nonexistent file exists.

The test gives each run a fresh session and creates a simple text report inside its child workspace. The collector reads the actual generated manifest and re-registers the file with the parent prefix. The final assertion independently hashes the returned path from the parent root. Both path correctness and byte identity must hold.

This deterministic boundary check complements the paid-model workflow, which has already exercised real review and writing decisions. It does not claim that a fake child performed model work: it isolates only the transfer of actual generated files between two roots. No authentication cookie, private profile or other user's task is involved.

The returned reference is data, not a command or a server path to publish. A parent can use it as plan evidence and let the authenticated workbench provide its download link. Recomputing the digest confirms that the imported record describes actual bytes rather than an unverified sentence from another model.

We **opened = sessions.ensure(id=uuid.v4(),title="子任务交接回归",principal="agent-handoff-acceptance")**.
We **ctx = access(`opened`,"value")**.
We **relative = ".agent/children/fixture"** and **root = access(`ctx`,"workspace")**.
We **_ = fs.make_dirs(path=(`root` + "/" + `relative` + "/work"))**.
We **child = table.put(in=`ctx`,at="workspace",value=(`root` + "/" + `relative` + "/work"))**.

`sections` =

| @ | heading | body |
|---|---|---|
| 1 | "真实交接" | "文件在子目录生成，父任务使用明确转换后的实际路径。" |

We **created = office.create(kind="docx",title="子任务报告",sections=`sections`,context=`child`)**.
We **_ = test.assert(condition=access(`created`,"ok"),message="child artifact creation failed")**.
We **path = `relative` + "/result.md"**.
We **_ = fs.atomic_write(path=(`root` + "/" + `path`),text="已真实生成报告，文件以返回清单为准。")**.

`args` =

| relative | id | role | path |
|---|---|---|---|
| `relative` | "fixture" | "writer" | `path` |

We **entries = call.invoke(file=(sys.cwd() + "/pages/agent/delegate.mq.md"),function="collect",arguments=`args`,root=`root`,effects="fs.read,fs.write")**.
We **_ = test.assert(condition=(table.len(xs=`entries`) == 2),message="missing real handoff or report")**.
We **artifact = access(`entries`,2)**.
We **expected = `relative` + "/work/" + access(access(`created`,"value"),"path")**.
We **_ = test.assert(condition=(access(`artifact`,"path") == `expected`),message="child path was not converted")**.
We **_ = test.assert(condition=(fs.file_hash(path=(`root` + "/" + `expected`)) == access(`artifact`,"sha256")),message="parent path does not match real child bytes")**.
Return *[父任务能读取实际子文件](result.ok(value=`artifact`))*.

---
markup: occlusion
title: 真实智能体能力验收：计划、交付与用户隔离
import:
  sessions: ../pages/control/sessions.mq.md
  service: ../pages/control/service.mq.md
  call: ../pages/control/call.mq.md
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  uuid: lib/uuid.mq.md
  text: lib/text.mq.md
  test: capabilities.mq.md
  result: lib/result.mq.md
---

这里只使用明确的测试身份、独立任务目录和真实生产入口。主流程的模型闭环另用已授权开发模型验收；这个确定性回归不花费外部模型额度。

## office

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 专用验收会话 |
| render_pdf | bool | False | 容器内启用真实排版 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实报告产物；演示与可选 PDF 同时验证 |

Use `context` and `render_pdf`=False。调用生产入口生成两种实际文件，不在测试中手工预造成功清单。题目含 XML 特殊字符和模板占位文字，必须仍然作为普通文字保存。每种文件都经过生产 ZIP 打包与重新解包，测试再独立检查主部件、真实摘要和源稿。演示必须有母版、版式和主题，不能只有一个假 slide.xml。

The default host test avoids claiming that an office renderer is installed. The container acceptance enables render_pdf, which forces the actual newly generated DOCX and PPTX through LibreOffice. The producer must return a real PDF record and the corresponding file must exist. Neither a process exit nor a filename alone satisfies that assertion. Rendering belongs to the trusted generation pipeline; the test does not expose arbitrary uploaded-package conversion as a model tool.

Each generated version uses its production UUID directory under a dedicated owner-scoped workspace. The test does not clear existing user files or reset a database. A failure stops immediately and leaves that dedicated evidence for inspection. The returned report can be used by the planning test to prove that completion references an actual generated file.

The test output identifies a retained private session, so a failed package or permission check can be inspected without reconstructing a synthetic fixture.

The checks have different purposes. Main-part existence detects a broken package layout; escaping detects XML injection or accidental template replacement; the native digest check detects a manifest unrelated to file bytes; source existence establishes a usable preview. The optional PDF checks establish that a real office engine loaded and rendered the package. None of these checks asserts that the factual manuscript has been externally researched.

`sections` =

| @ | heading | body |
|---|---|---|
| 1 | "目标与依据" | "真实创建 <&>，保留 {{title}} 字样。\n第二段是普通文字。" |
| 2 | "验收限制" | "未联网核验外部来源，内容与排版分别检查。" |

We **report = None**.

`kinds` =

| kind |
|---|
| "docx" |
| "pptx" |

- [调用生产生成器](for kinds as kind)
  We **args = table.put(in=None,at="kind",value=`kind`)**.
  We **args = table.put(in=`args`,at="title",value="求道验收 <&> {{body}}")**.
  We **args = table.put(in=`args`,at="sections",value=`sections`)**.
  We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
  We **args = table.put(in=`args`,at="context",value=`context`)**.
  We **created = call.invoke(file=(access(`context`,"project") + "/ext/office/index.mq.md"),function="create",arguments=`args`,root=access(`context`,"project"),effects="plugin,fs.read,fs.write,process.exec,environment.read")**.
  We **_ = test.assert(condition=json.get(value=`created`,key="ok"),message=json.stringify(value=`created`))**.
  We **artifact = access(`created`,"value")**.
  We **absolute = access(`context`,"workspace") + "/"**.
  We **_ = test.assert(condition=(fs.file_hash(path=(`absolute` + access(`artifact`,"path"))) == access(`artifact`,"sha256")),message="artifact digest mismatch")**.
  We **_ = test.assert(condition=fs.exists(path=(`absolute` + access(`artifact`,"source"))),message="missing readable source")**.
  1. `kind` == "docx"
    We **report = `artifact`**.
    We **xml = fs.read_text(path=(`absolute` + "artifacts/" + access(`artifact`,"id") + "/verified/word/document.xml"))**.
    We **_ = test.assert(condition=text.contains(text=`xml`,sub="&lt;&amp;&gt;"),message="XML text not escaped")**.
  1. `kind` == "pptx"
    We **_ = test.assert(condition=fs.exists(path=(`absolute` + "artifacts/" + access(`artifact`,"id") + "/verified/ppt/slideMasters/slideMaster1.xml")),message="missing slide master")**.
  1. `render_pdf`
    We **pdf = access(`artifact`,"pdf")**.
    We **_ = test.assert(condition=fs.exists(path=(`absolute` + access(`pdf`,"path"))),message="missing rendered PDF")**.
Return *report*.

## planning

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 验收会话 |
| evidence | text | required | 实际报告路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 完成有证据，缺失文件与错误步骤被拒绝 |

Use `context` and `evidence`。测试先建立可恢复计划，然后尝试把不存在的文件写成完成依据，生产函数必须拒绝。之后使用刚刚真实生成的报告，步骤才允许完成。重新读取计划必须得到相同身份、状态和摘要，不能只验证最初调用的内存返回。

A durable plan is useful only if its completion claims survive independent reading. The evidence digest binds the step to a real file at the update time. This test distinguishes the missing-evidence failure from a successful update and then reopens the snapshot through another Marqdo call. It does not grant a completion merely because the plan creator returned a record.

The test runs with the same narrow workspace root as an agent tool. It cannot borrow a file from another task or cite an application source path as evidence. Existing production files are untouched because the session identity is freshly generated for this acceptance run. The readable Markdown plan is a projection of the structured record, not executable model source.

A blocked or running step is intentionally different from a completed one. The public contract keeps those states explicit and refuses unknown states or missing step identities. A later task can read the saved plan before continuing, while the executor retains actual tool receipts separately.

We **project = access(`context`,"project")** and **root = access(`context`,"workspace")**.
We **file = `project` + "/pages/agent/plan.mq.md"**.
We **args = json.parse(text="{\"goal\":\"验收真实交付\",\"acceptance\":\"真实文件与保存摘要一致\",\"steps\":[\"生成报告\"]}")**.
We **created = call.invoke(file=`file`,function="create",arguments=`args`,root=`root`,effects="fs.read,fs.write,random.read")**.
We **_ = test.assert(condition=access(`created`,"ok"),message="plan creation failed")**.
We **args = json.parse(text="{\"step\":1,\"status\":\"completed\",\"evidence\":\"missing-proof.md\"}")**.
We **denied = call.invoke(file=`file`,function="update",arguments=`args`,root=`root`,effects="fs.read,fs.write")**.
We **_ = test.assert(condition=(access(`denied`,"ok") == False),message="missing evidence was accepted")**.
We **args = table.put(in=`args`,at="evidence",value=`evidence`)**.
We **saved = call.invoke(file=`file`,function="update",arguments=`args`,root=`root`,effects="fs.read,fs.write")**.
We **_ = test.assert(condition=access(`saved`,"ok"),message="real evidence was rejected")**.
We **read = call.invoke(file=`file`,function="read",root=`root`,effects="fs.read")**.
We **step = access(access(`read`,"steps"),1)**.
We **_ = test.assert(condition=(access(`step`,"status") == "completed"),message="plan did not restore")**.
We **_ = test.assert(condition=(access(`step`,"sha256") == fs.file_hash(path=(`root` + "/" + `evidence`))),message="plan evidence digest mismatch")**.
Return *read*.

## authorization

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信测试上下文 |
| id | text | required | 真实报告产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 所有权与受限子任务工具均按生产边界拒绝 |

Use `context` and `id`。生成一份真实文件之后，使用另一个测试身份请求其下载，服务必须在读取文件之前拒绝。它不能仅在前端隐藏链接，也不能依靠难猜的 UUID 代替所有权检查。此测试没有伪造 OIDC Cookie，直接验证宿主之后的生产所有权服务。

The restricted-tool assertion uses the actual executor, native registry and schema preparation. A context with a read-only subset requests write_file; the call must fail rather than accept a name absent from its refreshed whitelist. This is separate from merely omitting a button or hiding a tool in the prompt. A model guessing a tool identifier receives the same execution denial.

The context itself is test-owned trusted input. In production it is injected after parameter validation, so a model cannot add a tool_ids field or owner to the public schema. The test does not mutate another user's settings, disable a shared plugin or delete any task data. It verifies a denied capability at the real boundary.

Download transport has independent native tests for bytes, invalid base64, oversized payload, filename injection and MIME header injection. This test complements those byte checks with application ownership; both boundaries must succeed for a legitimate delivery.

The positive download assertion is also necessary: a service that denies every request would pass the foreign-user check while leaving the product unusable. The actual owner must receive a native bytes record before the foreign identity is tested.

We **downloaded = service.artifact_download(session=access(`context`,"id"),id=`id`,principal=access(`context`,"owner"))**.
We **_ = test.assert(condition=(json.get(value=`downloaded`,key="ok") == True),message="owner cannot download real artifact")**.
We **_ = test.assert(condition=(access(access(`downloaded`,"data"),"_type") == "bytes"),message="download is not native binary data")**.
We **denied = service.artifact_download(session=access(`context`,"id"),id=`id`,principal="agent-acceptance-foreign")**.
We **_ = test.assert(condition=(access(`denied`,"ok") == False),message="foreign artifact access accepted")**.
We **restricted = table.put(in=`context`,at="tool_ids",value="read_file,file_info")**.
We **args = table.put(in=None,at="name",value="write_file")**.
We **args = table.put(in=`args`,at="arguments",value=json.parse(text="{\"path\":\"forbidden.md\",\"text\":\"must not be written\"}"))**.
We **args = table.put(in=`args`,at="context",value=`restricted`)**.
We **args = table.put(in=`args`,at="run_id",value=uuid.v4())**.
We **args = table.put(in=`args`,at="step",value=1)**.
We **out = call.invoke(file=(access(`context`,"project") + "/pages/agent/executor.mq.md"),function="execute",arguments=`args`,root=access(`context`,"root"),effects="plugin,fs.read,fs.write,process.exec,time.read,environment.read")**.
We **_ = test.assert(condition=(access(`out`,"ok") == False),message="restricted child wrote a file")**.
We **_ = test.assert(condition=(not fs.exists(path=(access(`context`,"workspace") + "/forbidden.md"))),message="denied mutation produced a file")**.
Return *True*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| render_pdf | bool | False | 容器启用真实排版检查 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 各生产能力真实通过的验收身份 |

Use `render_pdf`=False。创建独立 UUID 会话作为所有验收材料的容器，同一用户的当前工作区不会被替换。依次检查真实办公文件、持久计划和授权拒绝。任何断言失败都会结束测试，不让最后一个成功值掩盖之前错误。

The test is an actual Marqdo workflow. It calls the same office entry, session manager, plan functions and executor used by the product. It does not replace a backend with a mock success or use Python to manipulate fixtures. A host run can verify package generation, while a non-root container run with render_pdf=true additionally exercises the installed office engine under the production filesystem policy.

The returned session id identifies the retained evidence. Inspect it if a regression needs diagnosis. A fresh identity on each run prevents stale effect receipts or old artifacts from making a new run appear successful. The test never resets the whole SQLite database or removes unrelated workspaces.

We **id = uuid.v4()**.
We **opened = sessions.ensure(id=`id`,title="智能体能力验收",principal="agent-capability-acceptance")**.
We **_ = test.assert(condition=access(`opened`,"ok"),message="cannot create isolated acceptance session")**.
We **ctx = access(`opened`,"value")**.
We **artifact = office(context=`ctx`,render_pdf=`render_pdf`)**.
We **_ = planning(context=`ctx`,evidence=access(`artifact`,"path"))**.
We **_ = authorization(context=`ctx`,id=access(`artifact`,"id"))**.
Return *[所有断言通过才给出成功](result.ok(value=`id`))*.

---
markup: occlusion
title: 输入栏材料与分段对话的实际能力回归
import:
  service: ../pages/control/service.mq.md
  sessions: ../pages/control/sessions.mq.md
  call: ../pages/control/call.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
  test: capabilities.mq.md
---

使用专用内部验收身份创建真实任务，不伪造登录 Cookie 或 OIDC 用户。原生文件、SQLite、会话归属与控制锁照常执行；这个测试可在只读应用镜像内运行。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实上传字节、归属拒绝、知识材料与分段对话断言 |

上传是实际文件写入，不以浏览器选中文件或请求成功作为断言。验收后用同一工作目录文件根读取，确认字节精确等于 hello。另一身份即使提交同一个任务身份也必须失败，错误知识库不能转成服务器路径。任务设置 none，基础文件能力不依赖推理服务。

The task is uniquely named and owned by a dedicated internal test principal. These labels do not create authenticated accounts and cannot be used to log in to the public API. The service reserves ownership in SQLite before touching the workspace. A successful upload must produce a generated relative path under uploads, then a real native read observes the bytes saved there.

Starting through service.start exercises the actual integration of the knowledge picker, attachment paths and existing runner. The selected installed root contributes bounded source excerpts, while uploaded files contribute paths for registered tools to inspect. Job persistence must retain those references and the complete Markdown archive. The rendered history and current answer are separate fragments, allowing a stable trace region between them.

The generated test files stay in their own data-volume task. It does not overwrite a user's session, remove production history, alter native authentication records or change plugin switches. A failed assertion remains a failure, with the original Result retained for diagnosis. This test complements the deterministic browser workflow; neither substitutes for a human completing provider login.

The uploaded display name deliberately contains a parent-directory spelling and Chinese characters. It must become a generated file identity inside uploads, and the native read must use the returned relative path rather than reconstructing one from the display name. The service tests byte preservation, while the ownership denial checks that a guessed task id cannot grant access. These are application boundaries independent of the browser's disabled button.

The none-model job still performs real begin, persistence, event projection and view operations. Its answer explains that no model was run. That text must appear in answer_html and be absent from page_html for the current turn, otherwise placing the execution region between them would duplicate or reorder the response. The job's saved reference must identify actual installed documents and the actual generated upload path, proving the picker and attachment workflow affect the next task rather than decorating an unused interface.

We **principal = "composer-data-acceptance"**.
We **created = sessions.create(title=("输入栏验收 " + uuid.v4()), principal=`principal`)**.
We **_ = test.assert(condition=access(`created`,"ok"), message="cannot create isolated task")**.
We **ctx = access(`created`,"value")**.
We **id = access(`ctx`,"id")**.
We **uploaded = service.upload(name="../输入.txt", data_url="data:text/plain;base64,aGVsbG8=", session=`id`, epoch=7, principal=`principal`)**.
We **_ = test.assert(condition=access(`uploaded`,"ok") and access(`uploaded`,"epoch") == "7" and access(`uploaded`,"session") == `id`, message=json.stringify(value=`uploaded`))**.
We **read = call.invoke(file=(access(`ctx`,"project") + "/lib/fs.mq.md"), function="read_text", arguments=table.put(in=None, at="path", value=access(`uploaded`,"value")), root=access(`ctx`,"workspace"), effects="fs.read")**.
We **_ = test.assert(condition=`read` == "hello", message="uploaded bytes differ")**.
We **denied = service.upload(name="denied.txt", data_url="data:text/plain;base64,aGVsbG8=", session=`id`, principal="composer-data-other")**.
We **_ = test.assert(condition=not access(`denied`,"ok"), message="cross-owner upload accepted")**.
We **invalid = service.start(session=`id`, q="参考测试", kb="../invalid", principal=`principal`)**.
We **_ = test.assert(condition=not access(`invalid`,"ok"), message="invalid knowledge root accepted")**.
We **out = service.start(session=`id`, q="阅读上传与知识材料", model="none", gen=1, kb="qdagent", principal=`principal`)**.
We **_ = test.assert(condition=access(`out`,"ok") and access(`out`,"done") and access(`out`,"answer_html") != "", message=json.stringify(value=`out`))**.
We **_ = test.assert(condition=text.contains(text=access(`out`,"page_html"), sub="阅读上传与知识材料") and not text.contains(text=access(`out`,"page_html"), sub="当前未选择模型"), message="current answer leaked into history projection")**.
We **job = fs.read_json(path=("data/sessions/" + `id` + "/data/dialogue/proj/job.json"))**.
We **reference = access(`job`,"reference")**.
We **_ = test.assert(condition=text.contains(text=`reference`, sub="出处：pages/kb/qdagent/") and text.contains(text=`reference`, sub=access(`uploaded`,"value")), message="selected materials missing from actual job")**.
Return *[实际能力和分段阅读通过](result.ok(value="真实上传 / 精确字节 / 跨身份拒绝 / 知识来源 / 问题与回答分区"))*.

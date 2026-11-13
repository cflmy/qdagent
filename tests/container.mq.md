---
markup: occlusion
title: Docker 内的真实能力回归
import:
  service: ../pages/control/service.mq.md
  sessions: ../pages/control/sessions.mq.md
  store: ../ext/qdagent/store.mq.md
  call: ../pages/control/call.mq.md
  test: capabilities.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  uuid: lib/uuid.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

从已运行容器的管理员终端调用。本测试不注入登录 Cookie、不模拟身份站用户；它使用只属于内部验收的两个 principal，真实检查文件、SQLite 与工作区程序。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实容器、身份与数据库回归 |

两个验收身份的任务都经过正常会话控制器创建，不能看到对方任务。普通模型设为 none，避免把模型速度当作基础能力的断言。工具执行通过同一个可信分发器和实际 marqdo call，源码根保持只读。The test does not create an authenticated session or a hidden account. Its internal task records are not reachable by real OIDC subjects. All artifacts stay in the persistent application data volume, and database assertions inspect actual message rows rather than a pre-filled success marker.


This regression runs inside the actual container user, not a host process pretending to have the same permissions. The application root stays read-only throughout. Creating task directories, writing files and updating SQLite must therefore succeed through the mounted data volume and the existing native capabilities. No temporary argument file may be created beside the application source.

Two dedicated principals establish distinct default task identities. The test then deliberately requests A's task as B and expects the normal service to deny it before exposing a directory or a transcript. The identities are test labels used by the administrator terminal, not sessions issued by the provider. They cannot authenticate a request to the public API and are invisible to actual OIDC subjects.

The tool exercise uses the trusted registry, native schema validation, live plugin permission and actual marqdo call boundary. It writes a small program into A's workspace and executes that program through run_marqdo. The observed value must be five. A code fence, a stored expected value or a final sentence saying it worked cannot satisfy this assertion.

The read_library assertion uses the registered tool's own effect set. Library reading can consult SQLite authorization, so the internal metadata dependency must be declared even though it does not grant the model an arbitrary writer. This catches an otherwise subtle integration failure where the standard library existed but the model could not read any manual because authorization initialization was denied.

The conversation exercise uses model none so basic persistence does not depend on inference latency or model quality. It still enters the real per-task control lock, creates a Markdown turn, records actual lifecycle events and updates SQLite. A later query checks that a message row exists under the same task id. File exports alone are not sufficient evidence of database persistence.

All assertions stop on their first actual failure. Do not insert a signed-in cookie, mutate the native authentication session table or pre-fill a success marker to make them pass. Separate native tests verify cryptographic and request-identity boundaries, and the real login redirect verifies the deployed provider configuration. These are complementary checks, not substitutes for a human completing login at the identity site.

The terminal invokes normal application services rather than bypassing filesystem checks. Passing on the host alone is insufficient: the same regression is executed as the container's non-root user after the image is rebuilt.

We **a = [第一身份的真实状态](service.state(principal="container-acceptance-a"))**.
We **b = [第二身份的真实状态](service.state(principal="container-acceptance-b"))**.
We **_ = test.assert(condition=access(`a`,"ok") and access(`b`,"ok") and access(`a`,"session") != access(`b`,"session"), message="principal isolation failed")**.
We **denied = [不能选择别人的任务](service.state(session=access(`a`,"session"), principal="container-acceptance-b"))**.
We **_ = test.assert(condition=not access(`denied`,"ok"), message="cross-principal task access accepted")**.
We **opened = sessions.ensure(id=access(`a`,"session"), principal="container-acceptance-a")**.
We **context = access(`opened`,"value")**.
We **project = sys.cwd()**.
We **target = `project` + "/pages/agent/executor.mq.md"**.
We **root = access(`context`,"root")**.
We **run_id = uuid.v4()**.

`arguments` =

| name | arguments | context | run_id | step |
|---|---|---|---|---|
| "write_file" | None | `context` | `run_id` | 1 |

We **payload = table.put(in=table.put(in=None, at="path", value="container-proof.mq.md"), at="text", value="## run\n\nReturn *2 + 3*.\n")**.
We **arguments = table.put(in=`arguments`, at="arguments", value=`payload`)**.
We **written = [真实容器文件操作](call.invoke(file=`target`, function="execute", arguments=`arguments`, root=`root`, effects="plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read"))**.
We **_ = test.assert(condition=access(`written`,"ok"), message=json.stringify(value=`written`))**.
We **arguments = table.put(in=`arguments`, at="name", value="run_marqdo")**.
We **arguments = table.put(in=`arguments`, at="arguments", value=table.put(in=None, at="path", value="container-proof.mq.md"))**.
We **arguments = table.put(in=`arguments`, at="step", value=2)**.
We **ran = [实际执行工作区程序](call.invoke(file=`target`, function="execute", arguments=`arguments`, root=`root`, effects="plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read"))**.
We **_ = test.assert(condition=access(`ran`,"ok") and access(`ran`,"value") == 5, message=json.stringify(value=`ran`))**.
We **arguments = table.put(in=`arguments`, at="name", value="read_library")**.
We **arguments = table.put(in=`arguments`, at="arguments", value=table.put(in=None, at="module", value="fs"))**.
We **arguments = table.put(in=`arguments`, at="step", value=3)**.
We **manual = [数据库授权下仍能读库](call.invoke(file=`target`, function="execute", arguments=`arguments`, root=`root`, effects="plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read"))**.
We **_ = test.assert(condition=access(`manual`,"ok"), message=json.stringify(value=`manual`))**.

`start` =

| q | model | gen |
|---|---|---|
| "**Markdown**\n\n1. 容器实际任务" | "none" | 91 |

We **finished = [真实控制与归档](service.dispatch(session=access(`a`,"session"), member="begin", arguments=`start`, principal="container-acceptance-a"))**.
We **_ = test.assert(condition=access(`finished`,"ok") and access(`finished`,"done"), message=json.stringify(value=`finished`))**.
We **rows = [消息真实进入 SQLite](store.query(sql="SELECT COUNT(*) AS n FROM qd_messages WHERE task_id=?", args=table.append(list=table.empty_list(), item=access(`a`,"session"))))**.
We **_ = test.assert(condition=access(access(`rows`,1),"n") > 0, message="message missing from SQLite")**.
Return *[容器中实际能力通过](result.ok(value="principals / cross-owner denial / real file / marqdo call / library / Markdown / SQLite"))*.





## begin_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| model | text | "qwen3.5:4b-q4_K_M" | 现有模型名 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 受控后台任务已启动；不代表模型已完成 |

Use `model`="qwen3.5:4b-q4_K_M"。本入口仅供管理员容器终端验收，使用不对应真实 OIDC 用户的专用 principal，不建立登录 Cookie。任务需要真正调用 write_file，结果与 SQLite 事件由后续读取确认；不会预置文件或直接写入预期答案。

The existing model runs outside this container through the configured gateway. Starting this job verifies the actual workflow lifecycle in a read-only application image. The dedicated identity isolates its files from real users and cannot authenticate a browser.


We **principal = "container-model-acceptance"**.
We **state = service.state(principal=`principal`)**.

`args` =

| q | model | gen |
|---|---|---|
| "调用 write_file 创建 docker-model-proof.md，text 精确为「Docker中的Marqdo真实调用」。必须先获得工具成功结果再简短确认。" | `model` | 1 |

Return *[实际启动 Docker 中的工作流](service.dispatch(session=access(`state`,"session"), member="begin", arguments=`args`, principal=`principal`))*.


## poll_model

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实模型任务的有界摘要 |

只读取专用测试任务，不再次请求模型。返回实际生命周期和事件状态，详细 SQL 与文件可通过管理员原生工具另查。This avoids flooding the terminal with a full rendered page and keeps model availability separate from authenticated browser login. An unsuccessful task remains unsuccessful.


Polling is a read of already recorded execution. It must never reserve a new mutation, restart the model or replace an interrupted effect receipt with a success. The short summary is intentionally separate from the full Markdown page. Administrators can inspect the dedicated workspace artifact and SQLite event rows if the model reports completion. This test identity does not grant access to any production user task or authentication session.

We **state = service.state(principal="container-model-acceptance")**.
We **out = service.dispatch(session=access(`state`,"session"), member="poll", arguments=table.put(in=None, at="gen", value=1), principal="container-model-acceptance")**.
We **cards = json.get(value=`out`, key="trace_cards")**.
We **result = table.put(in=None, at="ok", value=json.get(value=`out`,key="ok"))**.
We **result = table.put(in=`result`, at="status", value=json.get(value=`out`,key="status"))**.
We **result = table.put(in=`result`, at="done", value=json.get(value=`out`,key="done"))**.
Return *[只投影真实观察](table.put(in=`result`, at="steps", value=table.len(xs=`cards`)))*.


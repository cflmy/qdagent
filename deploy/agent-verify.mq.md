---
markup: occlusion
title: 容器内真实模型闭环验收
import:
  service: ../pages/control/service.mq.md
  sessions: ../pages/control/sessions.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
  test: ../tests/capabilities.mq.md
---

这份验收同样是可执行开发手册。CLI 调用 start、status、audit 即可，不需要冗长的临时命令，也不需要 Python 或另一套智能体脚本。

## start

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | required | 开发身份的实际模型配置 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 后台任务身份；不打印大型工具输出或模型配置 |

Use `selection`。这是固定开发身份的本地验收入口，不是 HTTP 路由或模型工具。它在 Docker 内使用真实 USTC 配置，要求生成报告、演示和 PDF，并实际委托子智能体。任务按正常后台进程运行，不由轮询推动。默认测试目标明确说明内容没有外部事实核验。

A started task is not a completed acceptance run. Use status to inspect the real job, files and plan, then audit only after it has finished. The selected model id is public configuration identity; the encrypted credential stays in the trusted resolver. This helper never reads or returns a private model configuration and does not forge an authenticated web session.

The dedicated task owner keeps paid development access separate from ordinary users. Rebuilding the application retains its data volume, so the test can reopen and inspect an existing run. Starting while the same test task is still busy follows the ordinary busy rejection rather than overwrite its job or receipts.

We **generation = time.now_ms()**.
We **out = service.start(session="agent-container-acceptance-v1",principal="agent-development",gen=`generation`,model=`selection`,q="立即完成真实任务，第一步调用 plan_task，不要先回复我将执行。主题：可执行文档与智能体。验收要求：1、建立可恢复计划；2、委托 reviewer 基于本句自包含材料复核验收标准；3、委托 writer 使用 create_office 创建三节 DOCX，每节60字以内，render_pdf=true；4、父任务创建三节 PPTX，每节60字以内，render_pdf=true；5、每步 update_plan 提供实际 evidence 文件；6、最后列出真实文件，并说明未联网、内容未外部核验。撰写子任务材料必须自包含并明确要求实际调用工具，不接受只承诺未来的答文。所有行动使用已登记 Marqdo 工具。")**.
1. not json.get(value=`out`,key="ok")
  Return *out*.
We **summary = table.put(in=None,at="session",value=json.get(value=`out`,key="session"))**.
We **summary = table.put(in=`summary`,at="status",value=json.get(value=`out`,key="status"))**.
We **summary = table.put(in=`summary`,at="gen",value=`generation`)**.
Return *[只报告实际启动信息](result.ok(value=`summary`))*.

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 有界真实进度、计划和产物清单 |

这个入口只观察已有运行。它通过生产服务进行一次正常 poll，使意外退出能被既有控制器识别；不会联系模型或重复工具。输出选择状态、计划和真实文件元数据，避免完整模型与工具记录挤满终端。详细记录仍保存在对应任务档案，可按需阅读。

A status read must remain read-only with respect to agent actions. Normal lifecycle reconciliation may classify a worker that already exited, but the helper does not schedule another task. The owner is fixed to the development identity, so it cannot inspect arbitrary user sessions. File metadata comes from the actual manifest in that session's workspace.

The summary is deliberately bounded; detailed per-step observations stay in the private task archive and can be inspected separately when needed.

The public summary contains no encrypted credential, decrypted configuration or request header. A completed status is still followed by explicit audit checks. Showing a green task badge alone is insufficient if files are missing, a plan is unfinished or no child actually performed its delegated writing.

We **out = service.dispatch(session="agent-container-acceptance-v1",member="poll",principal="agent-development")**.
We **opened = sessions.ensure(id="agent-container-acceptance-v1",principal="agent-development")**.
We **ctx = access(`opened`,"value")**.
We **summary = table.put(in=None,at="done",value=json.get(value=`out`,key="done"))**.
We **summary = table.put(in=`summary`,at="status",value=json.get(value=`out`,key="status"))**.
We **summary = table.put(in=`summary`,at="events",value=table.len(xs=json.get(value=`out`,key="trace_cards")))**.
We **root = access(`ctx`,"workspace")**.
1. fs.exists(path=(`root` + "/.agent/plan.json"))
  We **summary = table.put(in=`summary`,at="plan",value=fs.read_json(path=(`root` + "/.agent/plan.json")))**.
1. fs.exists(path=(`root` + "/.agent/artifacts.json"))
  We **summary = table.put(in=`summary`,at="artifacts",value=fs.read_json(path=(`root` + "/.agent/artifacts.json")))**.
Return *summary*.

## audit

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际完整验收通过；任一断言失败立即结束 |

验收读取真实计划和产物，再独立计算每个文件的 SHA-256。需要同时存在 DOCX、PPTX 和至少两份 PDF，而不是一个带错扩展名的文件。计划所有步骤必须完成，子任务清单必须记录真实委托。这些材料来自正常服务执行，不在验收函数中补写成功记录。

The audit makes several independent assertions. The run must already be terminal and succeeded. Every planned step must have reached completed through its normal evidence path. Files must exist and match their recorded digests. Both editable office formats and rendered PDF deliveries must be present. A fluent final answer cannot satisfy those assertions on its own.

The child-role check requires a completed review and a completed writer with its own actual artifact manifest. Two arbitrary handoff messages are insufficient. The writer runs in an isolated directory and its generated file is then imported into the parent delivery list. This distinguishes real delegated creation from a parent doing everything after a child merely promised future work.

The model may choose extra legitimate file reads or checks, so the audit does not require an exact event count or a fixed sequence of internal decisions. It checks observable deliverables and explicit plan outcomes instead. The deterministic capability suite separately covers ownership rejection and restricted tool execution, while native Web tests cover binary transport and credential boundaries.

The result does not certify external research or every factual sentence in the manuscript. This task deliberately forbids networking for content sources and requires a disclosure of that limit. Its purpose is to prove that planning, delegation, office generation, rendering and delivery are connected into a real Marqdo execution flow inside the deployed non-root environment.

We **snapshot = status()**.
We **_ = test.assert(condition=(json.get(value=`snapshot`,key="done") == True and json.get(value=`snapshot`,key="status") == "succeeded"),message="real model workflow has not succeeded")**.
We **plan = access(`snapshot`,"plan")** and **steps = access(`plan`,"steps")**.
- [每一步的完成都保留依据](for steps as step)
  We **_ = test.assert(condition=(access(`step`,"status") == "completed"),message="unfinished plan step")**.
We **opened = sessions.ensure(id="agent-container-acceptance-v1",principal="agent-development")**.
We **root = access(access(`opened`,"value"),"workspace")**.
We **entries = access(`snapshot`,"artifacts")**.
We **docx = 0** and **pptx = 0** and **pdf = 0**.
- [独立核对每个真实文件](for entries as entry)
  We **_ = test.assert(condition=(fs.file_hash(path=(`root` + "/" + access(`entry`,"path"))) == access(`entry`,"sha256")),message="artifact changed or missing")**.
  1. access(`entry`,"kind") == "docx"
    We **docx = `docx` + 1**.
  1. access(`entry`,"kind") == "pptx"
    We **pptx = `pptx` + 1**.
  1. access(`entry`,"kind") == "pdf"
    We **pdf = `pdf` + 1**.
We **_ = test.assert(condition=(`docx` >= 1 and `pptx` >= 1 and `pdf` >= 2),message="missing editable or rendered deliverables")**.
We **children = fs.read_json(path=(`root` + "/.agent/children.json"))**.
We **reviewed = False** and **written = False**.
- [两种角色都必须真实完成](for children as child)
  1. access(`child`,"status") == "succeeded" and access(`child`,"role") == "reviewer"
    We **reviewed = True**.
  1. access(`child`,"status") == "succeeded" and access(`child`,"role") == "writer"
    We **written = fs.exists(path=(`root` + "/.agent/children/" + access(`child`,"id") + "/work/.agent/artifacts.json"))**.
We **_ = test.assert(condition=(`reviewed` and `written`),message="missing actual review or child writing artifacts")**.
Return *[真实文件与计划全部通过](result.ok(value=`snapshot`))*.

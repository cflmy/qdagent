---
markup: occlusion
title: 任务计划：验收、步骤和可恢复的证据
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  uuid: lib/uuid.mq.md
---

任务目标、验收标准与完成依据都是真实工作材料。此模块在当前任务工作根调用，所有文件能力使用原生标准库，任何模型文字都不能自己成为成功凭证。

## read

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前计划；不存在时返回空记录 |

计划与聊天是不同的材料。重新打开任务应能读到同一份步骤和验收要求，而不是让模型从上一句答案猜测进度。这个只读入口不创建计划，不修改状态，也不把文件缺失解释为已经完成。工作根由执行器授予，模型不能指定其他会话。

1. fs.exists(path=".agent/plan.json")
  Return *[恢复真实计划](fs.read_json(path=".agent/plan.json"))*.
Return *[还没有计划](table.empty_map())*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| goal | text | required | 具体目标 |
| acceptance | text | required | 用户可以核验的完成标准 |
| steps | list | required | 一至十二条自然语言步骤 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实计划记录，保存 JSON 与可读 Markdown |

Use `goal`, `acceptance` and `steps`。先说明完成意味着什么，再把工作拆成少量可执行的步骤。这里只创建待办，不能通过规划声明操作成功。每次计划有独立身份，旧版本仍保留以便追查。步骤使用普通文字，任务执行通过登记工具，计划内容不能扩展插件或文件权限。

For example, a report task can separate source review, manuscript creation and delivery checks. Acceptance should name what another person can inspect: the expected file formats, required sections and evidence limitations. A plan title is not a filename. Keep steps small enough that one can explain its outcome and cite a resulting file. Creating a new plan preserves its own archived snapshot and does not erase the files produced under an earlier plan.

1. table.len(xs=`steps`) < 1 or table.len(xs=`steps`) > 12 or `goal` == "" or `acceptance` == ""
  Return *[需要有界可验收计划](result.error(code="qdagent.plan", message="目标、验收与一至十二步均必填", operation="create"))*.
We **rows = [建立待办清单](table.empty_list())** and **n = 0**.
- [每一步都先是待办](for steps as item)
  We **n = `n` + 1**.
  We **row = table.put(in=None, at="id", value=`n`)**.
  We **row = table.put(in=`row`, at="title", value=str(`item`))**.
  We **row = table.put(in=`row`, at="status", value="pending")**.
  We **row = table.put(in=`row`, at="evidence", value="")**.
  We **rows = table.append(list=`rows`, item=`row`)**.
We **plan = table.put(in=None, at="id", value=uuid.v4())**.
We **plan = table.put(in=`plan`, at="goal", value=`goal`)**.
We **plan = table.put(in=`plan`, at="acceptance", value=`acceptance`)**.
We **plan = table.put(in=`plan`, at="steps", value=`rows`)**.
We **_ = [保存可恢复任务](persist(plan=`plan`))**.
Return *[待办不冒充完成](result.ok(value=`plan`))*.

## update

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| step | number | required | 计划中的步骤序号 |
| status | text | required | running、blocked 或 completed |
| evidence | text | "" | 完成时必须给出工作根内真实文件 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 更新后的计划或明确的证据错误 |

Use `step`, `status` and `evidence`=""。只有既有步骤能够推进，未登记的序号不能凭空成为完成记录。完成必须引用实际存在的普通文件，并记录其摘要；报告中的结论仍需阅读和复核，文件存在并不保证内容正确。阻塞和执行中保留事实，不会自动推进其他步骤。

A completed step is a claim with an evidence reference. This operation checks that the referenced file currently exists and records its actual digest, so later changes can be detected by a reviewer. It does not infer that the file proves the entire user request. A research handoff, a generated manuscript and a validation report are different kinds of evidence. Choose the relevant one rather than citing an arbitrary placeholder. If the work is blocked, keep the step blocked and explain the missing input in the conversation. Running and blocked updates do not certify an output. An unknown step or status fails without replacing the current plan.

We **plan = [恢复当前约定](read())**.
1. not `plan`
  Return *[先建立计划](result.error(code="qdagent.plan_missing", message="请先 plan_task", operation="update"))*.
1. `status` != "running" and `status` != "blocked" and `status` != "completed"
  Return *[拒绝未知状态](result.error(code="qdagent.plan_status", message=`status`, operation="update"))*.
We **digest = ""**.
1. `status` == "completed"
  1. `evidence` == "" or not fs.exists(path=`evidence`)
    Return *[完成需要真实依据](result.error(code="qdagent.plan_evidence", message="请给出已生成文件", operation="update"))*.
  1. not access(fs.stat(path=`evidence`),"is_file")
    Return *[目录不是交付依据](result.error(code="qdagent.plan_evidence", message=`evidence`, operation="update"))*.
  We **digest = [固定当时文件内容](fs.file_hash(path=`evidence`))**.
We **rows = table.empty_list()** and **found = False**.
We **existing = access(`plan`,"steps")**.
- [只更新选定一步](for existing as row)
  1. access(`row`,"id") == `step`
    We **found = True**.
    We **row = table.put(in=`row`,at="status",value=`status`)**.
    We **row = table.put(in=`row`,at="evidence",value=`evidence`)**.
    We **row = table.put(in=`row`,at="sha256",value=`digest`)**.
  We **rows = table.append(list=`rows`,item=`row`)**.
1. not `found`
  Return *[拒绝不存在的步骤](result.error(code="qdagent.plan_step",message=str(`step`),operation="update"))*.
We **plan = table.put(in=`plan`,at="steps",value=`rows`)**.
We **_ = [保存实际状态](persist(plan=`plan`))**.
Return *[返回可恢复状态](result.ok(value=`plan`))*.

## persist

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| plan | map | required | 可信入口组装的计划 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 原子保存完成 |

Use `plan`。结构化快照用于恢复，Markdown 供人和模型直接阅读。每个计划保留独立版本，当前入口只是同一内容的投影。这不是跨文件事务；中途失败应报告写入错误，不能宣布整份任务完成。正文只保存数据，不把用户目标插入可执行表达式，后续读取也不执行此文件。

The current JSON and readable manuscript serve different readers. Resume logic reads the structured snapshot; a human can read the Markdown without learning runtime syntax. Keeping a version path makes an earlier agreement inspectable. Neither file is evaluated as model-supplied program source.

We **_ = [准备计划档案](fs.make_dirs(path=".agent/plans"))**.
We **body = "# " + access(`plan`,"goal") + "\n\n验收：" + access(`plan`,"acceptance") + "\n\n"**.
We **existing = access(`plan`,"steps")**.
- [让执行约定直接可读](for existing as row)
  We **body = `body` + "- " + str(access(`row`,"id")) + ". [" + access(`row`,"status") + "] " + access(`row`,"title") + "；依据：" + access(`row`,"evidence") + "\n"**.
We **_ = [保留计划版本](fs.write_json(path=(".agent/plans/" + access(`plan`,"id") + ".json"), value=`plan`))**.
We **_ = [当前计划原子更新](fs.write_json(path=".agent/plan.json", value=`plan`))**.
Return *[可读计划与数据一致](fs.atomic_write(path=".agent/plan.md", text=`body`))*.

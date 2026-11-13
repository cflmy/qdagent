---
markup: occlusion
title: 任务工作台：计划、子任务和文件交付
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  ui: ui.mq.md
  component: ext/web/component/index.mq.md
  hash: lib/hash.mq.md
  math: lib/math.mq.md
  web: ext/web/web.mq.md
---

工作台不新增第二个文件系统。读写都在已经授权的任务根，HTML 由既有原生组件生成，Office 二进制经现有 bytes 记录和受控响应边界交付。

## list

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前工作根已登记的真实产物 |

产物清单只描述文件事实，不执行其中的内容。文件来自相同任务工作根，其他用户和会话没有通过这个入口读取的路径。没有清单返回空列表，不给用户制造一个虚假的示例报告。二进制文件的下载还会再次核对文件摘要，以识别生成以后发生的改变。

1. fs.exists(path=".agent/artifacts.json")
  Return *[读取实际文件登记](fs.read_json(path=".agent/artifacts.json"))*.
Return *[还没有交付文件](table.empty_list())*.

## download

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 不透明产物身份 |
| format | text | "binary" | binary 或 source |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 有界字节、固定内容类型与安全文件名 |

Use `id` and `format`="binary"。HTTP 服务先核对会话所有权，才会在该会话工作根调用此函数。请求只能选择已登记的产物身份和源稿类型，不能提交服务器路径。二进制下载核对生成时摘要，文件消失或被改动就明确失败。当前基础文本产物上限一 MiB；更大的交付需增加独立的流式 ABI，而不是扩大所有 HTTP 请求限制。

The function returns native bytes, not a public filesystem URL or a shared static directory. The generic Web response adapter handles transport only. It neither resolves an owner nor chooses a file. The Marqdo controller supplies the fixed MIME type and attachment name after reading an owner-scoped manifest. An unsupported format is a failure rather than a path fallback. Downloading source is a separate explicit choice; no manuscript or private model configuration is automatically exposed.

The byte boundary deliberately refuses an unknown artifact rather than searching by filename. A user can retain several versions with the same title, and the opaque identity selects the exact version. Source download is UTF-8 Markdown; the binary keeps its actual office MIME type. Neither choice makes model content executable in the application.

1. `format` != "binary" and `format` != "source"
  Return *[拒绝未知交付类型](result.error(code="artifact.format",message=`format`,operation="download"))*.
We **entries = list()**.
- [身份只从实际登记匹配](for entries as entry)
  1. access(`entry`,"id") == `id`
    We **path = access(`entry`,"path")** and **mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"**.
    1. access(`entry`,"kind") == "pptx"
      We **mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"**.
    1. `format` == "source"
      We **path = access(`entry`,"source")** and **mime = "text/markdown; charset=utf-8"**.
    1. not fs.exists(path=`path`)
      Return *[文件已经不存在](result.error(code="artifact.missing",message=`id`,operation="download"))*.
    1. `format` == "binary" and fs.file_hash(path=`path`) != access(`entry`,"sha256")
      Return *[内容变化必须重新核验](result.error(code="artifact.changed",message=`id`,operation="download"))*.
    We **filename = "document." + access(`entry`,"kind")**.
    1. access(`entry`,"kind") == "pdf"
      We **mime = "application/pdf"**.
    1. access(`entry`,"kind") == "md"
      We **mime = "text/markdown; charset=utf-8"**.
    1. `format` == "source"
      We **filename = "source.md"**.
    We **out = table.put(in=None,at="ok",value=True)**.
    We **out = table.put(in=`out`,at="filename",value=`filename`)**.
    We **out = table.put(in=`out`,at="content_type",value=`mime`)**.
    Return *[实际读取之后才交付字节](table.put(in=`out`,at="data",value=fs.read_bytes(path=`path`,max_bytes=1048576)))*.
Return *[未知产物不可访问](result.error(code="artifact.unknown",message=`id`,operation="download"))*.

## preview

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 已登记的产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安全 Markdown 源稿的阅读页面 |

Use `id`。预览阅读保留的 Markdown 源稿，它是可编辑的内容预览，不冒充 Office 应用的像素级版式。原始 HTML 由现有 Markdown 渲染器过滤，内容不会作为 Marqdo 代码运行。服务入口仍先验证会话归属，函数只在当前工作根读取真实登记的材料。未知身份返回普通提示，不回显服务器路径。

The preview is a complete document page with the same paper, typography and Markdown treatment as the conversation. It loads stylesheet declarations only and does not mount an agent client or execute the manuscript. Titles remain escaped text. Opening a preview cannot write a file, change a plan, invoke a tool or reveal a model configuration. The original editable file and optional PDF remain separate downloads for their respective purposes.

We **entries = list()**.
- [只预览实际登记文稿](for entries as entry)
  1. access(`entry`,"id") == `id`
    We **body = [源稿只作为 Markdown 阅读](fs.read_text(path=access(`entry`,"source")))**.
    We **nodes = component.asset(url="/static/generated/qd-task.css",kind="stylesheet")**.
    We **nodes = table.concat(a=`nodes`,b=component.asset(url="/static/generated/theme.css",kind="stylesheet"))**.
    We **nodes = table.concat(a=`nodes`,b=component.markdown(text=("> 内容预览 · 最终 Office 排版请下载查看。\n\n" + `body`),style="qd-markdown"))**.
    We **page = web.page(title=access(`entry`,"title"),nodes=ui.region(children=`nodes`,style="qd-artifact-preview"))**.
    We **page = table.put(in=`page`,at="body_class",value="reader-page")**.
    Return *[完整页面复用同构阅读样式](web.render(doc=`page`))*.
Return *[不存在就明确提示](ui.markdown(source="未找到可预览文稿。"))*.

## snapshot

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | required | 可信会话身份 |
| terminal | bool | False | 父作业是否已经结束 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安全的任务工作台片段与内容摘要 |

Use `session` and `terminal`=False。计划、子任务和交付文件在对话附近组成工作台。所有状态都来自保存的真实材料，而不是从模型答案中提取“已完成”几个字。没有材料时隐藏空工作台。页面只在内容摘要变化时更新这块，轮询的其余更新不会重建用户正在阅读的工具详情。

A parent task can display several kinds of evidence at once: a durable plan describes intended work, a child record describes delegated work, and an artifact manifest describes actual generated files. These are intentionally separate facts. A completed child is not automatically a completed parent, and a file digest does not establish that every factual statement in the document is correct. The UI labels these boundaries rather than inventing a universal progress percentage.

The existing component renderer escapes titles and status labels. Download and preview links contain only generated task and artifact identities, encoded as URL query data after the server resolves ownership. The browser never receives a server filesystem path. The manuscript remains ordinary Markdown and no model-generated function is executed by opening the workbench.

For example, a failed research child can appear beside an unfinished report step and a successfully generated presentation. These states should remain distinct. The interface keeps the completed file downloadable without painting the whole task as successful. A user who cancels a parent can still inspect the existing manuscript and tool receipts. A child without a terminal record is shown as interrupted when the parent has ended; polling cannot manufacture a successful result for it.

The links are intentional operations: content preview reads the Markdown manuscript, binary download returns the real editable file, and source download preserves the material for later revision. This small set avoids embedding raw package XML in the conversation. It also avoids forcing a user to understand local filesystem paths. Files remain private session data, and the existing authenticated endpoint verifies the same ownership for every operation.

We **nodes = table.empty_list()**.
1. fs.exists(path=".agent/plan.json")
  We **plan = fs.read_json(path=".agent/plan.json")**.
  We **nodes = table.concat(a=`nodes`,b=plan_card(plan=`plan`))**.
1. fs.exists(path=".agent/children.json")
  We **children = fs.read_json(path=".agent/children.json")**.
  - [子任务展示真实状态](for children as child)
    We **child_status = access(`child`,"status")**.
    1. `terminal` and `child_status` == "running"
      We **child_status = "interrupted"**.
    We **line = access(`child`,"role") + " · " + `child_status` + " · " + access(`child`,"goal")**.
    We **nodes = table.concat(a=`nodes`,b=ui.text_node(text=`line`,style=("qd-child-task is-" + `child_status`)))**.
We **entries = list()** and **deliveries = table.empty_list()**.
- [每份文件有独立交付操作](for entries as entry)
  We **label = access(`entry`,"title")**.
  We **bytes = access(`entry`,"bytes")** and **size = str(access(`entry`,"bytes")) + " B"**.
  1. `bytes` >= 1024
    We **size = str(math.floor(value=(`bytes` / 1024))) + " KB"**.
  1. `bytes` >= 1048576
    We **tenths = math.floor(value=(`bytes` / 104857.6))**.
    We **megabytes = `tenths` / 10**.
    We **size = str(`megabytes`) + " MB"**.
  We **meta = ui.text_node(text=(text.to_upper(text=access(`entry`,"kind")) + " · " + `size`),style="qd-artifact-meta")**.
  We **heading = ui.text_node(text=`label`,style="qd-artifact-title")**.
  We **base = "?session=" + `session` + "&id=" + access(`entry`,"id")**.
  We **links = ui.button(text="阅读文稿",data_id=access(`entry`,"id"),style="qd-artifact-preview qd-artifact-link")**.
  We **links = table.concat(a=`links`,b=component.element(kind="link",value="下载文件",attrs=table.put(in=None,at="href",value=("/api/artifact_download" + `base`)),style="qd-artifact-link"))**.
  We **links = table.concat(a=`links`,b=component.element(kind="link",value="Markdown 源稿",attrs=table.put(in=None,at="href",value=("/api/artifact_download" + `base` + "&format=source")),style="qd-artifact-link"))**.
  We **card = ui.region(children=table.concat(a=`heading`,b=table.concat(a=`meta`,b=`links`)),style=("qd-artifact-card is-" + access(`entry`,"kind")))**.
  We **deliveries = table.concat(a=`deliveries`,b=`card`)**.
1. table.len(xs=`deliveries`) > 0
  We **nodes = table.concat(a=`nodes`,b=ui.region(children=`deliveries`,style="qd-deliverables"))**.
We **body = ""**.
1. table.len(xs=`nodes`) > 0
  We **body = ui.render(nodes=ui.region(children=`nodes`,style="qd-workbench-content"))**.
Return *[摘要让轮询保留未变化节点](table.put(in=table.put(in=None,at="html",value=`body`),at="digest",value=hash.sha256(text=`body`)))*.


## plan_card

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| plan | map | required | 真实保存的计划 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 步骤计数、原生进度和状态列表 |

Use `plan`。计数只来自真实步骤的终态，进度表示完成的计划项数量，不代表任务正确率或模型思考完成比例。没有计划就不创建卡片。每个步骤保留原身份、标题和状态，失败项不能被算进完成数。验收说明仍可阅读，不能为了外观把证据要求隐藏掉。

The count comes from durable step records rather than elapsed time, token count or reassuring answer text. A progress bar represents completed entries out of the current plan's entries. It cannot imply that a document was fact-checked or that a failed child succeeded. An unfinished plan can coexist with a downloadable file. The goal and acceptance criterion remain separate from the count, so a user can inspect what completion actually requires.

The native container exposes progressbar semantics and numeric ARIA values. A bounded static percentage class controls its visual fill because this installed component ABI does not support a progress value attribute. The component renderer escapes all labels. Step numbering is display data, not executable syntax. Collapsing the list only changes reading space; it never changes a step status or calls a worker. The snapshot digest prevents ordinary unchanged polls rebuilding the card, while real plan changes are reflected honestly.

A saved plan may contain a mix of pending, running and completed steps. Completed, succeeded and done are recognized terminal success labels for compatibility with existing records. Other states remain visible and uncounted. There is no synthesized timer progress, automatic completion, hidden source execution or implication that the producer's self-report replaces real evidence. Existing acceptance checks continue to control how the plan file is written.

The plan card has distinct native blocks for its heading, count, optional collapse control, progress and step list. This keeps layout readable at variable panel widths and gives the same raw facts to the main conversation and any summary view. The inspector does not duplicate these controls; it remains a file-reading surface.

We **steps = access(`plan`,"steps")** and **completed = 0** and **items = table.empty_list()**.
- [只按真实状态计算](for steps as step)
  We **status = access(`step`,"status")**.
  1. `status` == "completed" or `status` == "succeeded" or `status` == "done"
    We **completed = `completed` + 1**.
  We **line = str(access(`step`,"id")) + ". " + access(`step`,"title")**.
  We **items = table.concat(a=`items`,b=ui.text_node(text=`line`,style=("qd-plan-step is-" + `status`)))**.
We **count = table.len(xs=`steps`)**.
We **title = ui.text_node(text="任务进度",style="qd-workbench-title")**.
We **label = ui.text_node(text=(str(`completed`) + "/" + str(`count`)),style="qd-plan-count")**.
We **toggle = ui.button(text="任务详情 ⌃",style="qd-plan-toggle")**.
We **head = ui.region(children=table.concat(a=`title`,b=table.concat(a=`label`,b=`toggle`)),style="qd-plan-heading")**.
We **percent = 0**.
1. `count` > 0
  We **percent = math.floor(value=(`completed` * 100 / `count`))**.
We **attrs = table.put(in=None,at="role",value="progressbar")**.
We **attrs = table.put(in=`attrs`,at="aria-valuemin",value=0)**.
We **attrs = table.put(in=`attrs`,at="aria-valuemax",value=`count`)**.
We **attrs = table.put(in=`attrs`,at="aria-valuenow",value=`completed`)**.
We **bar = ui.region(children=ui.text_node(text="",style="qd-plan-fill"),attrs=`attrs`,style=("qd-plan-progress qd-progress-" + str(`percent`)))**.
We **criteria = ui.text_node(text=access(`plan`,"goal"),style="qd-plan-goal")**.
We **criteria = table.concat(a=`criteria`,b=ui.text_node(text=("验收：" + access(`plan`,"acceptance")),style="qd-workbench-acceptance"))**.
We **criteria = ui.region(children=`criteria`,style="qd-plan-criteria")**.
We **criteria_button = ui.button(text="目标与验收",style="qd-plan-criteria-toggle")**.
We **body = table.concat(a=`head`,b=table.concat(a=`bar`,b=ui.region(children=`items`,style="qd-plan-steps")))**.
We **body = table.concat(a=`body`,b=table.concat(a=`criteria_button`,b=`criteria`))**.
Return *[步骤、折叠依据分别可读](ui.region(children=`body`,style="qd-plan-card"))*.


## register

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 本次文件身份 |
| title | text | required | 可读标题 |
| kind | text | required | 实际格式 |
| path | text | required | 当前工作根内的真实文件 |
| source | text | required | 可读 Markdown 源稿 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 带真实摘要与大小的已保存登记 |

Use `id`, `title`, `kind`, `path` and `source`。生成器完成自己的内容检查以后才登记。摘要和大小必须从原生文件系统取得，不能接受模型随参数提交。源稿也必须存在，不能给用户留下一个永远打不开的预览入口。目录由当前工具文件根约束，登记不会读取另一个任务或公开静态文件。

The manifest is a delivery index, not an authority for accessing the whole server. Download still reopens the same owner-checked workspace and checks the file. A fresh artifact id represents a version; existing records remain available. The operation appends one verified file record atomically and preserves the order of earlier artifacts. It does not claim a visual render or factual review that the producer has not performed.

A child writer and the top-level office generator use the same contract. This keeps identity, digest and source handling consistent across direct creation and delegated work. A handoff document can also be registered as Markdown, with the document itself as its source. Its existence establishes a real handoff, not that the parent's acceptance target is automatically complete.

We **digest = [从真实文件计算摘要](fs.file_hash(path=`path`))**.
We **size = access(fs.stat(path=`path`),"size")**.
We **_ = [源稿必须实际存在](fs.stat(path=`source`))**.

`entry` =

| id | title | kind | path | source | sha256 | bytes | verification |
|---|---|---|---|---|---|---|---|
| `id` | `title` | `kind` | `path` | `source` | `digest` | `size` | "producer_checked_and_digest" |

We **entries = list()**.
We **entries = table.append(list=`entries`,item=`entry`)**.
We **_ = fs.make_dirs(path=".agent")**.
We **_ = [原子追加交付事实](fs.write_json(path=".agent/artifacts.json",value=`entries`))**.
Return *entry*.

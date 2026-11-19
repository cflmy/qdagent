---
markup: occlusion
title: 办公插件：文档与演示的可执行手册
import:
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  call: ext/qdagent/call.mq.md
---

本模块可以由独立办公 SKILL 直接调用。效果权限和用户确认归通用 Agent，文件生成与布局由本模块负责。入口负责工程目录与可信模板，package.mq.md 负责受限工作根内的纯 Marqdo 生成。每个版本保留可读源稿，失败不伪造文件。


## handbook

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 办公手册入口与当前能力边界 |

先按需求选择实际手册，不需要从压缩包或宿主代码推测工具怎么用。每份文稿的函数标题就是可调用入口，参数与返回紧随标题。根智能体通过受限调用现场提供这些能力，身份、当前目录和插件授权由可信执行器处理。

| 需求 | 实际文稿与函数 | 使用要点 |
|---|---|---|
| 新建 Word | word.mq.md 的 chapter、create | 先形成真实章节，再生成可编辑文档和源稿 |
| 新建 PPT | presentation.mq.md 的 slide、create | 每个内容页一个主题，自动添加封面 |
| 修改某一章或页 | 对应手册的 replace、insert、remove 函数 | 函数全名见标题；位置从零开始，生成新身份，不覆盖旧版 |
| 查看可修订的源稿 | 本入口的 inspect | 使用上次生成返回的 id，核对章节顺序与实际摘要 |
| 读取上传原件 | read.mq.md 的 read | 只读提取文字，next_offset 不为空时继续读取 |
| 主方案办公交付 | 根交付文稿的 assemble | 从已验证函数段组装，之后 finish，最后等待用户审阅 |

布局与内容预算见 layouts/index.mq.md；每种布局都是实际函数，普通输入也在写入前分配到真实布局并校验。

结构修订不等于任意外来文档无损编辑。已有文件没有本插件的结构快照时，只能先读取真实文字并明确重建；图片、复杂表格、图表、演讲备注和原始版式不在当前文字模板保证中。PDF 只对本次可信模板生成的包排版，不能把用户上传的未知包直接送给 Office 引擎。详细规范见 docs/office-skills.mq.md。

Return *"Word 与 PPT 分别使用各自的创建和修订文稿；上传读取与真实办公交付保持各自权限及验证。"*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | docx 或 pptx |
| title | text | required | 一百字符以内的题目 |
| sections | list | required | 一至二十项 heading、body |
| theme | text | "sage" | sage、paper、midnight、coral |
| group_id | text | "" | 同一批变体身份 |
| render_pdf | bool | False | 容器内立即核验排版并附带 PDF |
| context | map | required | 由执行器注入的身份与工作根 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实文件路径、源稿、大小、摘要和验证范围 |

Use `kind`, `title`, `sections`, `render_pdf`=False and `context`, `theme`="sage", `group_id`=""。当前交付文稿通过普通函数调用本入口，只提供业务内容；context 不在模型参数中，由可信执行器注入。先读实际材料和验收标准，再组织内容。每个 section 的 heading 是章节或页标题，body 用换行区分段落。PPTX 会自动添加封面，后续每节一页，正文页最多六行、一百八十五字符；过长应先拆页。

| 任务 | kind | sections 示例 |
|---|---|---|
| 报告 | docx | heading 为章节，body 为段落 |
| 汇报 | pptx | heading 为页标题，body 为精炼要点 |

The controller runs under the trusted project root only to read its fixed declarative templates. The actual writer is a separate marqdo call with the narrower task workspace root. Neither a title nor a section can choose a source file, template path, executable, effect list or owner. All runtime business composition is Marqdo. The existing native filesystem and ZIP library provide the operating-system operations; the editable source generator needs no external office engine. The optional render_pdf flag invokes the preinstalled LibreOffice through the registered engineering ABI immediately after safe generation.

The returned source path is a readable Markdown manuscript. The binary is an actual editable OOXML package with relationships, theme and layout parts as appropriate. Its manifest is recorded only after native packing and unpacking succeed. The verification field explicitly describes archive roundtrip and main-part checks. It does not claim a visual rendering that has not happened. Read the source to review claims, and open the downloaded office file to assess final typography in the target application.

Use render_pdf=true in the configured Docker environment to produce an actual PDF together with a newly generated office document. This is a real engine load and layout check, and conversion failure remains explicit. Arbitrary previously uploaded or model-edited office binaries are not accepted by an agent-facing conversion tool.

A future sophisticated renderer can be registered as another plugin operation, with its own parameter contract and capability check. Complex charts, imported documents, page-perfect PDF conversion and rich images are not implied by this basic text-layout operation. Do not fall back to Python or arbitrary external commands through the model tool. New host primitives must go through the documented ABI boundary and stay separate from the manuscript and planning logic.

We **templates = [读取固定声明模板](fs.read_json(path="ext/office/templates.json"))**.

`args` =

| kind | title | sections | templates | render_pdf | theme | group_id |
|---|---|---|---|---|---|---|
| `kind` | `title` | `sections` | `templates` | `render_pdf` | `theme` | `group_id` |

Return *[在狭窄任务根生成真实文件](call.invoke(file=(access(`context`,"project") + "/ext/office/package.mq.md"),function="generate",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec,environment.read"))*.

## inspect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 当前任务已生成的实际办公版本 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | inspect 的实际结果，失败保留明确诊断 |

Use `id`, `context`。

查看某个确定版本的标题、章节或页面以及对应的真实产物。身份从之前生成返回中取得，不能用题目或下载显示名代替。旧版本没有结构快照时明确失败，上传文件只读提取另见 read.mq.md，不声称可以无损恢复外来版式。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

检查在当前任务工作根内进行，入口不把其他用户的文件路径交给调用者。三个摘要联系二进制、可读源稿与结构快照，任意变化都会使旧修订证据失效。此函数不启动排版引擎、不执行宏、不打开网络链接；阅读成功不等于内容已经由业务专家确认。

We **args = table.put(in=None,at="id",value=`id`)**.
Return *[在当前任务核对源稿版本](call.invoke(file=(access(`context`,"project") + "/ext/office/records.mq.md"),function="read",arguments=`args`,root=access(`context`,"workspace"),effects="fs.read"))*.

## replace_section

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 要修订的真实版本 |
| index | number | required | 从零开始的章节或内容页位置 |
| heading | text | required | 当前章节或内容页标题 |
| body | text | required | 完整的新正文，保持原生换行 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 另生成真实 PDF，开发机无引擎时应留空 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | replace_section 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

只替换指定的一章或一页，未选中的章节保持原样。位置不包含 PPT 自动生成的封面，第一张内容页的位置为零。修改前建议先 inspect 核对顺序，不能猜测文件名里的页码。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

公开函数对应一个明确操作，不需要模型构造动作对象。入口只读取已安装的固定模板，再把实际修订交给较小的任务文件根；模型不能选择进程、模板或效果列表。所有原有格式和长度限制继续适用，PDF 只从本次新版本生成，转换失败保留真实原因与可编辑文件。

We **templates = [读取固定声明模板](fs.read_json(path="ext/office/templates.json"))**.
We **args = table.put(in=None,at="id",value=`id`)**.
We **args = table.put(in=`args`,at="index",value=`index`)**.
We **args = table.put(in=`args`,at="heading",value=`heading`)**.
We **args = table.put(in=`args`,at="body",value=`body`)**.
We **args = table.put(in=`args`,at="action",value="replace")**.
We **args = table.put(in=`args`,at="templates",value=`templates`)**.
We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
Return *[在受限根生成修订版本](call.invoke(file=(access(`context`,"project") + "/ext/office/edit.mq.md"),function="change",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec,environment.read"))*.

## insert_section

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 要修订的真实版本 |
| index | number | required | 从零开始的章节或内容页位置 |
| heading | text | required | 当前章节或内容页标题 |
| body | text | required | 完整的新正文，保持原生换行 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 另生成真实 PDF，开发机无引擎时应留空 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | insert_section 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

在指定位置插入一章或一页，等于当前节数时追加到末尾。位置不包含 PPT 自动生成的封面，第一张内容页的位置为零。修改前建议先 inspect 核对顺序，不能猜测文件名里的页码。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

公开函数对应一个明确操作，不需要模型构造动作对象。入口只读取已安装的固定模板，再把实际修订交给较小的任务文件根；模型不能选择进程、模板或效果列表。所有原有格式和长度限制继续适用，PDF 只从本次新版本生成，转换失败保留真实原因与可编辑文件。

We **templates = [读取固定声明模板](fs.read_json(path="ext/office/templates.json"))**.
We **args = table.put(in=None,at="id",value=`id`)**.
We **args = table.put(in=`args`,at="index",value=`index`)**.
We **args = table.put(in=`args`,at="heading",value=`heading`)**.
We **args = table.put(in=`args`,at="body",value=`body`)**.
We **args = table.put(in=`args`,at="action",value="insert")**.
We **args = table.put(in=`args`,at="templates",value=`templates`)**.
We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
Return *[在受限根生成修订版本](call.invoke(file=(access(`context`,"project") + "/ext/office/edit.mq.md"),function="change",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec,environment.read"))*.

## remove_section

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 要修订的真实版本 |
| index | number | required | 从零开始的章节或内容页位置 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 另生成真实 PDF，开发机无引擎时应留空 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | remove_section 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `context`, `render_pdf`=False。

删除指定的一章或一页，最后一节不允许删除。位置不包含 PPT 自动生成的封面，第一张内容页的位置为零。修改前建议先 inspect 核对顺序，不能猜测文件名里的页码。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

公开函数对应一个明确操作，不需要模型构造动作对象。入口只读取已安装的固定模板，再把实际修订交给较小的任务文件根；模型不能选择进程、模板或效果列表。所有原有格式和长度限制继续适用，PDF 只从本次新版本生成，转换失败保留真实原因与可编辑文件。

We **templates = [读取固定声明模板](fs.read_json(path="ext/office/templates.json"))**.
We **args = table.put(in=None,at="id",value=`id`)**.
We **args = table.put(in=`args`,at="index",value=`index`)**.
We **args = table.put(in=`args`,at="heading",value="")**.
We **args = table.put(in=`args`,at="body",value="")**.
We **args = table.put(in=`args`,at="action",value="remove")**.
We **args = table.put(in=`args`,at="templates",value=`templates`)**.
We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
Return *[在受限根生成修订版本](call.invoke(file=(access(`context`,"project") + "/ext/office/edit.mq.md"),function="change",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec,environment.read"))*.

## replace_layout

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 已有真实办公版本 |
| index | number | required | 从零开始的内容块位置 |
| section | map | required | 调用实际布局函数得到的完整记录 |
| context | map | required | 可信执行器注入的任务上下文 |
| render_pdf | bool | False | 是否同时生成新版本 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 新的真实版本，或明确失败 |

Use `id`, `index`, `section`, `context`, `render_pdf`=False。

双栏、引文和图文有各自的字段，不能只改一个派生 body 而让实际页面保留旧栏内容。本函数接收布局函数生成的完整记录，沿用真实旧版本中其他内容。创建新版本前仍核对全部内容块、图片和摘要，不会因来自修订入口而跳过布局检查；原版本始终保留。

调用者不能选择模板或动作字符串，源稿和图片也不是 XML 片段。这里固定执行当前章或页的完整替换，文件根来自可信上下文。位置无效、格式不符或预算失败都不登记新交付，错误保留具体布局和字段。普通文字块仍可用原先的 replace_section，但派生字段不一致时应使用本函数重新构造完整布局。

A complete layout record preserves the relationship between visual fields and readable source. A comparison is not two arbitrary strings plus an unrelated body, and a picture is not an unverified path. The renderer receives the canonical result of the shared constructor and whole-request preflight. This replacement creates a new artifact identity and retains every untouched section. It never overwrites the original binary or accepts a model-supplied XML template. The caller should inspect the new version and its actual rendered output before final review.

We **templates = fs.read_json(path="ext/office/templates.json")**.
We **args = table.put(in=None,at="id",value=`id`)**.
We **args = table.put(in=`args`,at="index",value=`index`)**.
We **args = table.put(in=`args`,at="heading",value="")**.
We **args = table.put(in=`args`,at="body",value="")**.
We **args = table.put(in=`args`,at="action",value="replace")**.
We **args = table.put(in=`args`,at="replacement",value=`section`)**.
We **args = table.put(in=`args`,at="templates",value=`templates`)**.
We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
Return *call.invoke(file=(access(`context`,"project") + "/ext/office/edit.mq.md"),function="change",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec,environment.read")*.

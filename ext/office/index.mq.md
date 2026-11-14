---
markup: occlusion
title: 办公插件：文档与演示的可执行手册
import:
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  call: ../../pages/control/call.mq.md
---

先在根文稿中确认目标与验收，再直接调用本文件 create 函数交付真实报告和幻灯片。入口负责工程目录与可信模板，package.mq.md 负责受限工作根内的纯 Marqdo 生成。每个版本保留可读源稿，失败不伪造文件。

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | docx 或 pptx |
| title | text | required | 一百字符以内的题目 |
| sections | list | required | 一至二十项 heading、body |
| render_pdf | bool | False | 容器内立即核验排版并附带 PDF |
| context | map | required | 由执行器注入的身份与工作根 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实文件路径、源稿、大小、摘要和验证范围 |

Use `kind`, `title`, `sections`, `render_pdf`=False and `context`。当前交付文稿通过普通函数调用本入口，只提供业务内容；context 不在模型参数中，由可信执行器注入。先读实际材料和验收标准，再组织内容。每个 section 的 heading 是章节或页标题，body 用换行区分段落。PPTX 会自动添加封面，后续每节一页，单页最多八行、七百字符；过长应先拆页。

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

| kind | title | sections | templates | render_pdf |
|---|---|---|---|---|
| `kind` | `title` | `sections` | `templates` | `render_pdf` |

Return *[在狭窄任务根生成真实文件](call.invoke(file=(access(`context`,"project") + "/ext/office/package.mq.md"),function="generate",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,random.read,process.exec"))*.

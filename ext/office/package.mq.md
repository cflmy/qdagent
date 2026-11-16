---
markup: occlusion
title: 办公产物：可读源稿、真实文件与内容核验
import:
  validation: layouts/validate.mq.md
  ppt_layout: layouts/presentation.mq.md
  ppt_render: layouts/render_presentation.mq.md
  word_render: layouts/render_word.mq.md
  records: records.mq.md
  fs: lib/fs.mq.md
  archive: lib/archive.mq.md
  html: lib/html.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
  artifacts: ../../pages/agent/artifacts.mq.md
  export: export.mq.md
  re: lib/re.mq.md
---

办公插件的业务全部使用 Marqdo。静态 XML 只是声明式文件格式数据，模板不是模型代码。多文件入口位于 ext/office/index.mq.md；此文件只在狭窄任务工作根完成写入。

## escape

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | text | required | 只作为正文的内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | XML 字符数据 |

Use `value`。用户和模型提供的是文字，不是 XML 程序。已有 HTML 字符转义同时适用于这里的 XML 文本位置；花括号也编码为字符引用，避免正文恰巧包含模板标记时被二次替换。此函数不解析链接，不接受节点片段，也不执行源稿。返回值只放在元素的字符数据位置。

We **safe = [先转义文字](html.escape(text=`value`))**.
Return *[模板标记也是普通文字](text.replace(text=text.replace(text=`safe`,old="{",new="&#123;"),old="}",new="&#125;"))*.

## part

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 本次生成的包目录 |
| path | text | required | 固定内部部件路径 |
| body | text | required | 已生成的 XML 数据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 部件写入完成 |

Use `root`, `path` and `body`。部件路径只由本模块固定生成，不从用户标题或段落取得。父目录是新建包目录的一部分，外层工作根仍由宿主限定。每个部件使用原子文件写入，任何失败直接保留诊断。这个内部辅助入口不授予网络、进程或文件根以外的能力。

Return *[原子写入包内真实部件](fs.atomic_write(path=(`root` + "/" + `path`), text=`body`))*.

## generate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | docx 或 pptx |
| title | text | required | 文件可读标题 |
| sections | list | required | 每项 heading、body；body 使用换行分段 |
| templates | map | required | 可信控制器读取的声明式模板 |
| render_pdf | bool | False | 立即渲染本次新文件为 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，已登记的真实产物和源稿 |

Use `kind`, `title`, `sections`, `templates` and `render_pdf`=False。这是工作根内的生成入口，模板由工程控制器注入，模型不能替换 XML 模板。报告和演示接收同一种简单的标题正文结构；演示先生成封面，再把每个 section 变成一页。内置布局支持实际文字、双栏、引文与静态 PNG 图文，先校验整份请求再写入；不承诺复杂表格、任意图片格式或公式。

A document is not a string with an office extension. The package contains content types and relationship parts, and each internal target is generated from a fixed path. A presentation includes a slide master, blank layout, theme, presentation metadata and individual slide relationships. The editable text lives in real WordprocessingML or DrawingML text nodes. Content is escaped before substitution. User prose cannot add a relationship, execute code or choose a server path.

XML 1.0 不允许的控制字符会在创建版本目录前被拒绝。普通换行、制表符与中文保留；特殊符号转义后依然是可编辑的文字。render_pdf 只在刚完成安全模板生成之后运行受控排版引擎，模型编辑过的任意 Office 二进制没有对应的公开转换工具。

Each request creates a UUID directory. A Markdown source remains alongside the binary so the user or a later agent can revise the content without reverse engineering the archive. Existing versions are never overwritten. Inputs have a bounded number and length of sections; the simple slide layout additionally limits line count to keep a useful readable default. Unsupported complexity fails explicitly instead of silently clipping an unlimited manuscript.

Packing is followed by a real unpack into a fresh verification directory. The returned status means that the package can be expanded and expected main content is present. It does not claim that Microsoft Office has rendered every slide. The manifest records the actual SHA-256 digest, byte size and source path only after these operations succeed. A partial failed generation remains inspectable but is not added to the delivery manifest.

For a report, use a short overall title and one section per topic. Each body line becomes a paragraph. The first heading uses the document title style, section headings use Heading1, and body paragraphs use the default readable font and spacing. These are editable paragraph styles rather than rendered images. The source manuscript preserves the same ordering so a later agent can read it before a focused revision. Body text is literal text; Markdown emphasis or a URL in a paragraph is not converted into hidden XML instructions.

For a presentation, keep each section focused on one claim and use short body lines. The generated cover names the topic; later pages keep the section order. Splitting a dense page is the caller's responsibility, and the bounded input contract encourages that split before generation. A list of twenty sections creates a cover plus twenty slides. A model should not try to put a whole report into a single slide body. Empty titles, missing bodies and unsupported format names fail before the version directory is created.

A successful return includes paths relative to the task workspace. Use those paths for plan evidence, later reading and actual delivery. The UI resolves an opaque artifact id through the owner-checked service; a model must not publish a server absolute path as if it were a download URL. If validation fails after some parts were written, inspect the dedicated UUID directory rather than retrying a mutation blindly. A new corrected request creates a new version.

生成完成后还保存结构源稿，并把真实摘要写入当前版本登记。后续局部编辑只读取与二进制和 Markdown 都一致的源稿，不根据相同标题猜测版本。新文件不覆盖旧文件，生成失败的目录也不会被当成已经核对的交付。

We **prepared = [写入前校验全部版式与真实图片](validation.preflight(kind=`kind`,title=`title`,sections=`sections`))**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **sections = access(`prepared`,"value")**.
We **id = [新版本的真实身份](uuid.v4())**.
We **directory = "artifacts/" + `id`**.
We **root = `directory` + "/package"**.
We **_ = [每个版本独立目录](fs.make_dirs(path=`root`))**.
We **source = "# " + `title` + "\n\n"**.
We **content = ""**.
We **title_xml = escape(value=`title`)**.
We **title_para = text.replace(text=access(`templates`,"paragraph"),old="{{style}}",new="<w:pPr><w:pStyle w:val=\"Title\"/></w:pPr>")**.
We **content = text.replace(text=`title_para`,old="{{text}}",new=`title_xml`)**.
We **slides = table.empty_list()**.
We **cover = ppt_layout.cover(heading=`title`,body="求道 · 可编辑演示文稿")**.
We **slides = table.append(list=`slides`,item=`cover`)**.
We **word_rels = ""** and **section_number = 0**.
- [正文与源稿同时组装](for sections as section)
  We **heading = access(`section`,"heading")** and **body = access(`section`,"body")**.
  We **source = `source` + "## " + `heading` + "\n\n" + `body` + "\n\n"**.
  We **slides = table.append(list=`slides`,item=`section`)**.
  We **section_number = `section_number` + 1**.
  1. json.get(value=`section`,key="image") != None
    We **source = `source` + "图片原件：" + access(`section`,"image") + "；具体说明见结构源稿与实际文件。\n\n"**.
  1. `kind` == "docx"
    We **rendered = word_render.section(root=`root`,section=`section`,number=str(`section_number`),templates=`templates`)**.
    1. not access(`rendered`,"ok")
      Return *rendered*.
    We **content = `content` + access(access(`rendered`,"value"),"xml")**.
    We **word_rels = `word_rels` + access(access(`rendered`,"value"),"relationships")**.
We **_ = [保留可读可改的源稿](fs.atomic_write(path=(`directory` + "/source.md"),text=`source`))**.
We **_ = [准备关系目录](fs.make_dirs(path=(`root` + "/_rels")))**.
1. `kind` == "docx"
  We **_ = [准备 Word 部件目录](fs.make_dirs(path=(`root` + "/word/_rels")))**.
  We **_ = part(root=`root`,path="[Content_Types].xml",body=access(`templates`,"docx_types"))**.
  We **_ = part(root=`root`,path="_rels/.rels",body=access(`templates`,"docx_root"))**.
  We **_ = part(root=`root`,path="word/_rels/document.xml.rels",body=text.replace(text=access(`templates`,"docx_rels"),old="</Relationships>",new=(`word_rels` + "</Relationships>")))**.
  We **_ = part(root=`root`,path="word/styles.xml",body=access(`templates`,"docx_styles"))**.
  We **_ = part(root=`root`,path="word/document.xml",body=text.replace(text=access(`templates`,"docx_document"),old="{{content}}",new=`content`))**.
1. `kind` == "pptx"
  We **_ = [生成完整演示包](presentation(root=`root`,slides=`slides`,templates=`templates`))**.
We **path = `directory` + "/document." + `kind`**.
We **packed = [原生 ZIP 打包](archive.pack(src=`root`,dest=`path`,max_bytes=8388608))**.
1. not access(`packed`,"ok")
  Return *packed*.
We **checked = [重新解包核对可读取性](archive.unpack(src=`path`,dest=(`directory` + "/verified"),max_bytes=8388608))**.
1. not access(`checked`,"ok")
  Return *checked*.
We **main = `directory` + "/verified/word/document.xml"**.
1. `kind` == "pptx"
  We **main = `directory` + "/verified/ppt/presentation.xml"**.
1. not fs.exists(path=`main`)
  Return *[缺少主部件不能交付](result.error(code="office.package",message=`main`,operation="generate"))*.
We **artifact = [统一登记真实交付](artifacts.register(id=`id`,title=`title`,kind=`kind`,path=`path`,source=(`directory` + "/source.md")))**.
We **artifact = [绑定真实源稿与文件版本](records.save(artifact=`artifact`,kind=`kind`,title=`title`,sections=`sections`))**.
1. `render_pdf`
  We **pdf = [只转换本次刚生成的受信任包](export.pdf(id=`id`))**.
  1. not access(`pdf`,"ok")
    Return *pdf*.
  We **artifact = [Office 与实际排版一起交付](table.put(in=`artifact`,at="pdf",value=access(`pdf`,"value")))**.
Return *[交付真实文件身份](result.ok(value=`artifact`))*.

## presentation

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 新建包目录 |
| slides | list | required | 包括封面在内的全部页 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 演示部件写入完成 |

Use `root`, `slides` and `templates`。每页都连接到空白版式，版式连接到母版，母版连接到主题。页面编号同时用于部件名、关系和主清单，不能出现清单有页面但 ZIP 没文件的假演示。16:9 页面使用纸色背景、深色标题和一致字体；中文字体声明保留，实际显示仍取决于打开文件的系统。

The package is deliberately simple and editable. It contains text boxes rather than screenshots of text. A slide title has its own shape and the body has separate paragraphs, allowing an office application to edit them naturally. A theme supplies a consistent color and font vocabulary. The layout is blank because all geometry is explicit in the fixed declaration. This avoids requiring an inherited placeholder position that the generated slide never supplies.

Slide relationships use local package paths only. No external images, URLs, macros, embedded executables or remote template references are created. Incrementing identifiers are generated internally and are never derived from user text. All visible text has already passed the XML character-data boundary. Package construction is still Marqdo composition with the existing filesystem and archive library, not another script runtime.

Verification at this layer checks construction and archive readability. It cannot promise that arbitrary long paragraphs fit on a slide, which is why the public input contract rejects oversized pages before writing. More advanced layouts should be separate documented plugin operations with their own tests and artifact metadata. They must not silently change this operation into a network renderer.

Keep the generated package reproducible and inspectable: Office applications should be able to edit each separate title and body text box after download.

The package's relationship graph is part of its content contract. The presentation points to a master and the ordered slide list. Each slide points to the blank layout; that layout points back to the master, and the master identifies its layout and theme. Content types name every generated slide. A missing edge is a broken office document even if a ZIP utility can list the files. The generator builds the filename, relationship id and main-list id in the same iteration to keep that graph consistent.

`directories` =

| path |
|---|
| "ppt/_rels" |
| "ppt/slides/_rels" |
| "ppt/slideMasters/_rels" |
| "ppt/slideLayouts/_rels" |
| "ppt/theme" |

- [明确每个包内目录](for directories as directory)
  We **_ = fs.make_dirs(path=(`root` + "/" + `directory`))**.
We **types = ""** and **ids = ""** and **rels = ""** and **n = 0**.
- [页面关系和文件同步生成](for slides as slide)
  We **n = `n` + 1**.
  We **relation_id = `n` + 1** and **slide_id = 255 + `n`**.
  We **number = str(`n`)** and **relation = str(`relation_id`)** and **sid = str(`slide_id`)**.
  We **types = `types` + "<Override PartName=\"/ppt/slides/slide" + `number` + ".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>"**.
  We **ids = `ids` + "<p:sldId id=\"" + `sid` + "\" r:id=\"rId" + `relation` + "\"/>"**.
  We **rels = `rels` + "<Relationship Id=\"rId" + `relation` + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" Target=\"slides/slide" + `number` + ".xml\"/>"**.
  We **rendered = ppt_render.slide(root=`root`,section=`slide`,number=`number`,templates=`templates`)**.
  1. not access(`rendered`,"ok")
    Return *rendered*.
  We **_ = part(root=`root`,path=("ppt/slides/slide" + `number` + ".xml"),body=access(access(`rendered`,"value"),"xml"))**.
  We **_ = part(root=`root`,path=("ppt/slides/_rels/slide" + `number` + ".xml.rels"),body=access(access(`rendered`,"value"),"relationships"))**.
We **_ = part(root=`root`,path="[Content_Types].xml",body=text.replace(text=access(`templates`,"pptx_types"),old="{{slides}}",new=`types`))**.
We **_ = part(root=`root`,path="_rels/.rels",body=access(`templates`,"pptx_root"))**.
We **_ = part(root=`root`,path="ppt/presentation.xml",body=text.replace(text=access(`templates`,"presentation"),old="{{slides}}",new=`ids`))**.
We **_ = part(root=`root`,path="ppt/_rels/presentation.xml.rels",body=text.replace(text=access(`templates`,"presentation_rels"),old="{{slides}}",new=`rels`))**.
We **_ = part(root=`root`,path="ppt/slideMasters/slideMaster1.xml",body=access(`templates`,"master"))**.
We **_ = part(root=`root`,path="ppt/slideMasters/_rels/slideMaster1.xml.rels",body=access(`templates`,"master_rels"))**.
We **_ = part(root=`root`,path="ppt/slideLayouts/slideLayout1.xml",body=access(`templates`,"layout"))**.
We **_ = part(root=`root`,path="ppt/slideLayouts/_rels/slideLayout1.xml.rels",body=access(`templates`,"layout_rels"))**.
Return *[主题也必须实际存在](part(root=`root`,path="ppt/theme/theme1.xml",body=access(`templates`,"theme")))*.

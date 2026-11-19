---
markup: occlusion
title: Office 排版插件：从已登记文稿导出 PDF
import:
  json: lib/json.mq.md
  artifacts: artifacts.mq.md
  engineering: ext/engineering/index.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  bytes: lib/bytes.mq.md
  table: lib/table.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
---

源码是任务手册，也是排版调用的唯一业务入口。该插件不在生产启动时安装依赖，镜像预装固定的系统排版工具；没有引擎的开发机明确不可用，不伪造 PDF。

## pdf

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 已登记 DOCX 或 PPTX 的身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实 PDF 产物；缺少排版引擎或转换失败明确报错 |

Use `id`。可编辑 Office 文件可以完全用 Marqdo 的文件和 ZIP 能力生成，但现有标准库没有 Office 字体排版与分页引擎。因此这个入口复用已登记 engineering ABI，调用固定的 LibreOffice 无界面转换；编排、文件选择、验证和登记仍全部写在 Marqdo。模型不能选择可执行文件、外部参数或系统目录。

This internal operation is not a model tool and is not exposed through plugin reflection. The registered create_office entry can invoke it only immediately after generating a fresh UUID document from fixed templates and escaped text. Previously uploaded or model-edited Office packages are never accepted by an agent-facing conversion entry. Only that just-created artifact is exported. The source digest must still match the creation record. A fresh UUID output directory and a private LibreOffice profile prevent accidental interference between conversions. Inputs are copied to a fixed source filename inside that directory. User titles never become command options, and no shell is involved. The trusted engineering adapter receives an argv array with one fixed executable and fixed PDF conversion options.

The process must exit successfully and produce the expected nonempty PDF. The function additionally checks its actual PDF signature before registering a deliverable. A zero process exit without a file is not success. The returned artifact shares the readable Markdown source of the original document, while its own digest and byte size come from the actual PDF. Downloading it uses the same authenticated owner-scoped service.

This operation verifies that a real office engine can load and render the generated package. It does not certify the factual claims in the manuscript or guarantee identical pagination in every office suite. Font availability affects layout; the container supplies Chinese fonts for this reason. The UI content preview remains the source manuscript, clearly labeled as such, and the PDF is the portable layout output.

The external engine runs as the same non-root container user with the existing read-only application filesystem and bounded process timeout. This is a documented missing host capability, not a second Python or JavaScript business implementation. Conversion failure retains the source and diagnostic, and it never erases a previously generated editable file.

[LibreOffice command-line documentation](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html) describes the headless conversion and per-process UserInstallation profile parameters used here.

预览名称包含风格，使用户在下载或打开独立大屏时能够分清版本。可读名称不会替代真实身份或摘要，相同题目仍可能有多个独立 PDF。生成器仅转换本次受信的可编辑文件，读取上传文件不触发这个排版入口。

We **entries = artifacts.list()**.
We **selected = None**.
- [先选当前任务的真实登记](for entries as entry)
  1. access(`entry`,"id") == `id`
    We **selected = `entry`**.
1. not `selected`
  Return *[未知文件不能转换](result.error(code="office.unknown",message=`id`,operation="pdf"))*.
We **kind = access(`selected`,"kind")**.
1. `kind` != "docx" and `kind` != "pptx"
  Return *[只转换已生成的办公格式](result.error(code="office.format",message=`kind`,operation="pdf"))*.
1. fs.file_hash(path=access(`selected`,"path")) != access(`selected`,"sha256")
  Return *[修改后的文件需要重新核验](result.error(code="office.changed",message=`id`,operation="pdf"))*.
We **version = uuid.v4()** and **directory = "artifacts/"**.
We **directory = `directory` + `version`**.
We **_ = fs.make_dirs(path=`directory`)**.
We **input = `directory` + "/source." + `kind`**.
We **_ = [固定输入名不作为系统选项](fs.copy_file(src=access(`selected`,"path"),dest=`input`))**.
We **absolute = sys.cwd() + "/" + `directory`**.

`argv` =

| argument |
|---|
| "libreoffice" |
| "--headless" |
| "--nologo" |
| "--nodefault" |
| "--norestore" |
| "-env:UserInstallation=file://" + `absolute` + "/profile" |
| "--convert-to" |
| "pdf" |
| "--outdir" |
| `absolute` |
| `absolute` + "/source." + `kind` |

We **ran = [固定工程 ABI 运行排版引擎](engineering.checked(argv=`argv`,cwd=sys.cwd(),timeout_ms=120000,max_output=3000))**.
1. not access(`ran`,"ok")
  Return *ran*.
We **path = `directory` + "/source.pdf"**.
1. not fs.exists(path=`path`) or access(fs.stat(path=`path`),"size") < 8
  Return *[没有实际 PDF 不能交付](result.error(code="office.pdf_missing",message="排版引擎未产生 PDF",operation="pdf"))*.
We **prefix = fs.read_chunk(path=`path`,offset=0,size=5)**.
1. bytes.to_text(data=access(`prefix`,"data")) != "%PDF-"
  Return *[格式签名必须真实](result.error(code="office.pdf_signature",message=`id`,operation="pdf"))*.
We **label = access(`selected`,"title")**.
1. json.get(value=`selected`,key="theme") != None
  We **label = `label` + " · " + access(access(`selected`,"theme"),"label")**.
Return *[登记实际排版产物](result.ok(value=artifacts.register(id=`version`,title=(`label` + " · PDF"),kind="pdf",path=`path`,source=access(`selected`,"source"))))*.

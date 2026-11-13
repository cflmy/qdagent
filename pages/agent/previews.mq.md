---
markup: occlusion
title: 文件检查区：原生 View 与安全 Markdown
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  uuid: lib/uuid.mq.md
  ui: ui.mq.md
  component: ext/web/component/index.mq.md
  engineering: ext/engineering/index.mq.md
  artifacts: artifacts.mq.md
---



## files

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实 Markdown 与 Marqdo 文件列表片段 |

只在当前任务工作根枚举文件，检查区不会列出服务器源码或其他用户目录。最多展示四十个可阅读文件，内部执行档案被排除。按钮只携带相对路径，真正读取仍经过会话所有权和原生文件根。文件不存在时明确显示空状态，不预置示例文档。

The file browser enumerates only the current workspace and excludes the agent's internal receipt tree. It shows actual Markdown paths with a bounded depth and count, not a guessed semantic index. A later read rechecks the path, since a file can change or disappear after enumeration. Listing a document never executes it.

We **nodes = table.empty_list()** and **count = 0**.
We **exclude = table.append(list=table.empty_list(),item=".agent/**")**.
We **paths = fs.find(path=".",pattern="**",exclude=table.append(list=`exclude`,item="artifacts/**"),max_depth=8)**.
- [只展示真实可读文件](for paths as path)
  1. `count` < 40
    We **nodes = table.concat(a=`nodes`,b=ui.button(text=`path`,data_id=`path`,style="qd-workspace-preview"))**.
    We **count = `count` + 1**.
1. `count` == 0
  We **nodes = ui.text_node(text="这里还没有文档。上传材料或让求道创建文件后即可查看。",style="qd-empty-note")**.
Return *[原生组件生成文件列表](ui.render(nodes=`nodes`))*.

## show

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | "" | 当前工作根相对路径 |
| artifact | text | "" | 已登记产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 只读内容片段、显示名称与渲染类型 |

Use `path`="" and `artifact`=""。选产物时从真实清单取得源稿；选工作文件时直接使用授权根内的相对路径。只接收 Markdown 文本，不把二进制 Office 当作乱码展示。文件大小限制为 256 KiB，较大材料继续提供下载路径，不能把整个模型上下文或页面塞满。

Marqdo files use the actual CLI DocumentViewV1 renderer, never a handwritten interpretation of its syntax. The read-only command returns its sanitized fragment and executed=false. A temporary isolated project avoids unrelated malformed files breaking the preview. Source is copied as data and is never run. Relative custom imports outside this isolated document are reported as unavailable rather than expanded into an unbounded server project.

The preview refuses non-public import paths before invoking the renderer. Only installed lib/ and ext/ imports are permitted in this standalone reader. This prevents an uploaded source document from requesting private server files through its metadata. Ordinary Markdown uses the existing safe component renderer and raw source is always escaped when a diagnostic is needed.

A rendering failure remains a visible diagnostic with the actual source available; it cannot be described as successful execution. Model content is never mounted as a browser program. The inspector's own lifecycle remains independent from the ongoing task, so changing a document cannot cancel or restart the agent.

DocumentViewV1 is produced in a fresh isolated directory and explicitly reports read-only rendering. Its sanitized fragment is used directly, preserving the same syntax presentation as View. Temporary copies are removed after rendering. A fallback source display remains visibly a diagnostic rather than a substitute claiming successful View interpretation.

The rendering format and read-only capability flags are checked before inserting the native fragment. A mismatch is not treated as a successful preview.

The inspector title uses the native document metadata when it exists, while the file list retains the original relative filename. These are display labels only. They never select another source or change the root permission. Unsupported project imports remain an explicit limitation of standalone reading rather than being silently followed into server directories.

The accepted source snapshot is returned as ordinary text for explicit source mode and download. It never becomes an application script.

1. `artifact` != ""
  We **entries = artifacts.list()** and **found = False**.
  - [产物身份先从清单解析](for entries as entry)
    1. access(`entry`,"id") == `artifact`
      We **path = access(`entry`,"source")** and **found = True**.
  1. not `found`
    Return *[不存在就明确说明](table.put(in=None,at="html",value=ui.markdown(source="未找到此产物。")))*.
1. not text.ends_with(text=`path`,suffix=".md") or not fs.exists(path=`path`)
  Return *[不把二进制当正文](table.put(in=None,at="html",value=ui.markdown(source="请选择现有 Markdown 或 Marqdo 文档。")))*.
1. access(fs.stat(path=`path`),"size") > 262144
  Return *[保持预览有界](table.put(in=None,at="html",value=ui.markdown(source="文件超过预览上限，请下载查看。")))*.
We **source = fs.read_text(path=`path`)** and **kind = "markdown"** and **title = `path`**.
We **html = ui.markdown(source=`source`)**.
1. text.ends_with(text=`path`,suffix=".mq.md")
  We **kind = "marqdo-view"**.
  We **front = re.find(text=`source`,pattern="(?s)^---\n.*?\n---")**.
  We **remaining = re.replace(text=`front`,pattern="(?m)^[ \\t]+[A-Za-z_一-龥][A-Za-z0-9_一-龥]*: ['\"]?(lib/[A-Za-z_一-龥][A-Za-z0-9_一-龥]*[.]mq[.]md|ext/[A-Za-z0-9_/-]+[.]mq[.]md)['\"]?[ \\t]*$",with="")**.
  1. re.is_match(text=`remaining`,pattern="(?m)^[ \\t]+[^ \\t\\n]|^import:[ \\t]*[^ \\t\\n]")
    Return *[不跟随私有导入](table.put(in=None,at="html",value=ui.markdown(source="此文档包含独立预览无法解析的项目导入，请在其原工程使用 marqdo view 查看。")))*.
  We **directory = ".agent/previews/" + uuid.v4()**.
  We **_ = fs.make_dirs(path=`directory`)**.
  We **_ = fs.atomic_write(path=(`directory` + "/document.mq.md"),text=`source`)**.

  We **absolute = sys.cwd() + "/" + `directory`**.

  `argv` =

  | argument |
  |---|
  | "marqdo" |
  | "view" |
  | "document" |
  | "--project" |
  | `absolute` |
  | "--document" |
  | "document.mq.md" |
  | "--json" |

  We **out = engineering.run(argv=`argv`,cwd=sys.cwd(),timeout_ms=20000,max_output=2097152)**.
  We **ran = access(`out`,"value")**.
  1. access(`ran`,"code") == 0 and not access(`ran`,"truncated")
    We **view = json.parse(text=access(`ran`,"stdout"))**.
    We **render = access(`view`,"render")**.
    1. access(`render`,"format") != "sanitized_html" or access(access(`view`,"capabilities"),"executed") != False
      Return *[拒绝意外的执行式渲染](table.put(in=None,at="html",value=ui.markdown(source="阅读器未返回预期的只读格式。")))*.
    We **html = access(`render`,"fragment")**.
    We **document_title = json.get(value=access(`view`,"document"),key="title")**.
    1. `document_title` and `document_title` != "document.mq"
      We **title = `document_title`**.
  2. *
    We **html = ui.markdown(source=("View 无法完整解析此文件，以下为原始源码。\n\n" + access(`ran`,"stderr"))) + ui.render(nodes=component.element(kind="pre",value=`source`))**.
  We **_ = fs.remove_tree(path=`directory`)**.
We **out = table.put(in=None,at="html",value=`html`)**.
We **out = table.put(in=`out`,at="title",value=`title`)**.
We **out = table.put(in=`out`,at="source",value=`source`)**.
We **out = table.put(in=`out`,at="filename",value=`path`)**.
Return *[内容不会作为应用执行](table.put(in=`out`,at="kind",value=`kind`))*.

---
markup: occlusion
title: 文件检查区：原生 View 与安全 Markdown
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  ui: ui.mq.md
  component: ext/web/component/index.mq.md
  plugin: lib/plugin.mq.md
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

Marqdo 文稿交给官方 DocumentViewV1 渲染，不执行正文。ABI 使用官方解析器枚举相对导入，只复制当前授权工作根内的公开 Marqdo 文件，在隔离目录保留原有相对结构，然后调用只读 View。标准库与安装扩展继续从安装根解析，用户文稿不能指定绝对路径、远程导入或私有目录。

多文件阅读最多包含四十八份文稿，单份一 MiB，总计四 MiB，深度十二层；循环、缺失依赖、越界符号链接和超限都显示实际诊断。页面不会展开整个服务器工程，不通过正则猜测语言语法，也不因为需要预览就给予业务函数写入或进程权限。临时副本在成功和失败时均由 ABI 回收。

返回片段必须标记 sanitized_html 和 executed=false。正文、文件名和原始源码分别返回；渲染失败保留原文供核对，不把纯源码回退描述成正确的 View。公式、可调用链接与侧注继续由原生阅读器展示，切换文稿不会触发正在进行的任务。

The document snapshot is deliberately smaller than the task workspace. It contains the selected source and only the relative imports explicitly declared by the official AST. An unrelated malformed draft is not scanned and cannot break this document. Dependencies retain their original directory relationships, so a chapter can call its implementation without copying program statements into the reading surface. Installed libraries are not interpreted as arbitrary workspace paths. Public standard libraries remain available through the CLI's existing installation rules.

No downloaded interpreter, uploaded source file or foreign-language process runs during this operation. The native command has its own time and output budgets and reports an actual failure when either is exceeded. An unavailable import is described as unavailable instead of silently rendering a different source. When displaying a diagnostic, the original source is escaped and remains distinct from the sanitized native fragment. The frontend can offer source mode without treating it as an application or replaying a task.

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
  We **_ = [只加载安装的预览边界插件](plugin.load(path=(sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so")))**.
  We **request = table.put(in=None,at="operation",value="document_view")**.
  We **request = table.put(in=`request`,at="workspace",value=sys.cwd())**.
  We **rendered = [在当前工作根内制作只读文稿快照](qdagent_transport(request=table.put(in=`request`,at="path",value=`path`)))**.
  1. access(`rendered`,"ok")
    We **view = access(`rendered`,"value")**.
    We **html = access(access(`view`,"render"),"fragment")**.
    We **document_title = json.get(value=access(`view`,"document"),key="title")**.
    1. `document_title`
      We **title = `document_title`**.
  2. else
    We **html = ui.markdown(source=("View 无法完整解析此文件。\n\n" + json.stringify(value=access(`rendered`,"error")))) + ui.render(nodes=component.element(kind="pre",value=`source`))**.
We **out = table.put(in=None,at="html",value=`html`)**.
We **out = table.put(in=`out`,at="title",value=`title`)**.
We **out = table.put(in=`out`,at="source",value=`source`)**.
We **out = table.put(in=`out`,at="filename",value=`path`)**.
Return *[内容不会作为应用执行](table.put(in=`out`,at="kind",value=`kind`))*.

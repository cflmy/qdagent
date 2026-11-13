---
markup: occlusion
title: 工程能力与会话服务
import:
  sessions: sessions.mq.md
  store: ../../ext/qdagent/store.mq.md
  component: ext/web/component/index.mq.md
  ui: ../agent/ui.mq.md
  models: models.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  materials: context.mq.md
  call: call.mq.md
  plugins: plugins.mq.md
  panels: panels.mq.md
  transport: ../../ext/qdagent/transport.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

本服务始终在工程文件根运行。浏览器只提交会话身份，不提交服务器路径；会话管理器决定独立目录，ABI 控制锁保护同一会话的开始、读取和停止。

## dispatch

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 登记任务身份 |
| member | text | "view" | 受信任控制入口 |
| arguments | map | None | 命名控制参数 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前独立会话的实际结果 |

Use `session`="default", `member`="view" and `arguments`=None and `principal`="local"。会话根先通过登记器取得，入口固定在当前工程。每个控制调用仍是 marqdo call，进程锁只解决跨 HTTP 调用不能共享内存句柄的问题；业务逻辑始终在 runner 中。

We **opened = [定位实际会话](sessions.ensure(id=`session`, principal=`principal`))**.
1. not access(`opened`, "ok")
  Return *opened*.
We **ctx = access(`opened`, "value")**.
1. not `arguments`
  We **arguments = [空参数仍是记录](table.empty_map())**.
Return *[受控进入当前任务](transport.control(root=access(`ctx`, "root"), entry=(access(`ctx`, "project") + "/pages/agent/runner.mq.md"), member=`member`, arguments=`arguments`))*.

## state

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 所查看的任务 |
| epoch | any | 0 | 浏览器切换请求身份 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 会话快照、插件和任务面板 |

Use `session`="default" and `epoch`=0 and `principal`="local"。恢复历史和刷新面板从同一份真实目录读取。响应回显切换身份，客户端可忽略迟到的旧页面结果。任务仍运行时只读取进度，不从刷新动作启动第二个模型或重复工具。

Opening the panel is a read of existing tasks. It must not cancel another session, repeat a completed tool, or infer progress from assistant text.

The custom model list is a public projection for this principal. It contains no encrypted credential or plaintext key, and it is updated separately from the configuration form so refreshing a task does not erase typed settings.

The header title comes from the owner-checked session context. An unsuccessful restore returns before reading that context, so a failed or foreign session cannot replace the current workspace heading. The display name is ordinary text and never becomes an HTML fragment.

We **out = [读取所选任务](dispatch(session=`session`, principal=`principal`))**.
1. not access(`out`, "ok")
  Return *out*.
We **out = [回显切换身份](table.put(in=`out`, at="epoch", value=str(`epoch`)))**.
We **out = [插件目录可阅读](table.put(in=`out`, at="plugins_html", value=panels.plugins(entries=plugins.catalog(principal=`principal`))))**.
We **out = [所有任务可切换](table.put(in=`out`, at="sessions_html", value=panels.sessions(entries=sessions.list(principal=`principal`), selected=access(`out`,"session"))))**.
We **out = table.put(in=`out`, at="knowledge_html", value=materials.knowledge())**.
We **out = table.put(in=`out`, at="models_html", value=panels.models(entries=models.list(principal=`principal`)))**.
We **opened = sessions.ensure(id=access(`out`,"session"), principal=`principal`)**.
We **workspace = access(`opened`,"value")**.
We **out = table.put(in=`out`, at="workspace_title", value=access(`workspace`,"title"))**.
We **out = [默认选择仅引用已有配置](table.put(in=`out`,at="default_model",value=models.preferred(principal=`principal`)))**.
We **out = [公开模型名不混入凭据](table.put(in=`out`,at="model_titles",value=models.titles(principal=`principal`)))**.
Return *out*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | "新任务" | 人类可读标题 |
| epoch | any | 0 | 切换身份 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 新建任务并返回其实际快照 |

Use `title`="新任务" and `epoch`=0 and `principal`="local"。创建产生独立 UUID、档案和工作目录，不复制另一个会话的执行日志。旧任务继续运行，用户随后可以随时切换回来查看真实结果。

We **created = [创建独立工作空间](sessions.create(title=`title`, principal=`principal`))**.
1. not access(`created`, "ok")
  Return *created*.
We **ctx = access(`created`, "value")**.
Return *[直接进入新任务](state(session=access(`ctx`, "id"), epoch=`epoch`, principal=`principal`))*.

## toggle

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 真实拓展身份 |
| session | text | "default" | 当前查看任务 |
| epoch | any | 0 | 切换身份 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 修改实际授权并刷新真实面板 |

Use `id`, `session`="default" and `epoch`=0 and `principal`="local"。固有能力的禁止停用在服务端执行，绕过按钮也不能关闭标准库。切换后新工具调用重新核对注册表；已发生的效果和记录不会被开关抹去。

We **changed = [更新真实授权](plugins.toggle(id=`id`, principal=`principal`))**.
1. not access(`changed`, "ok")
  Return *changed*.
Return *[从真实状态重建面板](state(session=`session`, epoch=`epoch`, principal=`principal`))*.

## start

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 当前任务 |
| q | text | "" | 用户问题 |
| model | text | "none" | 选择模型 |
| gen | any | 0 | 代数 |
| kb | text | "none" | 真实知识根 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 验证知识来源后开始当前任务 |

Use `session`="default", `q`="", `model`="none", `gen`=0, `kb`="none" and `principal`="local"。先检查会话归属，再取得真实参考和已上传路径。参考作为数据交给既有 runner，不更改身份或工具权限。开始失败不会产生一份假检索结果，未知知识根明确拒绝。

The service owns both source and destination roots. Browser input can select an installed knowledge identity but cannot supply a project path. Actual task serialization remains in the existing native control lock, so preparing a reference does not replace the busy guard or create a second background runner.

We **opened = sessions.ensure(id=`session`, principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **reference = materials.reference(root=`kb`, context=access(`opened`,"value"))**.
1. not access(`reference`,"ok")
  Return *reference*.

`args` =

| q | model | gen | reference |
|---|---|---|---|
| `q` | `model` | `gen` | `reference`[^value] |

Return *[既有受控运行器负责执行](dispatch(session=`session`, member="begin", arguments=`args`, principal=`principal`))*.

## upload

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| action | text | "single" | 分块阶段，single 兼容既有小文件调用 |
| total | any | 0 | 文件总大小 |
| upload_id | text | "" | 上传身份 |
| offset | any | 0 | 起始偏移 |
| name | text | required | 文件显示名 |
| data_url | text | required | 原生读取的文件内容 |
| session | text | "default" | 当前会话 |
| epoch | any | 0 | 客户端切换身份 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 包含 epoch、session 与真实路径的 Result |

Use `action`="single", `total`=0, `upload_id`="", `offset`=0, `name`, `data_url`, `session`="default", `epoch`=0 and `principal`="local"。会话归属由 SQLite 核验，文件根来自受信任上下文。上传只进入当前工作目录，不写源码、知识库、认证记录或其他任务。响应回显发起上传时的会话和切换序号，浏览器在用户切换后不会把旧上传状态显示给新会话。

The child call receives filesystem effects only. No file content is converted into an argument that selects an executable, a source entry or a plugin. A successful response means the native atomic bytes write finished. Failures keep their actual error and do not generate an attachment chip.

We **opened = sessions.ensure(id=`session`, principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **ctx = access(`opened`,"value")**.

`args` =

| name | data_url |
|---|---|
| `name` | `data_url` |

1. `action` != "single"
  We **args = table.put(in=`args`, at="action", value=`action`)**.
  We **args = table.put(in=`args`, at="total", value=`total`)**.
  We **args = table.put(in=`args`, at="upload_id", value=`upload_id`)**.
  We **args = table.put(in=`args`, at="offset", value=`offset`)**.
  We **out = transport.control(root=access(`ctx`,"root"), entry=(access(`ctx`,"project") + "/pages/agent/runner.mq.md"), member="manual", arguments=`args`)**.
2. *
  We **out = call.invoke(file=(access(`ctx`,"project") + "/pages/control/context.mq.md"), function="save_upload", arguments=`args`, root=access(`ctx`,"workspace"), effects="fs.read,fs.write,random.read")**.
We **out = table.put(in=`out`, at="session", value=access(`ctx`,"id"))**.
Return *[响应归属于原来的会话](table.put(in=`out`, at="epoch", value=str(`epoch`)))*.

## save_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| label | text | required | 显示名 |
| model | text | required | 供应商模型 |
| endpoint | text | required | 公开 HTTPS API 根 |
| protocol | text | "openai" | 协议 |
| api_key | text | "" | 待加密凭据 |
| thinking | any | False | 思考开关 |
| epoch | any | 0 | 界面切换序号 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 无密钥的保存响应与公开模型清单 |

Use `label`, `model`, `endpoint`, `protocol`="openai", `api_key`="", `thinking`=False, `epoch`=0 and `principal`="local"。只把凭据交给私有保存器，响应不包含原始参数或密文。成功后返回配置身份和公开列表，客户端在直接回调中选择它用于下一轮。验证失败留在表单，不运行模型也不改变任务。

The request is authenticated and same-origin before reaching the gateway. The principal is supplied by the host and cannot be chosen by a form field. A saved profile is not evidence of provider availability; failures on the first real model request remain visible in execution history.

We **saved = models.save(label=`label`, model=`model`, endpoint=`endpoint`, protocol=`protocol`, api_key=`api_key`, thinking=`thinking`, principal=`principal`)**.
1. not access(`saved`,"ok")
  Return *saved*.
We **out = table.put(in=None, at="ok", value=True)**.
We **out = table.put(in=`out`, at="model_id", value=access(`saved`,"value"))**.
We **out = table.put(in=`out`, at="epoch", value=str(`epoch`))**.
We **out = [公开模型名不混入凭据](table.put(in=`out`,at="model_titles",value=models.titles(principal=`principal`)))**.
Return *[响应只包含公开模型](table.put(in=`out`, at="models_html", value=panels.models(entries=models.list(principal=`principal`))))*.

## remove_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 模型身份 |
| epoch | any | 0 | 界面切换序号 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 删除后的公开列表 |

Use `id`, `epoch`=0 and `principal`="local"。只删除自己的配置，返回删掉的身份用于清理当前选择。删除不取消模型作业、不重写回答，也不会把另一个用户的密钥返回到浏览器。新的列表仍来自实际 SQLite，不在界面先假装删除成功。

Public names are refreshed after deletion, keeping the composer label aligned with the remaining owner-scoped configurations.

We **_ = models.remove(id=`id`, principal=`principal`)**.
We **out = table.put(in=None, at="ok", value=True)**.
We **out = table.put(in=`out`, at="removed", value=`id`)**.
We **out = table.put(in=`out`, at="epoch", value=str(`epoch`))**.
We **out = [公开模型名不混入凭据](table.put(in=`out`,at="model_titles",value=models.titles(principal=`principal`)))**.
Return *[真实配置删除后才更新页面](table.put(in=`out`, at="models_html", value=panels.models(entries=models.list(principal=`principal`))))*.

## plugin_catalog

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| epoch | any | 0 | 浏览器切换序号 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前身份的完整插件列表与任务列表 |

Use `epoch`=0 and `principal`="local"。插件清单独立读取真实注册表，不依赖聊天档案、模型回复或执行卡片能否恢复。固有标准库始终展示，所有已登记拓展都保留版本、可用状态与实际授权开关；缺失 ABI 也显示不可用，不能静默省略。读取不修改任何开关，也不会触发模型或工具调用。

This endpoint projects the authenticated owner's preferences over the installed registry. It is not an installation or an optimistic local toggle. Keeping it independent of conversation rendering prevents a damaged or still-loading transcript from leaving the capability dialog empty. The response carries the view epoch so a delayed request cannot replace another workspace's current panel. A failure remains visible instead of being converted into an empty successful list.

We **entries = plugins.catalog(principal=`principal`)**.
We **out = table.put(in=None, at="ok", value=True)**.
We **out = table.put(in=`out`, at="epoch", value=str(`epoch`))**.
We **out = table.put(in=`out`, at="plugins_html", value=panels.plugins(entries=`entries`))**.
We **out = table.put(in=`out`, at="sessions_html", value=panels.sessions(entries=sessions.list(principal=`principal`), selected=""))**.
Return *[真实注册清单完整投影](table.put(in=`out`, at="count", value=table.len(xs=`entries`)))*.


## artifact_download

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 已登记会话 |
| id | text | "" | 已登记产物 |
| format | text | "binary" | binary 或 source |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 原生字节响应；归属错误原样失败 |

Use `session`="default", `id`="", `format`="binary" and `principal`="local"。下载先经过同一份会话所有权登记，再进入狭窄工作根。浏览器不能选择服务器路径，普通用户也不能把自己的产物身份套在别人的会话上。文件不存在、摘要改变或超过响应上限时明确失败，不返回另一份静态文件代替。

We **opened = sessions.ensure(id=`session`,principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **ctx = access(`opened`,"value")**.
We **args = table.put(in=None,at="id",value=`id`)**.
We **args = table.put(in=`args`,at="format",value=`format`)**.
Return *[身份通过后才读取字节](call.invoke(file=(access(`ctx`,"project") + "/pages/agent/artifacts.mq.md"),function="download",arguments=`args`,root=access(`ctx`,"workspace"),effects="fs.read"))*.

## artifact_preview

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 已登记会话 |
| id | text | "" | 产物身份 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安全 Markdown 内容预览 |

Use `session`="default", `id`="" and `principal`="local"。预览同样是受认证的会话能力，不把私有工作区挂在公共静态目录。它只阅读登记的源稿，并复用已有组件渲染器。Office 版式与 Markdown 内容预览有明确区别，错误时显示普通提示，不把用户输入当作页面模板执行。

We **opened = sessions.ensure(id=`session`,principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *"无法访问此任务文稿。"*.
We **ctx = access(`opened`,"value")**.
Return *[预览已登记文稿](call.invoke(file=(access(`ctx`,"project") + "/pages/agent/artifacts.mq.md"),function="preview",arguments=table.put(in=None,at="id",value=`id`),root=access(`ctx`,"workspace"),effects="plugin,fs.read"))*.


## inspect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 当前会话 |
| epoch | any | 0 | 视图序号 |
| request_id | any | 0 | 预览请求序号 |
| action | text | "files" | files 或 preview |
| path | text | "" | 工作根相对文件 |
| artifact | text | "" | 已登记产物 |
| principal | text | "local" | 宿主身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前会话只读文件列表或内容 |

Use `session`="default", `epoch`=0, `request_id`=0, `action`="files", `path`="", `artifact`="" and `principal`="local"。所有权先检查，之后在该会话狭窄工作根调用固定阅读模块。浏览器不能指定工程路径或执行源码。视图与预览序号分别回显，快速切换文件时过期结果不会覆盖后来选择。这个控制入口不启动模型，不变更任务和插件，也不从预览内容授予权限。

The service separates authentication from filesystem scope. The native host supplies the principal, the session manager checks ownership, and the child reader gets the narrower workspace root. A query cannot choose a project directory or another source entry. Request ids are ordering data rather than authentication tokens; both boundaries are necessary. This service remains read-only with respect to agent actions and never resumes a task on behalf of a preview.

File-list errors remain failures and are never reclassified as an empty successful directory.

We **opened = sessions.ensure(id=`session`,principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **ctx = access(`opened`,"value")**.
We **file = access(`ctx`,"project") + "/pages/agent/previews.mq.md"**.
We **member = "files"** and **args = table.empty_map()**.
1. `action` == "preview"
  We **member = "show"**.
  We **args = table.put(in=None,at="path",value=`path`)**.
  We **args = table.put(in=`args`,at="artifact",value=`artifact`)**.
We **actual = call.invoke(file=`file`,function=`member`,arguments=`args`,root=access(`ctx`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,random.read")**.
We **out = table.put(in=None,at="ok",value=True)**.
1. `member` == "files"
  We **out = table.put(in=`out`,at="files_html",value=`actual`)**.
2. *
  We **out = table.put(in=`actual`,at="ok",value=True)**.
1. text.starts_with(text=json.stringify(value=`actual`),prefix="{") and json.get(value=`actual`,key="ok") == False
  We **out = table.put(in=`out`,at="ok",value=False)**.
We **out = table.put(in=`out`,at="epoch",value=str(`epoch`))**.
We **out = table.put(in=`out`,at="session",value=access(`ctx`,"id"))**.
Return *[只回显已归属的读取](table.put(in=`out`,at="request_id",value=str(`request_id`)))*.


## messages

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | "default" | 真实任务 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 以真实消息边界渲染的历史；当前回答保持独立 |

Use `session`="default" and `principal`="local"。会话归属通过后，从 SQLite 的真实 question、answer 边界生成对话，不从模型 Markdown 里的标题猜测角色。用户问题和助手回答分别是原生组件块，当前回答仍由任务快照单独更新，执行记录在中间保留自己的节点。

The renderer keeps persistence unchanged. It does not rewrite an archive, reconstruct a missing tool receipt or treat a heading in a model answer as a user message. The last row contributes its user question only; its current answer remains the independent reply target. Earlier complete turns contribute both roles. This preserves the reading order around the current execution trace.

The query is bounded to recent turns and binds the owner-checked task identity twice. Legacy archives without structured rows remain available through the existing fallback renderer. No other task's content is selected by a display title or a guessed directory. Raw Markdown is passed to the existing safe component renderer and is never executed.

A user block is visually distinct but not a second editor. Assistant content keeps headings, lists, tables and code fences naturally. Navigation, inspector and composer updates cannot replace these message boundaries, which makes the harness behave like a conversation rather than a single changing documentation page.

We **opened = sessions.ensure(id=`session`,principal=`principal`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **id = access(access(`opened`,"value"),"id")**.
We **args = table.append(list=table.empty_list(),item=`id`)**.
We **args = table.append(list=`args`,item=`id`)**.
We **rows = store.query(sql="SELECT turn,question,answer FROM qd_messages WHERE task_id=? AND turn >= (SELECT COALESCE(MAX(turn),0)-30 FROM qd_messages WHERE task_id=?) ORDER BY turn",args=`args`)**.
We **nodes = table.empty_list()** and **n = 0** and **count = table.len(xs=`rows`)**.
- [角色来自真实消息记录](for rows as row)
  We **n = `n` + 1**.
  We **nodes = table.concat(a=`nodes`,b=ui.message(source=access(`row`,"question"),role="user"))**.
  1. `n` < `count`
    We **nodes = table.concat(a=`nodes`,b=ui.message(source=access(`row`,"answer"),role="assistant"))**.
Return *[对话正文与阅读器共享原生 Markdown](table.put(in=table.put(in=None,at="html",value=ui.render(nodes=`nodes`)),at="count",value=`count`))*.

## model_catalog

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| epoch | any | 0 | 当前视图序号 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前账号公开模型目录 |

Use `epoch`=0 and `principal`="local"。模型选择独立读取配置目录，不等待会话锁、历史渲染或插件目录。这里只投影公开名称和不透明身份，不访问推理服务，不解密或返回凭据。没有模型与读取失败分别展示；列表返回并不证明远程服务在线。

The authenticated gateway injects the owner. Opening this catalogue cannot start a task or change a running worker. The response epoch only filters stale browser observations and never selects a filesystem root. Default adoption remains a direct client decision before the user's first explicit choice.

We **entries = models.list(principal=`principal`)**.
We **out = table.put(in=None,at="ok",value=True)**.
We **out = table.put(in=`out`,at="epoch",value=str(`epoch`))**.
We **out = table.put(in=`out`,at="models_html",value=panels.models(entries=`entries`))**.
We **out = table.put(in=`out`,at="default_model",value=models.preferred(principal=`principal`))**.
Return *[只返回账号可见的目录](table.put(in=`out`,at="model_titles",value=models.titles(principal=`principal`)))*.

---
markup: occlusion
title: 阅读器上的最小产品布局
import:
  ui: ../agent/ui.mq.md
  workspace: workspace.mq.md
  model_form: models.mq.md
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
  hash: lib/hash.mq.md
  fs: lib/fs.mq.md
---

先把输入栏、能力面板、会话面板和执行经过拆开，再组合。叶节点是 Markdown、普通文字或原生控件；不把完整页面藏进 HTML 字符串，不编写第二套 JavaScript。官方 View 保留阅读正文与设置能力。

## panel

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 固定面板身份 |
| title | text | required | 可读标题 |
| description | text | required | 职责说明 |
| children | list | required | 最小内容块 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 带固定关闭按钮和正文区域的面板 |

Use `id`, `title`, `description` and `children`。面板仅管理布局，实际动态内容由服务端能力登记或会话读取产生。标题与说明使用 Markdown，关闭按钮使用原生控件，不能把业务事件塞进 HTML 属性。

A panel is a dialog for an explicit selection, with its own accessible label and close control. The client sets aria-hidden together with visibility classes, while the stylesheet centers the dialog above the shared backdrop. The background conversation and composer become inert until the panel closes. Keeping this policy outside the children allows plugin cards and session lists to refresh without changing the overlay's identity or losing the user's typed new-session title.

We **close = [原生关闭操作](ui.button(text="关闭", id=(`id` + "-close")))**.
We **heading = [说明就是阅读内容](component.markdown(text=("## " + `title` + "\n\n" + `description`)))**.
We **nodes = [先说明再给内容](table.concat(a=table.concat(a=`close`, b=`heading`), b=`children`))**.
We **attrs = table.put(in=None, at="aria-label", value=`title`)**.
We **attrs = table.put(in=`attrs`, at="role", value="dialog")**.
We **attrs = table.put(in=`attrs`, at="aria-modal", value="true")**.
We **attrs = table.put(in=`attrs`, at="aria-hidden", value="true")**.
Return *[面板复用原生容器](ui.region(children=`nodes`, id=`id`, style="mq-panel", kind="aside", attrs=`attrs`))*.

## toolbar

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 独立的多行输入、模型选择、附件与发送控制 |

输入区只负责构造下一次任务。正文在上，附件和模型在下，发送与停止是明确的独立操作。插件、会话和知识入口已经移到侧栏，避免用户在发送时误切换环境。原生文件选择仍有浏览器授权和后端大小限制；改布局不改变上传协议。

The composer retains the existing control identities, so Enter, Send, Stop and file upload continue through their production callbacks. A model choice affects the next task rather than the running worker. The textarea remains a native multi-line control and does not become an editable HTML region. Status is a separate live region, never fabricated from animation.

The layout has three minimal parts: editable task text, attachment and model controls, and the actual send/stop actions. On a narrow screen the control row wraps without hiding the upload or current-model entry. The component renderer owns labels and attributes. No business JavaScript or model-generated markup is introduced.

The status sits inside the composer action row, matching the reference spacing without creating a second floating footer.

The send control has one job and the stop control has another. A running task keeps its model and permission snapshot under server control, so changing the picker does not rewrite the current job. An uploaded file remains pending until the existing server protocol confirms persistence. The composer therefore keeps its status separate from its editable text. Users can keep reading a document while writing a follow-up, and neither panel updates nor task polling should clear that draft. Keyboard handling distinguishes a normal Enter from Shift+Enter and input-method confirmation through explicit host event fields.

`input_attrs` =

| id | rows | placeholder | aria-label |
|---|---|---|---|
| "chat-input" | 3 | "给求道一个明确的目标…" | "任务内容" |

We **input = component.element(kind="textarea",attrs=`input_attrs`,style="mq-input")**.
We **upload = component.element(kind="input",attrs=table.put(in=table.put(in=None,at="id",value="chat-file"),at="type",value="file"),style="mq-tool-native")**.
We **label = component.element(kind="label",value="添加附件",attrs=table.put(in=None,at="for",value="chat-file"),style="mq-tool-label")**.
We **attach = ui.region(children=table.concat(a=`label`,b=`upload`),style="mq-upload")**.
We **model = ui.button(text="选择模型",id="tab-model",style="qd-model-picker")**.
We **plus = component.element(kind="label",value="＋",attrs=table.put(in=table.put(in=None,at="for",value="chat-file"),at="aria-label",value="上传文件"),style="qd-composer-plus")**.
We **choices = ui.region(children=table.concat(a=`plus`,b=table.concat(a=`attach`,b=`model`)),kind="row",style="qd-composer-tools")**.
We **send = ui.button(text="发送",id="chat-send",style="mq-send qd-icon-send")**.
We **stop = ui.button(text="停止",id="chat-stop",style="mq-halt",disabled=True)**.
We **actions = ui.region(children=table.concat(a=`send`,b=`stop`),kind="row",style="mq-action")**.
We **status = ui.text_node(text="正在恢复任务…",id="chat-status",style="qd-live-status")**.
We **bottom = ui.region(children=table.concat(a=`choices`,b=table.concat(a=`status`,b=`actions`)),kind="row",style="qd-composer-bottom")**.
We **composer = ui.region(children=table.concat(a=`input`,b=`bottom`),id="qd-chrome",style="mq-chrome")**.
Return *[输入与状态各有位置](ui.region(children=`composer`,style="qd-composer-dock"))*.

## panels

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 模型、插件、知识库和工作区四个选择面板 |

动态区域初始为空，等待真实服务结果，不预置演示插件或伪执行进度。创建任务输入位于列表之外，因此刷新列表不会删掉正在编辑的标题。执行经过在对话内的独立区域，面板只承载选择操作。

The four panels share only their layout contract. A model panel describes the next model choice. A plugin panel is filled from the installed capability registry. A workspace panel contains task creation plus a separately replaceable list. Knowledge choices list only actual installed roots. The execution timeline belongs to the conversation, between the question and the latest answer.

The create input must remain outside panel-workspace-body. A service response may refresh the list while the user is typing another task title; replacing only the list preserves that input. The title itself is natural language, while the server assigns the opaque session identity. A selected task can continue to run while another is viewed.

The timeline begins empty and receives cards only after actual events or a restored session snapshot. Its parent is not inside structure, the answer-update container. This arrangement prevents a longer Markdown response from recreating all cards. The client then preserves each card's detail region during ordinary polling and updates just status and output leaves.

Closing a panel only changes its visibility. It does not discard history, stop a worker or clear the user's expanded-state record. Reading the inline execution timeline is not a request to repeat an operation. Dynamic controls use delegated events from these stable parent ids, so an appended card is clickable without writing new JavaScript listeners.

Descriptions use simple Markdown, while inputs, labels and buttons use native elements. If a panel needs columns later, split those columns into containers first, then make each leaf simple readable content. Do not replace this organization with a large raw HTML string merely because the generated page is HTML internally.

We **models = [可以不选择模型](ui.button(text="none · 暂不运行模型", id="model-none", style="mq-model-opt is-active"))**.
We **models = [模型由账号配置枚举](table.concat(a=`models`,b=ui.text_node(text="在下方选择账号已有模型，或添加自己的模型服务。")))**.
We **models = [当前选择的可读提示](table.concat(a=`models`, b=ui.text_node(text="none", id="chat-model-label")))**.
We **models = table.concat(a=`models`, b=ui.region(children=table.empty_list(), id="panel-model-body"))**.
We **models = table.concat(a=component.markdown(text="## 我的模型\n\n选择下一轮使用的模型。"), b=`models`)**.
We **models = table.concat(a=`models`,b=ui.button(text="管理模型与连接服务",id="model-manage",style="qd-model-manage"))**.
We **choices = ui.region(children=`models`, style="qd-model-library")**.
We **form = table.concat(a=component.markdown(text="## 添加模型\n\n连接你的模型服务。"), b=model_form.form())**.
We **form = ui.region(children=`form`, style="qd-model-editor")**.
We **models = ui.region(children=table.concat(a=`choices`, b=`form`), style="qd-model-layout")**.
We **out = [模型面板](panel(id="panel-model", title="选择模型", description="选择本机模型或配置自己的远程服务。模型决策和接口返回的思考文本在对话中展开阅读。", children=`models`))**.
We **plugin_body = [能力来自实际目录](ui.region(children=table.empty_list(), id="panel-plugins-body"))**.
We **out = [能力面板](table.concat(a=`out`, b=panel(id="panel-plugins", title="插件与固有能力", description="标准库始终启用。拓展即插件，开关决定智能体下一次实际调用的授权。", children=`plugin_body`)))**.

`title_attrs` =

| id | placeholder | aria-label |
|---|---|---|
| "session-title" | "新任务名称" | "新任务名称" |

We **input = [任务标题叶节点](component.element(kind="input", attrs=`title_attrs`, style="qd-session-input"))**.
We **create = [明确建立独立目录](ui.button(text="新建任务", id="session-create"))**.
We **form = [任务创建最小布局](ui.region(children=table.concat(a=`input`, b=`create`), kind="row", style="qd-session-create"))**.
We **list = [列表在侧栏中持续可见](ui.text_node(text="新建后将拥有独立的对话、文件和执行记录。"))**.
We **out = [会话管理面板](table.concat(a=`out`, b=panel(id="panel-workspace", title="工作区与会话", description="切换会话不会停止其他任务。每个任务独立保存对话、文件和执行记录。", children=table.concat(a=`form`, b=`list`))))**.
We **knowledge = [真实知识库列表](ui.region(children=table.empty_list(), id="panel-kb-body"))**.
Return *[选择下一轮的知识来源](table.concat(a=`out`, b=panel(id="panel-kb", title="知识库", description="选择已有知识库作为下一轮的参考材料；不选择时只使用对话和工作文件。", children=`knowledge`)))*.

## render

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | MQ 源码生成的产品壳片段 |

只装配官方桥接和本工程的 Marqdo 客户端。源码摘要用作缓存身份，每次修改立即获得新地址，不手改生成片段版本号。样式与布局分开，最终输出由已有组件渲染器生成。

The shell is generated from the current callable layout rather than a hand-edited generated fragment. Its only script asset is the already installed official Marqdo bridge. That bridge loads the existing WASM and this project's .mq.md event source; model text never supplies another script URL.

The source hash changes when client behavior changes, preventing a fixed cache key from serving stale handlers. Both stylesheet assets are declarations, not business programs. Build the task stylesheet from its documented resource before rendering this shell. The output is a component-generated fragment that the launcher attaches to the official View page, preserving its reader settings and document structure.

The cache identity also includes the layout and stylesheet source, so a visual-only change receives a fresh asset address.

The bridge source is part of the asset digest too, so a compatible host ABI update cannot be paired with a cached older runtime.

The precision resource is hashed with the component tree, so a spacing or icon change cannot remain hidden behind a cached stylesheet.

The current workspace component source also participates in the asset digest. A navigation-only refactor must not reuse a stale client asset identity.

We **version = [内容摘要标识当前客户端](hash.sha256(text=(fs.read_text(path="pages/public/client.mq.md") + fs.read_text(path="pages/views/shell.mq.md") + fs.read_text(path="pages/views/styles.mq.md") + fs.read_text(path="pages/views/precision.mq.md") + fs.read_text(path="pages/views/models.mq.md") + fs.read_text(path="pages/views/workspace.mq.md") + fs.read_text(path="pages/public/generated/marqdo-bridge.js"))))**.

`bridge_attrs` =

| type | data-mq-wasm | data-mq-source-url | data-mq-ready |
|---|---|---|---|
| "module" | "/static/generated/marqdo_wasm.wasm" | "/static/client.mq.md?v=" + `version` | "#chat-status" |

We **style = [沿用已有阅读壳视觉](component.asset(url="/static/generated/qd-overlay.css", kind="stylesheet"))**.
We **style = [叠加本轮组件样式](table.concat(a=`style`, b=component.asset(url=("/static/generated/qd-task.css?v=" + `version`), kind="stylesheet")))**.
We **bridge = [仅使用官方浏览器桥接](component.asset(url=("/static/generated/marqdo-bridge.js?v=" + `version`), kind="script", attrs=`bridge_attrs`))**.
We **backdrop = [点击遮罩关闭选择浮层](ui.button(text="关闭面板", id="qd-backdrop", style="qd-backdrop"))**.
We **nodes = [先资源再最小布局](table.concat(a=`style`, b=table.concat(a=`backdrop`, b=table.concat(a=toolbar(), b=panels()))))**.
We **workspace_nodes = table.concat(a=workspace.sidebar(),b=table.concat(a=workspace.header(),b=workspace.inspector()))**.
We **nodes = table.concat(a=`nodes`,b=table.concat(a=`workspace_nodes`,b=workspace.separators()))**.
Return *[组件生成实际宿主片段](ui.render(nodes=table.concat(a=`nodes`, b=`bridge`)))*.

## conversation

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 问题、紧凑执行记录和回复组成的稳定对话区域 |

执行经过就在对话中：先读用户问题，再看可折叠的实际行动，最后读普通 Markdown 回答。三个区域分别更新，因此答案变长不会重建已展开的步骤。时间线不再需要工具栏入口，不会在提交任务时弹出遮挡正文的面板。没有真实事件时不显示空的执行标题。

History and the current answer are ordinary Markdown rendered by the existing Web library. The trace is a sibling with stable ids, so polling can patch its status and result leaves without losing an expanded detail. This is a content layout, not another overlay. Smaller type and muted borders distinguish receipts from the assistant's prose, while each real running stage retains its existing animation. The component renderer owns all HTML, and labels never contain executable code.

The workbench is a stable sibling of the execution timeline. A new plan or artifact may update that region while an expanded tool card stays in the same DOM node.

Return *[原生对话节点生成片段](ui.render(nodes=conversation_nodes()))*.


## conversation_nodes

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 对话与执行的原生最小布局节点 |

对话、工作计划、执行经过和答文是相邻且独立的区域。轮询只更新各自叶节点，预览不会重建它们。这里返回节点而非字符串页面，允许产品布局直接组合，避免旧文档壳和新应用壳同时出现在 DOM 中。没有真实数据的部分保持空白，不制造进度。

Each sibling has a distinct update contract: history changes at turn boundaries, the plan and artifact summary changes when workspace facts change, the trace receives real span updates, and the reply changes as the current answer changes. A preview pane is outside all four targets. Keeping this organization explicit prevents a visual refactor from resetting expanded details or rendering model Markdown as executable Marqdo. The same nodes are used by production assembly and browser fixtures, so a test cannot pass by showing an unrelated static mockup.

We **history = [真实 Markdown 历史](ui.region(children=table.empty_list(), id="qd-dialogue"))**.
We **heading = [小字号的经过标题](ui.text_node(text="执行经过", style="qd-execution-title"))**.
We **trace = [轮询只更新步骤叶节点](ui.region(children=table.empty_list(), id="qd-trace", attrs=table.put(in=None, at="aria-live", value="polite")))**.
We **execution = [对话内的行动记录](ui.region(children=table.concat(a=`heading`, b=`trace`), id="qd-execution", style="qd-execution"))**.
We **workbench = [计划、子任务与真实产物](ui.region(children=table.empty_list(),id="qd-workbench",style="qd-workbench"))**.
We **execution = table.concat(a=`workbench`,b=`execution`)**.
We **reply = [独立的当前回答](ui.region(children=table.empty_list(), id="qd-reply"))**.
Return *[按人类阅读顺序装配](ui.region(children=table.concat(a=`history`, b=table.concat(a=`execution`, b=`reply`)), id="qd-conversation", style="qd-conversation"))*.


## canvas

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 独立工作台的对话阅读面 |

产品画布使用原生组件组装，不保留无关静态手册、旧导航或重复阅读器标题。View 的样式资源继续沿用，具体 Marqdo 文件在检查区使用原生 DocumentViewV1。结构分开后只有一套会话导航与输入框，不会出现两个 id 相同的阅读区域。

The application keeps the official reader resources but has its own document root. This removes the old static manual, duplicate navigation and unused reading controls from the conversation. The original Marqdo renderer remains responsible for actual .mq.md previews. Component composition supplies the application structure and the browser source supplies interactions; generated HTML is never edited as a second source of truth.

Return *[原生组件组成应用阅读面](ui.render(nodes=ui.region(children=conversation_nodes(),id="structure",style="reader-content")))*.

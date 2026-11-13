---
markup: occlusion
title: 求道工作台：设计稿的原生组件
import:
  ui: ../agent/ui.mq.md
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
---



## sidebar

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 与设计图一致的品牌、工作区选择、任务列表与底部导航 |

界面采用原生最小布局组件，固定身份仅表示可更新区域和明确操作。内容来自真实会话、文件或运行记录，空状态不会预造任务、完成比例或下载。布局变化不能执行文档、启动模型或授予额外文件权限。每个按钮都有单独的 Marqdo 事件入口，业务判断不进入 HTML 属性。

The component tree separates navigation, conversation and reading surfaces. It preserves stable update targets across ordinary polling, so resizing or changing a reading tab cannot recreate expanded execution details. Native elements own accessible roles and keyboard focus. The host adapter supplies pointer coordinates only; application source decides widths, bounds, persistence and visible state. Mobile navigation reuses this tree rather than creating another task identity. Labels remain escaped text and document content remains read-only. Each pane retains its own scroll surface and an explicit close or recovery control.

品牌区先拆成单独的 Q 字标与中文、英文名称，再与工作区选择器组合，避免用一张设计图当成整个可点击界面。任务列表单独滚动，底部文件、知识、插件与设置保持可达。任务仍运行时可以查看别的任务，导航并不代表取消。工作区选择打开实际任务管理表单，不产生模型请求。

The workspace selector, New Task button, recent task list and environment links occupy separate native blocks. Their alignment follows the reference canvas while their labels still come from real application state. An empty list is not populated with attractive sample names. Long titles wrap within the current pane width, internal workspace paths remain available as scoped metadata, and bottom navigation does not disappear when many tasks exist. The brand mark is presentation, never another navigation or authentication state.

We **mark = ui.text_node(text="Q",style="qd-brand-mark")**.
We **name = ui.region(children=table.concat(a=ui.text_node(text="求道",style="qd-brand"),b=ui.text_node(text="QIUDAO",style="qd-brand-caption")),style="qd-brand-name")**.
We **brand = ui.region(children=table.concat(a=`mark`,b=`name`),style="qd-brand-lockup")**.
We **switch = ui.button(text="默认工作区",id="workspace-switch",style="qd-workspace-switch qd-icon-workspace")**.
We **create = ui.button(text="新建任务",id="tab-workspace",style="qd-new-task")**.
We **tasks = ui.region(children=table.empty_list(),id="panel-workspace-body",style="qd-sidebar-tasks")**.
We **top = table.concat(a=`brand`,b=table.concat(a=`switch`,b=table.concat(a=`create`,b=table.concat(a=ui.text_node(text="最近任务",style="qd-nav-caption"),b=`tasks`))))**.
We **links = ui.button(text="文件",id="nav-files",style="qd-nav-item qd-icon-folder")**.
We **links = table.concat(a=`links`,b=ui.button(text="知识库",id="tab-kb",style="qd-nav-item qd-icon-book"))**.
We **links = table.concat(a=`links`,b=ui.button(text="插件",id="tab-plugins",style="qd-nav-item qd-icon-plugin"))**.
We **links = table.concat(a=`links`,b=ui.button(text="设置",id="nav-settings",style="qd-nav-item qd-icon-settings"))**.
Return *[稳定导航与真实任务](ui.region(children=table.concat(a=ui.region(children=`top`,style="qd-sidebar-top"),b=ui.region(children=`links`,style="qd-sidebar-footer")),id="qd-sidebar",kind="aside",style="qd-sidebar"))*.

## header

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 工作区面包屑和文件区开关 |

界面采用原生最小布局组件，固定身份仅表示可更新区域和明确操作。内容来自真实会话、文件或运行记录，空状态不会预造任务、完成比例或下载。布局变化不能执行文档、启动模型或授予额外文件权限。每个按钮都有单独的 Marqdo 事件入口，业务判断不进入 HTML 属性。

The component tree separates navigation, conversation and reading surfaces. It preserves stable update targets across ordinary polling, so resizing or changing a reading tab cannot recreate expanded execution details. Native elements own accessible roles and keyboard focus. The host adapter supplies pointer coordinates only; application source decides widths, bounds, persistence and visible state. Mobile navigation reuses this tree rather than creating another task identity. Labels remain escaped text and document content remains read-only. Each pane retains its own scroll surface and an explicit close or recovery control.

We **menu = ui.button(text="菜单",id="nav-toggle",style="qd-mobile-menu qd-icon-menu")**.
We **scope = ui.text_node(text="工作区",style="qd-breadcrumb-scope qd-icon-workspace")**.
We **title = ui.text_node(text="默认工作区",id="qd-workspace-title",style="qd-workspace-title")**.
We **files = ui.button(text="产物面板",id="inspector-toggle",style="qd-header-files")**.
Return *[位置与阅读状态](ui.region(children=table.concat(a=`menu`,b=table.concat(a=`scope`,b=table.concat(a=`title`,b=`files`))),kind="header",style="qd-workspace-header"))*.

## inspector

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 具有原生阅读工具栏、源码和独立滚动区的产物面板 |

界面采用原生最小布局组件，固定身份仅表示可更新区域和明确操作。内容来自真实会话、文件或运行记录，空状态不会预造任务、完成比例或下载。布局变化不能执行文档、启动模型或授予额外文件权限。每个按钮都有单独的 Marqdo 事件入口，业务判断不进入 HTML 属性。

The component tree separates navigation, conversation and reading surfaces. It preserves stable update targets across ordinary polling, so resizing or changing a reading tab cannot recreate expanded execution details. Native elements own accessible roles and keyboard focus. The host adapter supplies pointer coordinates only; application source decides widths, bounds, persistence and visible state. Mobile navigation reuses this tree rather than creating another task identity. Labels remain escaped text and document content remains read-only. Each pane retains its own scroll surface and an explicit close or recovery control.

阅读工具只处理已通过所有权检查的当前文档。源码使用独立的普通 pre 文字节点，下载保存当前读取版本。全屏只改变检查区的可用空间；返回对话不会清除文稿。没有文档时工具栏隐藏，不能留下无效按钮。

检查区按标签、文件索引、文稿标题、阅读工具条、正文和下载拆分。正文为空时阅读工具条和下载按钮也一起隐藏。用户没有文件时应看到解释性空态，而不是一排无法使用的图标。文件后来生成时索引可以刷新，已选择的文稿保持稳定，避免正在阅读的内容被轮询替换。

The artifact and process tabs are views over different evidence. Artifact cards represent existing registered files, while process summaries represent actual events. Neither tab infers success from the model's wording. The filename is an escaped label and the document body is a sanitized rendering supplied by the trusted reader. Source mode uses a separate pre node populated with text effects, ensuring markup in the source cannot become application DOM. Download uses only the accepted source snapshot.

The reading frame has its own toolbar and boundary. Expanding it changes available space without modifying saved widths, choosing a model or starting a new task. Closing the inspector preserves the selected manuscript; changing tasks invalidates the old document request. These controls must continue to work when the pane is wider or narrower than the reference, so they use flexible native rows rather than absolute coordinates within an image. Static icons are CSS resources and receive their action from readable Marqdo bindings.

A missing preview is distinguishable from an unavailable read. The empty state explains where future material appears, and an actual read failure stays visible instead of claiming a generated artifact exists.

We **files = ui.button(text="产物",id="inspector-files",style="qd-inspector-tab is-active")**.
We **activity = ui.button(text="过程",id="inspector-activity",style="qd-inspector-tab")**.
We **close = ui.button(text="关闭",id="inspector-close",style="qd-inspector-close")**.
We **tabs = ui.region(children=table.concat(a=`files`,b=table.concat(a=`activity`,b=`close`)),style="qd-inspector-tabs")**.
We **list = ui.region(children=table.empty_list(),id="qd-workspace-files",style="qd-workspace-files")**.
We **list = table.concat(a=`list`,b=ui.region(children=table.empty_list(),id="qd-inspector-body"))**.
We **title = ui.text_node(text="",id="qd-preview-title",style="qd-preview-file qd-icon-file")**.
We **brand = ui.text_node(text="Marqdo View",style="qd-reader-brand")**.
We **tools = ui.button(text="源码",id="preview-source",style="qd-reader-tool qd-icon-code")**.
We **tools = table.concat(a=`tools`,b=ui.button(text="全屏阅读",id="preview-expand",style="qd-reader-tool qd-icon-expand"))**.
We **bar = ui.region(children=table.concat(a=`brand`,b=ui.region(children=`tools`,style="qd-reader-actions")),style="qd-reader-toolbar")**.
We **body = ui.region(children=table.empty_list(),id="qd-preview",style="qd-preview")**.
We **source = component.element(kind="pre",attrs=table.put(in=None,at="id",value="qd-preview-source"),style="qd-preview-source")**.
We **read = ui.region(children=table.concat(a=`bar`,b=table.concat(a=`body`,b=`source`)),style="qd-reader-frame")**.
We **download = ui.button(text="下载源稿",id="preview-download",style="qd-reader-download qd-icon-download")**.
We **preview = ui.region(children=table.concat(a=`title`,b=table.concat(a=`read`,b=`download`)),style="qd-preview-document")**.
We **empty = ui.region(children=table.concat(a=ui.text_node(text="交付成果，触手可及",style="qd-inspector-empty-title"),b=ui.text_node(text="任务生成的文档和演示将在这里汇集。选择文件，即可留在对话旁阅读。",style="qd-inspector-empty-copy")),style="qd-inspector-empty")**.
We **activity = ui.region(children=ui.text_node(text="尚无执行记录。",style="qd-empty-note"),id="qd-inspector-activity",style="qd-inspector-activity")**.
Return *[独立的文稿阅读面](ui.region(children=table.concat(a=`tabs`,b=table.concat(a=`list`,b=table.concat(a=`empty`,b=table.concat(a=`preview`,b=`activity`)))),id="qd-inspector",kind="aside",style="qd-inspector"))*.

## separators

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 可聚焦、可拖拽和可用方向键调节的双侧分隔条 |

界面采用原生最小布局组件，固定身份仅表示可更新区域和明确操作。内容来自真实会话、文件或运行记录，空状态不会预造任务、完成比例或下载。布局变化不能执行文档、启动模型或授予额外文件权限。每个按钮都有单独的 Marqdo 事件入口，业务判断不进入 HTML 属性。

The component tree separates navigation, conversation and reading surfaces. It preserves stable update targets across ordinary polling, so resizing or changing a reading tab cannot recreate expanded execution details. Native elements own accessible roles and keyboard focus. The host adapter supplies pointer coordinates only; application source decides widths, bounds, persistence and visible state. Mobile navigation reuses this tree rather than creating another task identity. Labels remain escaped text and document content remains read-only. Each pane retains its own scroll surface and an explicit close or recovery control.

分隔条是原生可聚焦元素，具有 separator 角色、垂直方向和明确的宽度范围。指针捕获只保证拖出六像素手柄以后仍能结束操作。双击恢复设计尺寸，方向键每次调整十六像素，Home 恢复该侧默认值；这些规则全部由客户端源码实现。

The current width is exposed through aria-valuenow after every accepted adjustment. Keyboard focus remains visible even when the thin visual divider is otherwise quiet.

We **attrs = table.put(in=None,at="role",value="separator")**.
We **attrs = table.put(in=`attrs`,at="tabindex",value=0)**.
We **attrs = table.put(in=`attrs`,at="aria-orientation",value="vertical")**.
We **attrs = table.put(in=`attrs`,at="data-pointer-capture",value="true")**.
We **left = table.put(in=`attrs`,at="aria-label",value="调整任务侧栏宽度")**.
We **left = table.put(in=`left`,at="aria-valuemin",value=220)**.
We **left = table.put(in=`left`,at="aria-valuemax",value=440)**.
We **left = table.put(in=`left`,at="aria-valuenow",value=267)**.
We **right = table.put(in=`attrs`,at="aria-label",value="调整文档面板宽度")**.
We **right = table.put(in=`right`,at="aria-valuemin",value=320)**.
We **right = table.put(in=`right`,at="aria-valuemax",value=760)**.
We **right = table.put(in=`right`,at="aria-valuenow",value=496)**.
Return *[边界也是原生组件](table.concat(a=ui.region(children=table.empty_list(),id="resize-sidebar",style="qd-pane-separator qd-resize-sidebar",attrs=`left`),b=ui.region(children=table.empty_list(),id="resize-inspector",style="qd-pane-separator qd-resize-inspector",attrs=`right`)))*.

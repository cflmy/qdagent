---
markup: occlusion
title: 同构阅读与原生控件
import:
  component: ext/web/component/index.mq.md
  web: ext/web/web.mq.md
  table: lib/table.mq.md
  re: lib/re.mq.md
---

对话使用普通 Markdown，工具、会话和插件界面使用同一套 View 节点。这个文件只负责把既有
Web 拓展的结果嵌入阅读器，不解释 Marqdo 程序，也不执行 Markdown 中的函数。
正文和控件分别由所属模块组装，最后共享阅读器字体、颜色与空间尺度。

## render

| 参数 | 类型 | 说明 |
|---|---|---|
| nodes | list | 已完成最小布局拆分的 View 节点 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 可放入阅读面的官方渲染片段 |

Use `nodes`。使用现有 Web 文档渲染器的 bare 布局，保留真实节点，只去掉宿主包装及默认
内联样式，避免它把阅读器字体重置为另一套界面。此处的正则仅处理自己请求的 HTML 外壳，
Markdown 的解析、普通 HTML 的过滤和参数转义全部由原有拓展完成。

The component renderer owns the markup. This adapter removes the page wrapper, rather than inventing
a second renderer or concatenating user values into tags. A component keeps its stable id so later
browser effects can update one region without destroying its surrounding controls.

We **page = [建立原生文档](web.page(nodes=`nodes`))**.
We **page = [最小宿主布局](table.put(in=`page`, at="layout", value="bare"))**.
We **page = [沿用阅读器样式](table.put(in=`page`, at="shell_css", value="off"))**.
We **html = [让已有插件生成实际 HTML](web.render(doc=`page`))**.
We **body = [取得真实正文](re.find(text=`html`, pattern="(?s)<body[^>]*>.*</body>"))**.
We **body = [去掉重复的样式声明](re.replace(text=`body`, pattern="(?s)<style>.*?</style>", with=""))**.
Return *[只移除宿主外壳](re.replace(text=`body`, pattern="(?s)^<body[^>]*>\\s*<main[^>]*>|</main>\\s*</body>$", with=""))*.

## text_node

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| text | text | required | 控件的普通文字 |
| style | text | "" | 已声明的样式类 |
| id | text | "" | 可更新的节点身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 一个原生文本节点 |

Use `text`, `style`="" and `id`=""。输入是普通文字，原生元素渲染器负责转义，
不把工具输出解释成 HTML。标题、状态和时间标签可以共用这个叶节点，复杂排版仍拆成容器。
Stable identifiers describe UI targets only; they are never paths or executable tool names.

We **attrs = [保留节点身份](table.put(in=None, at="id", value=`id`))**.
Return *[普通文字叶节点](component.element(kind="label", value=`text`, attrs=`attrs`, style=`style`))*.

## region

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| children | list | required | 已拆分的子块 |
| id | text | "" | 稳定更新区域 |
| style | text | "" | 样式类 |
| kind | text | "section" | 现有 Web 容器种类 |
| attrs | any | None | 明确的原生属性 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 由现有容器能力包裹的一块 |

Use `children`, `id`="", `style`="", `kind`="section" and `attrs`=None。
先拆内容与布局，再组合容器；不能在一个文字值里塞完整页面。额外属性与 id 使用同一记录，
样式只引用已有类，不承载业务动作。状态变化由 Marqdo 浏览器效果处理。

We **attrs = [明确容器身份](table.put(in=`attrs`, at="id", value=`id`))**.
Return *[使用既有 View 容器](component.wrap(children=`children`, kind=`kind`, style=`style`, attrs=`attrs`))*.

## button

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| text | text | required | 人类可读操作 |
| id | text | "" | 固定按钮身份 |
| data_id | text | "" | 委托事件携带的业务身份 |
| style | text | "mq-btn" | 按钮样式 |
| disabled | bool | False | 是否禁用 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 一个带明确身份的原生按钮 |

Use `text`, `id`="", `data_id`="", `style`="mq-btn" and `disabled`=False。
业务身份是数据，点击后交给登记的事件入口。不能把事件源代码放入属性；按钮只说要做什么，
实际动作由客户端函数和后端契约决定。固有标准库会使用禁用按钮，服务端也独立拒绝停用。

`attrs` =

| id | data-id | type | disabled |
|---|---|---|---|
| `id` | `data_id` | "button" | `disabled` |

Return *[按钮仍是同一 View 语言](component.element(kind="button", value=`text`, attrs=`attrs`, style=`style`))*.

## markdown

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| source | text | required | 普通 Markdown 原文 |
| id | text | "qd-answer-document" | 稳定阅读区域 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 与 Marqdo 阅读器同风格的 Markdown 阅读面 |

Use `source` and `id`="qd-answer-document"。编号清单、加粗和围栏都是普通 Markdown，
不会再被送入 Marqdo 分支与表达式编译。只复用既有 Web Markdown 渲染器；原始 HTML 被其默认
安全策略省略。输出放入 mq-document 容器，视觉样式继续来自同一阅读器。

We **body = [对话按普通 Markdown 理解](component.markdown(text=`source`, slot="conversation", style="qd-markdown"))**.
Return *[同构阅读面](render(nodes=region(children=`body`, id=`id`, style="mq-document qd-chat")))*.


## message

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| source | text | required | 普通Markdown消息 |
| role | text | "assistant" | user或assistant |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 带独立角色边界和头像位置的原生消息节点 |

Use `source` and `role`="assistant"。消息身份来自持久化记录，不从Markdown标题猜测。仅支持用户与助手两个可见角色；头像是角色标记，不暗示存在未执行的模型请求。正文继续交给已有安全Markdown组件，不执行Marqdo表达式、HTML事件或工具。

One message has two native blocks: an escaped role label and ordinary Markdown content. Layout provides the avatar gutter without placing executable text into an HTML attribute. The caller owns ordering and persistence, while this helper only renders the accepted text. Reusing it in production history and deterministic UI fixtures ensures the fixture cannot accidentally use another message layout. Missing timestamps are not invented, and a role is never inferred from words inside the answer. This helper returns nodes rather than an entire page, preserving the surrounding conversation and execution regions.

We **style = "qd-message is-assistant"** and **speaker = "求道"**.
1. `role` == "user"
  We **style = "qd-message is-user"** and **speaker = "你"**.
We **label = text_node(text=`speaker`,style="qd-message-role")**.
We **body = component.markdown(text=`source`,style="qd-markdown")**.
Return *[角色与文字共享原生阅读面](region(children=table.concat(a=`label`,b=`body`),style=`style`))*.

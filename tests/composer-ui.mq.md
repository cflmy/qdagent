---
markup: occlusion
title: 对话内经过与居中浮层的浏览器回归
import:
  task: task-ui.mq.md
  shell: ../pages/views/shell.mq.md
  styles: ../pages/views/styles.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
  engineering: ext/engineering/index.mq.md
---

沿用正式客户端、原生组件、官方桥接与 WASM，在隔离文件页中观察最终 DOM。网络使用已有确定性任务夹具；这证明界面交互，不冒充真实模型或 OIDC 登录。

## prepare

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| closed | bool | False | 结束时是否关闭浮层 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前产品布局与客户端构成的隔离测试页 |

Use `closed`=False。先让既有任务测试完成两次发送、切换和轮询后展开，再通过正式 open_plugins 入口打开浮层。每次使用当前 compose 生成的页面，保留真实样式和组件，而不是手工复制一个假对话框。测试仅改启动时序和网络夹具，不改产品可见效果。

The completion trigger schedules the real panel entry. A test-only callback records that the timer chain finished; its marker alone cannot establish success. The runner independently checks the final body class, backdrop state, inert attribute and dialog accessibility state. A closed run invokes the actual close helper and verifies that its additional attribute effects survive, catching the case where only remove_class was returned.

All fixture files and screenshots stay under the ignored engineering directory. Existing histories, uploaded files, user identities and provider sessions are not read. Local file URL adjustments only point the browser at already installed official assets and the isolated client source. No business JavaScript, fake authentication cookie or alternative renderer is introduced.

The file-mode host is assembled from shell.render and shell.conversation, the same callable components used by production compose. Its head loads the existing reader and product styles. This avoids retaining the entire unrelated exported manual inside a test page, which would make the DOM output exceed the bounded process buffer and hide the completion marker. It still exercises the actual capsule controls, line-icon resources, dialog elements, backdrop and inline execution region.

Changing an asset URL for file mode does not change a browser handler. The source URL points to the isolated Marqdo copy and the WASM URL points to the installed official runtime. No authenticated server URL is accessed. The task network fixture remains visibly marked as synthetic so a screenshot cannot be mistaken for a real tool receipt.

We **_ = styles.build()**.
We **_ = task.prepare()**.
We **client = fs.read_text(path=".marqdo/task-ui.mq.md")**.
We **client = text.replace(text=`client`, old="Return *[实际状态成立](browser.set_text(sel=\"#probe\", text=\"task-ui-pass:two-sessions-expanded\"))*.", new="Return *[测试真实打开面板](browser.after(ms=20, then=\"open_plugins\"))*.")**.
We **client = text.replace(text=`client`, old="Return *[打开并读取全部已注册能力](_merge(a=\x60panel\x60, b=_merge(a=\x60loading\x60, b=\x60request\x60)))*.", new="Return *[打开后观察](_merge(a=_show_panel(id=\"#panel-plugins\", tab=\"#tab-plugins\"), b=browser.after(ms=40, then=\"fixture_overlay_done\")))*.")**.
We **finish = "Return *[仅标记完成](browser.set_text(sel=\"#probe\", text=\"composer-ui-pass\"))*."**.
1. `closed`
  We **finish = "Return *[实际关闭并观察](_merge(a=close_panels(), b=browser.set_text(sel=\"#probe\", text=\"composer-ui-pass\")))*."**.
We **hook = "\n\n## fixture_overlay_done\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 正式面板效果之后的观察 |\n\n只安排观察，不修改产品状态或时间线。通过标记必须与真实 DOM 类、属性一起检查。\n\n" + `finish` + "\n"**.
We **_ = fs.atomic_write(path=".marqdo/composer-ui.mq.md", text=(`client` + `hook`))**.
We **chrome = shell.render()**.
We **conversation = shell.conversation()**.
We **html = "<!doctype html><html><head><meta charset=\"utf-8\"><link rel=\"stylesheet\" href=\"../pages/public/generated/view-base.css\"><link rel=\"stylesheet\" href=\"../pages/public/generated/reader.css\"></head><body class=\"reader-page\"><main class=\"reader-content\"><h1 class=\"page\">求道对话</h1><div id=\"structure\">" + `conversation` + "</div></main>" + `chrome` + "<output id=\"probe\"></output></body></html>"**.
We **html = text.replace(text=`html`, old="/static/", new="../pages/public/")**.
We **html = re.replace(text=`html`, pattern="data-mq-source-url=\"[^\"]*\"", with="data-mq-source-url=\"composer-ui.mq.md\"")**.
We **_ = fs.atomic_write(path=".marqdo/composer-ui.html", text=`html`)**.
Return *[保存隔离现场](result.ok(value=".marqdo/composer-ui.html"))*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已有浏览器路径 |
| closed | bool | False | 观察打开或关闭 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际浏览器 DOM 的布局与浮层断言 |

Use `chrome` and `closed`=False。浏览器只打开隔离页面，生成截图和 DOM。确认执行区在对话父容器之内，工具栏包含上传、模型、插件、知识和工作区，同时不存在旧的执行浮层。打开时背景压暗、对话不可交互；关闭时这些状态全部清除。

The test does not infer success from process exit. The completion marker must appear, and the relevant real element tags must satisfy their state contract. The earlier task fixture also establishes two independent sessions and preserves expanded details after polling. A passing result is limited to this deterministic browser workflow; authenticated server mutation checks and actual filesystem operations are verified separately.

The screenshot is evidence for visual inspection, not a pixel-perfect assertion. Font availability may vary across hosts. The DOM checks cover the regression-prone behavior: stable timeline placement, restored controls, modal backdrop and cleanup after close. Browser diagnostics and the final DOM remain available on failure, avoiding a hidden retry or precomputed success page.

An open dialog has several independent obligations. Its aria-hidden value must be false, the backdrop must be visible, the body must carry the scroll-lock class, and the background conversation must be inert. Checking only the panel class would miss a floating box that still permits accidental background actions. Conversely, the closed run must observe the inverse states together; hiding the box alone could leave a transparent layer blocking the input or an inert composer that looks usable.

The capsule controls are checked by identity rather than their translated label, because labels can change without changing behavior. The execution region must exist in the same conversation subtree as the Markdown targets. The previous panel-activity must be absent, preventing a regression that merely duplicates execution in both a popup and the conversation. Detail expansion has already been exercised against a later poll by the preceding task fixture, so the final display is not a freshly constructed expanded example.

We **_ = prepare(closed=`closed`)**.

`argv` =

| argument |
|---|
| `chrome` |
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--window-size=1440,1100" |
| "--virtual-time-budget=20000" |
| "--timeout=25000" |
| "--screenshot=/home/cflmy/work/qdagent/.marqdo/composer-ui.png" |
| "--dump-dom" |
| "file:///home/cflmy/work/qdagent/.marqdo/composer-ui.html" |

We **ran = engineering.checked(argv=`argv`, timeout_ms=35000, max_output=786432)**.
1. not access(`ran`,"ok")
  Return *ran*.
We **html = access(access(`ran`,"value"),"stdout")**.
We **_ = fs.atomic_write(path=".marqdo/composer-ui-dom.html", text=`html`)**.
We **body = re.find(text=`html`, pattern="<body[^>]*>")**.
We **panel = re.find(text=`html`, pattern="<aside[^>]*id=\"panel-plugins\"[^>]*>")**.
We **background = re.find(text=`html`, pattern="<section[^>]*id=\"qd-conversation\"[^>]*>")**.
We **shade = re.find(text=`html`, pattern="<button[^>]*id=\"qd-backdrop\"[^>]*>")**.
1. not text.contains(text=`html`, sub="composer-ui-pass") or not `panel` or not `background` or not `shade`
  Return *[保留实际浏览器失败](result.error(code="test.composer", message="没有完成真实交互，请读取 .marqdo/composer-ui-dom.html", operation="run"))*.
1. `closed`
  1. text.contains(text=`body`, sub="qd-modal-open") or text.contains(text=`shade`, sub="is-open") or text.contains(text=`background`, sub="inert") or not text.contains(text=`panel`, sub="aria-hidden=\"true\"")
    Return *[关闭遗留了遮罩或交互锁](result.error(code="test.composer_close", message="关闭效果不完整", operation="run"))*.
2. *
  1. not text.contains(text=`body`, sub="qd-modal-open") or not text.contains(text=`shade`, sub="is-open") or not text.contains(text=`background`, sub="inert") or not text.contains(text=`panel`, sub="aria-hidden=\"false\"")
    Return *[浮层没有正确打开](result.error(code="test.composer_open", message="居中浮层状态不完整", operation="run"))*.
1. not text.contains(text=`html`, sub="id=\"chat-file\"") or not text.contains(text=`html`, sub="id=\"tab-kb\"") or text.contains(text=`html`, sub="id=\"panel-activity\"") or not re.is_match(text=`html`, pattern="(?s)id=\"qd-conversation\".*id=\"qd-execution\".*id=\"qd-trace\"")
  Return *[对话布局合同失败](result.error(code="test.composer_layout", message="执行经过或输入栏结构不正确", operation="run"))*.
Return *[真实 DOM 通过](result.ok(value="对话内展开 / 上传与知识入口 / 居中遮罩 / 背景锁定与关闭恢复"))*.

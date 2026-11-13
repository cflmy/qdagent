---
markup: occlusion
title: 工作台交互的真实 WASM 验收
import:
  composer: composer-ui.mq.md
  previews: ../pages/agent/previews.mq.md
  call: ../pages/control/call.mq.md
  component: ext/web/component/index.mq.md
  ui: ../pages/agent/ui.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---



## prepare

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| mode | text | "preview" | preview、activity 或 closed |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 正式布局、真实 View 片段和确定性传输 |

Use `mode`="preview"。先生成正式侧栏、输入区和检查区，沿用两会话切换与展开回归。仅替换网络边界和测试触发器，文件列表和 Marqdo 片段由生产读取器生成。真实客户端负责打开文件、更新请求身份、过滤响应和显示预览，不预设通过状态。

The fixture first completes the existing two-session interaction and closes its settings dialog. It then schedules the actual open_files callback, accepts an owner-shaped file response and schedules the actual inspect_file callback. Those are direct browser entrypoints, so their state assignments must persist. The source path is a test input, not a copied implementation of the selection logic.

Native View content comes from the real CLI reader. The fixture does not draw substitute HTML resembling Marqdo. It only serializes that already-rendered fragment into a deterministic network observation, keeping the transport boundary explicit. The browser continues to run the current product source with the official WASM and its locally documented modifier-key host adapter.

The preview mode retains the document. Activity mode schedules the real process-tab entry, and closed mode schedules the actual inspector toggle. The final probe checks stored visibility and a positive preview request identity before announcing completion. The run function independently checks the resulting DOM, so a marker alone cannot make the test pass.

The transition declarations are test data rather than a hidden fork of the application. Each declaration names an exact source anchor and its scheduling-only replacement; a missing anchor fails before the browser starts. This makes a later product refactor visible to the fixture instead of allowing a stale copy to keep passing. The selected path is supplied at the actual inspect_file entry, and request construction still receives explicit task, epoch and file identities.

The payload also carries the source snapshot and filename returned by the same trusted reader, so source mode tests exercise ordinary text insertion rather than constructing executable markup.

The network payload contains a real native-rendered document and a real component file button. It is encoded twice for different boundaries: JSON inside a Marqdo string, then a data URL for fetch. Those boundaries are transport mechanics, not executable model content. The accepted callback must parse the observation and preserve direct-entry state before it can display the document. No fixture assigns inspector_open or preview_gen on the product's behalf.

We **_ = fs.make_dirs(path=".marqdo/harness-probe")**.
We **_ = fs.copy_file(src="tests/fixtures/harness-document.mq.md",dest=".marqdo/harness-probe/document.mq.md")**.
We **fragment = call.invoke(file=(sys.cwd() + "/pages/agent/previews.mq.md"),function="show",arguments=table.put(in=None,at="path",value="document.mq.md"),root=(sys.cwd() + "/.marqdo/harness-probe"),effects="plugin,fs.read,fs.write,process.exec,random.read")**.
1. access(`fragment`,"kind") != "marqdo-view" or not text.contains(text=access(`fragment`,"html"),sub="reader-syntax-guide")
  Return *[必须是真正的 View](result.error(code="test.harness_view",message="未返回原生阅读面",operation="prepare"))*.
We **_ = composer.prepare(closed=True)**.
We **client = fs.read_text(path=".marqdo/composer-ui.mq.md")**.
We **patches = fs.read_json(path="tests/fixtures/harness-transitions.json")**.
- [固定夹具只调整调度边界](for patches as patch)
  1. not text.contains(text=`client`,sub=access(`patch`,"find"))
    Return *[源码变化不能静默放过](result.error(code="test.harness_anchor",message="夹具锚点失效",operation="prepare"))*.
  We **client = text.replace(text=`client`,old=access(`patch`,"find"),new=access(`patch`,"replace"))**.
We **section = re.find(text=`client`,pattern="(?s)## inspect_file\\n.*?## on_files")**.
We **changed = text.replace(text=`section`,old="We **preview_gen =",new="We **data_id = \"document.mq.md\"**.\nWe **preview_gen =")**.
We **client = text.replace(text=`client`,old=`section`,new=`changed`)**.
We **files = ui_files()**.
We **payload = table.put(in=None,at="ok",value=True)**.
We **payload = table.put(in=`payload`,at="html",value=access(`fragment`,"html"))**.
We **payload = table.put(in=`payload`,at="title",value=access(`fragment`,"title"))**.
We **payload = table.put(in=`payload`,at="source",value=access(`fragment`,"source"))**.
We **payload = table.put(in=`payload`,at="filename",value=access(`fragment`,"filename"))**.
We **payload = table.put(in=`payload`,at="files_html",value=`files`)**.
We **fixture = fs.read_text(path="tests/fixtures/harness-network.mq.md")**.
We **literal = text.replace(text=json.stringify(value=json.stringify(value=`payload`)),old="\x60",new="\\x60")**.
We **fixture = text.replace(text=`fixture`,old="\"@PAYLOAD@\"",new=`literal`)**.
We **client = re.replace(text=`client`,pattern="(?s)## _inspect_request\\n.*?## inspect_artifact",with=(`fixture` + "\n## inspect_artifact"))**.
We **hooks = fs.read_text(path="tests/fixtures/harness-hooks.mq.md")**.
We **hooks = text.replace(text=`hooks`,old="\"@MODE@\"",new=json.stringify(value=`mode`))**.
We **_ = fs.atomic_write(path=".marqdo/harness-ui.mq.md",text=(`client` + "\n" + `hooks`))**.
We **html = text.replace(text=fs.read_text(path=".marqdo/composer-ui.html"),old="composer-ui.mq.md",new="harness-ui.mq.md")**.
We **_ = fs.atomic_write(path=".marqdo/harness-ui.html",text=`html`)**.
Return *[准备真实回调夹具](result.ok(value=True))*.

## ui_files

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 测试选择的原生文件按钮 |

固定测试文件是当前回归创建的输入，列表按钮仍由生产组件构造器生成。它不读取用户目录，不伪造文件生成结果，也不把服务器绝对路径放进按钮。按钮身份是相对路径，后续真实回调仍负责请求和匹配。

Return *[文件按钮也使用原生节点](ui.render(nodes=ui.button(text="document.mq.md",data_id="document.mq.md",style="qd-workspace-preview")))*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 现有 Chromium |
| mode | text | "preview" | 预览、过程或关闭场景 |
| width | number | 1600 | 视口宽度 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实浏览器的三栏、原生 View 与检查区交互断言 |

Use `chrome`, `mode`="preview" and `width`=1600。浏览器运行真实客户端，读取最终 DOM 并保存截图。需要同时存在新的导航、多行输入、真实 View 和保持展开的工具卡片；过程和关闭场景还检查相应 body 类。文件模式是传输夹具，不冒充 OIDC 登录或外部模型响应。

The renderer's process exit is not the test result. The actual DOM must contain a completion marker, a document syntax guide from the native reader and an expanded main trace. This catches a preview callback that never executes, a lost direct-entry state assignment, or an inspector that replaces the conversation. The mobile run uses the same handlers and layout source at a narrower viewport.

Screenshots remain available for inspection. Their sample conversation is explicitly test material and does not claim to be a real model task. Real file ownership and read-only preview are checked separately through the service. No business JavaScript or alternate browser state machine is introduced.

The completion probe and DOM assertions have different responsibilities: one observes saved application state, the other observes the actual elements and visibility classes. Both must agree. A native View fragment in the fixture alone does not prove that the callback placed it into the inspector.

We **prepared = prepare(mode=`mode`)**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **size = str(`width`) + ",1000"**.
We **shot = sys.cwd() + "/.marqdo/harness-" + `mode` + "-" + str(`width`) + ".png"**.
We **address = "file://" + sys.cwd() + "/.marqdo/harness-ui.html"**.

`argv` =

| argument |
|---|
| `chrome` |
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--window-size=" + `size` |
| "--virtual-time-budget=20000" |
| "--screenshot=" + `shot` |
| "--dump-dom" |
| `address` |

We **out = engineering.checked(argv=`argv`,timeout_ms=35000,max_output=786432)**.
1. not access(`out`,"ok")
  Return *out*.
We **html = access(access(`out`,"value"),"stdout")**.
We **_ = fs.atomic_write(path=".marqdo/harness-dom.html",text=`html`)**.
1. not text.contains(text=`html`,sub="harness-ui-pass") or not text.contains(text=`html`,sub="reader-syntax-guide") or not text.contains(text=`html`,sub="qd-trace-details is-expanded")
  Return *[保留真实失败](result.error(code="test.harness",message="检查 .marqdo/harness-dom.html",operation="run"))*.
We **body = re.find(text=`html`,pattern="<body[^>]*>")**.
1. `mode` == "closed" and text.contains(text=`body`,sub="qd-inspector-open")
  Return *[检查区没有关闭](result.error(code="test.harness",message=`body`,operation="run"))*.
1. `mode` != "closed" and not text.contains(text=`body`,sub="qd-inspector-open")
  Return *[检查区没有打开](result.error(code="test.harness",message=`body`,operation="run"))*.
Return *[实际 DOM 验收通过](result.ok(value=`shot`))*.

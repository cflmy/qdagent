---
markup: occlusion
title: 任务切换与稳定展开的真实 WASM 回归
import:
  json: lib/json.mq.md
  trace: ../pages/agent/trace.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  table: lib/table.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
  host: fixtures/client-host.mq.md
---

使用正式客户端、官方 WASM 和桥接。两个任务分别发送、展开并拉取完成，最终读取 DOM。网络是确定性夹具，实际 HTTP 和模型另行验证。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 隔离浏览器回归页面 |

只替换网络边界、默认测试参数和触发点。产品发送、回调、切换与展开函数仍完整执行。卡片从正式组件生成，初始宿主不预置通过标记，只有真实状态成立才结束。


This generator has a deliberately narrow responsibility: obtain the current client and replace only the environment-dependent transport plus test inputs and triggers. It must not copy the production state machine into a fixture or set the expected task state on the client's behalf. Every future refactor should keep these boundaries explicit so a passing test still means the real callbacks persisted their assignments.

The browser uses official bridge and WASM artifacts already installed in this project. The minimum host provides the same input, action, status and answer selectors as the production layout. It adds a probe node for the test result. The probe starts empty, and neither the source template nor the host contains a precomputed passing state.

The first change starts the actual Enter handler after mount. An interval is used once because an initial synchronous after chain could finish before the bridge writes its own ready status. A separate trigger ensures later errors remain visible. Test inputs are assigned at the event entry so event metadata from a previous interval cannot replace the intended keyboard key or delegated identity.

The network fixtures return data URLs with the original route, session and generation in the fragment. Official fetch_all still performs the request and returns that URL to the unchanged decoder. Thus stale-response filtering, JSON parsing, phase transitions and task identity checks use the same code as production. These fixtures are explicitly synthetic observations and cannot prove an HTTP server or a model really ran.

A running response supplies one native-rendered card. The real toggle_trace callback expands its detail region and records its token. A following pull marks the same card succeeded and updates its result leaf. The test does not replace the timeline to obtain this outcome. Rebuilding the entire card would remove the expanded class and fail the final DOM check.

The first completed task schedules the real on_session entry. The deterministic state response names a different task with generation zero and no old cards. The unchanged on_state callback must adopt that identity and clear the previous token and sequence counter. A second real Enter then creates its own running card, expands it and receives a completed result.

The fixture checker observes only state that production callbacks saved. It cannot change session_id, phase, question, trace_seen or trace_open to make an assertion pass. It schedules the next genuine entry or writes an explicit failure. After the second task completes, it writes the final probe text only if the current session, generation and expanded token all match.

Default argument tables and Use declarations are changed together in the isolated copy. A table-only rewrite could look correct during source inspection while the executable default remained empty. Stable intention labels locate the few trigger replacements; if those labels change, update this generator and verify the resulting client rather than editing generated output manually.

The card shell comes from the official component renderer, including its stable detail, status and result ids. The shell is inserted into the fixture as escaped literal data. Literal backticks in generated source strings must remain escaped because Marqdo otherwise interprets them as value interpolation. Parameterized mock content should never become a second business implementation.

Only .marqdo/task-ui.mq.md and its dedicated host are written. The production client, official bridge, WASM and user histories remain untouched. Generated failure DOM is retained locally for diagnosis. Opening a file-mode fixture is an intentionally limited browser environment; it does not establish that all HTTP navigation behavior or visual pixel geometry works on every host.

Delegated controls receive both a DOM id and a business data-id. The fixture deliberately makes them different and supplies data_id before the unchanged product branch. A callback that accidentally selects id will open the wrong details target or fail to switch tasks, so the final expansion and session assertions catch that regression. The fixture no longer assigns an apparently correct id after the production identity normalization.

We **client = fs.read_text(path="pages/public/client.mq.md")**.
We **client = text.replace(text=`client`, old="  browser: lib/browser.mq.md", new="  net: lib/net.mq.md\n  browser: lib/browser.mq.md")**.
We **client = text.replace(text=`client`, old="phase = \"loading\"", new="phase = \"idle\"")**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[绑定后读取真实状态\\][^\\n]*", with="Return *[开始隔离回归](browser.merge(a=bindings, b=browser.interval(ms=100, then=\"fixture_start\", id=\"fixture\")))*.")**.
We **client = text.replace(text=`client`, old="| key | text | \"\" |", new="| key | text | \"Enter\" |")**.
We **client = text.replace(text=`client`, old="| value | text | \"\" |", new="| value | text | \"浏览器任务回归\" |")**.
We **client = text.replace(text=`client`, old="Use \x60key\x60=\"\" and \x60value\x60=\"\"。", new="Use \x60key\x60=\"Enter\" and \x60value\x60=\"浏览器任务回归\"。")**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[任务已有真实终态\\][^\\n]*", with="Return *[完成后检查](browser.merge(a=paint, b=browser.after(ms=20, then=\"fixture_next\")))*.")**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[阅读真实历史\\][^\\n]*", with="Return *[切换后检查](browser.merge(a=paint, b=browser.after(ms=20, then=\"fixture_next\")))*.")**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[等待实际下一阶段\\][^\\n]*", with="Return *[运行时展开](browser.merge(a=paint, b=browser.after(ms=20, then=\"toggle_trace\")))*.")**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[阅读真实详情\\][^\\n]*", with="Return *[展开后轮询](browser.merge(a=effect, b=browser.after(ms=20, then=\"on_tick\")))*.")**.

`event` =

| seq | kind | title | status | details | at_ms |
|---|---|---|---|---|---|
| 1 | "tool" | "夹具工具 · 非真实任务" | "running" | "确定性输入" | 0 |

We **client = text.replace(text=`client`, old="1. \x60key\x60 != \"Enter\"", new="We **key = \"Enter\"** and **value = \"浏览器任务回归\"**.\n1. \x60key\x60 != \"Enter\"")**.
We **card = trace.card(event=`event`)**.
We **fixture = fs.read_text(path="tests/fixtures/task-request.mq.md")**.
We **literal = text.replace(text=json.stringify(value=access(`card`, "html")), old="\x60", new="\\x60")**.
We **fixture = text.replace(text=`fixture`, old="\"@CARD@\"", new=`literal`)**.
We **mock = re.find(text=`fixture`, pattern="(?s)## _request\\n.*?## _state_request")**.
We **client = re.replace(text=`client`, pattern="(?s)## _request\\n.*?## _state_request", with=`mock`)**.
We **mock = re.find(text=`fixture`, pattern="(?s)## _state_request\\n.*$")**.
We **client = re.replace(text=`client`, pattern="(?s)## _state_request\\n.*?## _control_request", with=`mock` + "\n## _control_request")**.
We **section = re.find(text=`client`, pattern="(?s)## toggle_trace\\n.*?## open_activity")**.
We **changed = text.replace(text=`section`, old="1. \x60data_id\x60 != \"\"", new="We **id = \"wrong-dom-id\"** and **data_id = \"1\"**.\n1. \x60data_id\x60 != \"\"")**.
We **client = text.replace(text=`client`, old=`section`, new=`changed`)**.

We **section = re.find(text=`client`, pattern="(?s)## on_session\\n.*?## create_session")**.
We **changed = text.replace(text=`section`, old="1. \x60data_id\x60 != \"\"", new="We **id = \"wrong-dom-id\"** and **data_id = \"fixture-b\"**.\n1. \x60data_id\x60 != \"\"")**.
We **client = text.replace(text=`client`, old=`section`, new=`changed`)**.
We **_ = [保存当前状态机测试副本](fs.atomic_write(path=".marqdo/task-ui.mq.md", text=`client` + "\n" + fs.read_text(path="tests/fixtures/task-hooks.mq.md")))**.
We **html = host.html()**.
We **html = text.replace(text=`html`, old="client-state.mq.md", new="task-ui.mq.md")**.
We **html = text.replace(text=`html`, old="<div id=\"structure\"></div>", new="<div id=\"qd-trace\"></div><div id=\"panel-workspace-body\"></div><div id=\"panel-plugins-body\"></div><div id=\"structure\"></div>")**.
We **_ = [生成专用宿主](fs.atomic_write(path=".marqdo/task-ui.html", text=`html`))**.
Return *[测试副本已准备](result.ok(value=".marqdo/task-ui.html"))*.


## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 现有 Chromium 路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实 DOM 的稳定展开与任务切换断言 |

Use `chrome`。只打开专用 file 页面，不接触个人资料。进程零退出不等于通过，必须读取实际终态和展开类；失败现场保留在忽略目录，不把启动成功当作交互成功。


The Chromium process opens only the dedicated fixture file. Its flags allow same-directory file resources for this one acceptance page; they are not deployment guidance for the actual application. No personal profile, login state or external website is required.

The browser can exit successfully even if Marqdo failed during mount, a callback returned a wrong contract type, or a timer chain stopped before completion. Therefore inspect the actual DOM instead of trusting exit zero. A missing probe, a failure marker, or a collapsed details class is a failure. Keep stdout and stderr separately so a WASM contract error is distinguishable from a browser launch warning.

The positive result proves two independent properties together: task switching persisted the new identity, and a later response updated the same expanded card without replacing its container. It does not prove backend isolation, which belongs to capabilities, or real model execution, which is observed through the HTTP workflow. These layers complement one another rather than serving as substitutes.

We **_ = [从当前源码生成夹具](prepare())**.

`argv` =

| argument |
|---|
| `chrome` |
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--virtual-time-budget=20000" |
| "--timeout=20000" |
| "--dump-dom" |
| "file:///home/cflmy/work/qdagent/.marqdo/task-ui.html" |

We **ran = engineering.checked(argv=`argv`, timeout_ms=30000, max_output=65536)**.
1. not access(`ran`, "ok")
  Return *ran*.
We **out = access(`ran`, "value")**.
We **html = access(`out`, "stdout")**.
We **_ = fs.atomic_write(path=".marqdo/task-ui-dom.html", text=`html`)**.
We **_ = fs.atomic_write(path=".marqdo/task-ui-errors.txt", text=access(`out`, "stderr"))**.
1. not text.contains(text=`html`, sub="task-ui-pass:two-sessions-expanded") or not re.is_match(text=`html`, pattern="class=\"[^\"]*qd-trace-details[^\"]*is-expanded[^\"]*\"")
  Return *[保存实际失败](result.error(code="test.task_ui", message=`html`, operation="run"))*.
Return *[真实 WASM 回归通过](result.ok(value="两个会话 / Enter / 直接回调状态 / 轮询后详情保持展开"))*.


---
markup: occlusion
title: 求道任务客户端
import:
  browser: lib/browser.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  url: lib/url.mq.md
  re: lib/re.mq.md
---

普通 Markdown 负责对话，Marqdo call 负责实际行动。界面只应用官方桥接支持的效果，不执行模型源码。任务身份、代数和切换序号独立保存，动态卡片在稳定父节点上更新。

# main

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

浏览器只在直接事件入口持久化状态。首次打开恢复默认任务；后端读取真实历史和作业，不启动新模型。会话身份、切换序号和回合代数共同防止迟到响应覆盖当前任务。

Initial state belongs to one browser tab. The server owns persistent histories and task processes, so refreshing the page restores an existing task instead of creating a new question. The tab keeps its selected task, view epoch, job generation and the largest displayed event sequence separately. Resetting one of these values is not permission to rewrite the others. Helpers return effects; only direct event callbacks persist these assignments.

Navigation and preview state are initialized once per tab. Backend histories and running tasks remain persistent across reloads.

Pane widths begin at the reference dimensions and then request an optional local preference. Storage does not control login, task identity or file access. Drag state is tab-local and separate from the selected document. Source text remains a bounded accepted snapshot, so its download never requests an arbitrary server path. The inspector starts available on desktop; media rules turn it into a drawer on small screens.

We **model = "none"** and **kb = "none"** and **question = ""** and **gen = 0** and **phase = "loading"** and **last_html = ""** and **last_answer = ""** and **last_workbench = ""** and **model_saving = False** and **upload_busy = False** and **upload_session = ""** and **upload_epoch = 0** and **upload_id = ""** and **upload_total = 0** and **upload_offset = 0** and **upload_read_size = 0** and **upload_phase = ""** and **ans_sel = ""** and **session_id = "default"** and **view_epoch = 1** and **trace_seen = 0** and **trace_open = ""** and **nav_open = False** and **inspector_open = True** and **inspector_initial = True** and **preview_gen = 0** and **model_titles = table.empty_map()** and **model_chosen = False** and **layout_sidebar = 267** and **layout_inspector = 496** and **drag_region = ""** and **drag_anchor = 0** and **drag_start = 0** and **preview_source = ""** and **preview_filename = "document.mq.md"**.
We **bindings = [绑定原生委托事件](table.put(in=None, at="wire", value=_bindings()))**.
We **ready = [恢复已有任务](browser.set_text(sel="#chat-status", text="正在恢复任务…"))**.
We **ready = _merge(a=`ready`,b=_merge(a=browser.add_class(sel="body",class="qd-inspector-open qd-inspector-initial"),b=browser.store_get(key="qdagent.panes.v3",scope="local",then="restore_layout")))**.
Return *[绑定后读取真实状态](_merge(a=_merge(a=`bindings`, b=`ready`), b=_state_request(session=`session_id`, epoch=`view_epoch`)))*.

## _bindings

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 官方桥接实际执行的浏览器效果 |

固定控件与动态列表都在这里声明。列表委托给稳定父节点；新卡片和任务按钮无需反复绑定。data-id 只是业务身份，不是可执行代码；所有动作进入明确的 Marqdo 函数。

The binding table is also the front-end integration contract. Fixed controls have fixed selectors. Dynamic plugin, session and trace buttons use delegation from stable parents, with data-id carrying only an opaque business identity. Appending a new card therefore does not require another listener or a JavaScript mutation observer.

Send and Enter both read the same textarea, but each is a direct event entry so its state assignments persist. Stop enters a separate callback and waits for confirmation. The model controls choose the next task's model and never change a running task's saved choice.

Panel-open buttons only reveal content. The plugin list issues an explicit switch request, and the task list requests a different session snapshot. The create button reads its separate title input. The trace button changes the details region's visibility without executing anything shown in that region.

When adding a control, first create its minimal native component, then add its binding and document the callback's parameters and effects. A missing node should not be replaced by a business script in generated HTML. Keep source ids and value selectors aligned so a layout change cannot silently send empty or unrelated input.

Navigation and inspection use different callbacks because their lifecycles differ. A task switch invalidates the view epoch; selecting a file increments the preview request identity without starting a model. The file-list delegate remains stable while buttons are replaced. Artifact preview buttons carry registered ids, while workspace-file buttons carry root-relative paths; the server validates each again. Modifier keys are host event data, and all send decisions remain in Marqdo. Do not reuse a click binding as an implicit submit or hide an unimplemented action behind a decorative icon.

Pointer bindings operate only on the two declared separators and the body receiving their captured movement. The generic host contributes numeric coordinates; direct Marqdo callbacks own the gesture, bounds and persistence. A pointer cancel terminates the gesture just like release, so the interface cannot remain permanently stuck in resize mode. Keyboard and double-click bindings provide alternatives without introducing a second dimension state.

Reader controls act only on the already accepted document. The source toggle cannot choose a path, download cannot invoke a function, and expanded reading does not rewrite a task. These bindings use stable ids outside the document fragment so uploaded content never supplies its own application action. A new control requires both a native node and an explicit handler, not a decorative icon that appears interactive but does nothing.

`wire` =

| @ | 选择器 | 事件 | 调用 | 值选择器 | 委托 |
|---|---|---|---|---|---|
| 1 | #chat-send | click | send | #chat-input | |
| 2 | #chat-input | keydown | on_key | #chat-input | |
| 3 | #chat-stop | click | stop | | |
| 4 | #tab-model | click | open_model | | |
| 5 | #model-none | click | pick_none | | |
| 6 | #model-qwen | click | pick_qwen | | |
| 7 | #tab-plugins | click | open_plugins | | |
| 8 | #tab-workspace | click | open_workspace | | |
| 9 | #tab-kb | click | open_knowledge | | |
| 10 | #panel-model-close | click | close_panels | | |
| 11 | #panel-plugins-close | click | close_panels | | |
| 12 | #panel-workspace-close | click | close_panels | | |
| 13 | #panel-kb-close | click | close_panels | | |
| 14 | #panel-workspace-body | click | on_session | | .qd-session-select |
| 15 | #panel-plugins-body | click | on_plugin | | .qd-plugin-toggle |
| 16 | #session-create | click | create_session | #session-title | |
| 17 | #qd-trace | click | toggle_trace | | .qd-trace-toggle |
| 18 | #qd-backdrop | click | close_panels | | |
| 19 | body | keydown | on_escape | | |
| 20 | #panel-kb-body | click | pick_knowledge | | .qd-kb-select |
| 21 | #chat-file | change | on_file | | |
| 22 | #model-form | submit | save_model | | |
| 23 | #panel-model-body | click | pick_custom_model | | .qd-model-select |
| 24 | #panel-model-body | click | remove_model | | .qd-model-remove |
| 25 | #nav-toggle | click | toggle_navigation | | |
| 26 | #inspector-toggle | click | toggle_inspector | | |
| 27 | #inspector-close | click | toggle_inspector | | |
| 28 | #nav-files,#inspector-files | click | open_files | | |
| 29 | #nav-settings,#model-manage | click | open_model_settings | | |
| 30 | #inspector-activity | click | show_activity | | |
| 31 | #qd-inspector-body,#qd-workbench | click | inspect_artifact | | .qd-artifact-preview |
| 32 | #qd-workspace-files | click | inspect_file | | .qd-workspace-preview |
| 33 | #qd-preview | click | reveal_logic | | .occl-label |
| 34 | #workspace-switch | click | open_workspace | | |
| 35 | #resize-sidebar,#resize-inspector | pointerdown | begin_resize | | |
| 36 | body | pointermove | resize_pane | | |
| 37 | body | pointerup | end_resize | | |
| 38 | body | pointercancel | end_resize | | |
| 39 | #resize-sidebar,#resize-inspector | keydown | resize_keyboard | | |
| 40 | #resize-sidebar,#resize-inspector | dblclick | reset_layout | | |
| 41 | #preview-source | click | toggle_preview_source | | |
| 42 | #preview-expand | click | expand_preview | | |
| 43 | #preview-download | click | download_preview | | |
| 44 | #qd-workbench | click | toggle_plan | | .qd-plan-toggle |

Return *wire*.

## _request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| address | text | required | 站内任务 API |
| generation | number | required | 固定回合代数 |
| session | text | required | 固定任务身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `address`, `generation` and `session`。官方 fetch_all 回传原请求 URL，网络错误也可以先按身份忽略。会话字段进入实际服务参数，qd_session 和 qd_generation 则是浏览器自己的响应筛选依据。

We **address = `address` + "&session=" + `session` + "&qd_session=" + `session` + "&qd_generation=" + str(`generation`)**.

We **method = "GET"**.
1. not text.contains(text=`address`, sub="/pull?")
  We **method = "POST"**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `address` | `method` |

Return *[保留原请求身份](browser.fetch_all(requests=`requests`, then="on_response"))*.

## _state_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | required | 要查看的任务 |
| epoch | number | required | 这次切换序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `session` and `epoch`。恢复请求与任务轮询使用不同回调。切换立即使旧序号失效，即使旧页面稍后才响应，也不能重新覆盖已选任务。

Return *[恢复所选任务](_control_request(address=("/api/state?session=" + `session` + "&epoch=" + str(`epoch`)), epoch=`epoch`, callback="on_state"))*.

## _control_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| address | text | required | 控制 API |
| epoch | number | required | 固定切换身份 |
| callback | text | required | 固定回调入口 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `address`, `epoch` and `callback`。地址和回调由产品源码确定，不从模型回答取值。独立身份附在原地址末尾，格式错误和失败响应也不会污染更新后的页面。

Create and toggle use POST; state recovery remains a read. The native host checks the mutation origin.

We **address = `address` + "&qd_epoch=" + str(`epoch`)**.

We **method = "GET"**.
1. text.contains(text=`address`, sub="/api/sessions?") or text.contains(text=`address`, sub="/api/plugins?") or text.contains(text=`address`, sub="/api/plugin_catalog?")
  We **method = "POST"**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `address` | `method` |

Return *[读取真实控制结果](browser.fetch_all(requests=`requests`, then=`callback`))*.

## _send_effect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| payload | text | required | 已校验问题 |
| generation | number | required | 本轮身份 |
| selected_model | text | required | 选定模型 |
| session | text | required | 当前任务 |
| knowledge | text | "none" | 当前选择的知识库 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `payload`, `generation`, `selected_model` and `session` and `knowledge`="none"。输入由标准 URL 库编码，不能变成额外参数或程序。新的任务回合清空旧时间线投影；实际档案和工具日志由后端独立保存。此函数构造效果，持久状态由直接事件入口先保存。

The generation and task id are fixed before the fetch effect is returned. A later user interaction cannot make this request belong to another task. The server records the model choice at begin, so changing the model panel mid-task affects only the next send.

Clearing the local timeline starts a new run projection without deleting its server history or effects. The live status is immediate feedback; the first real cards still come from recorded events, not fabricated progress steps.

`params` =

| q | model | client_gen | kb |
|---|---|---|---|
| `payload` | `selected_model` | `generation` | `knowledge` |

We **query = [编码实际问题](url.query_stringify(map=`params`))**.
We **ask = [开始当前会话](_request(address=("/api/chat?" + `query`), generation=`generation`, session=`session`))**.
We **clear = [新回合新的卡片](browser.set_html(sel="#qd-trace", html=""))**.
We **clear = [清空已提交输入](_merge(a=`clear`, b=browser.set_value(sel="#chat-input", value="")))**.
We **busy = [保留取消入口](_merge(a=_controls(send_off=True, stop_off=False), b=browser.set_text(sel="#chat-status", text="任务已提交，等待实际执行…")))**.
Return *[提交后在对话内显示真实经过](_merge(a=_merge(a=`clear`, b=`busy`), b=_merge(a=`ask`, b=close_panels())))*.

## send

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | text | "" | 输入框内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `value`=""。空输入和忙状态在更改代数之前拒绝。直接事件保存当前问题和阶段，辅助函数不能替入口持久化。停止尚未确认时不能开始同一会话的新任务。

The busy check applies to the selected task. A user who wants independent work can switch sessions without cancelling this one. An empty message leaves generation unchanged and preserves the editor. A successful submission clears only the submitted text, not workspace files or previous conversation turns.

1. `upload_busy`
  Return *[文件保存后再开始任务](browser.set_text(sel="#chat-status", text="文件正在上传，请完成后再发送任务"))*.
1. `phase` != "idle"
  Return *[等待当前任务](browser.set_text(sel="#chat-status", text="请等待、停止，或切换到其他任务"))*.
We **payload = [读取完整问题](text.str_trim(s=`value`))**.
1. `payload` == ""
  Return *[需要实际问题](browser.set_text(sel="#chat-status", text="请输入任务"))*.
We **question = `payload`** and **gen = `gen` + 1** and **phase = "sending"** and **trace_seen = 0** and **trace_open = ""**.
Return *[提交当前任务](_send_effect(payload=`payload`, generation=`gen`, selected_model=`model`, session=`session_id`, knowledge=`kb`))*.

## on_key

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| key | text | "" | 按键 |
| value | text | "" | 输入框内容 |
| shift_key | bool | False | 原生 Shift 修饰键 |
| is_composing | bool | False | 输入法仍在确认文字 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `key`="", `value`="", `shift_key`=False and `is_composing`=False。Enter 与发送按钮执行相同合同，普通键盘输入保持原样。状态在该直接入口保存，不能嵌套调用 send 后期待其局部赋值成为浏览器会话状态。

The keyboard entry duplicates only the small state transition required by the browser's direct-entry semantics. Request construction and response handling remain shared. Do not replace this with a nested send call unless state persistence is verified through the official WASM.

1. `key` != "Enter" or `shift_key` or `is_composing`
  Return *None*.
1. `upload_busy`
  Return *[文件保存后再开始任务](browser.set_text(sel="#chat-status", text="文件正在上传，请完成后再发送任务"))*.
1. `phase` != "idle"
  Return *[已有活动任务](browser.set_text(sel="#chat-status", text="请等待或切换任务"))*.
We **payload = [读取实际输入](text.str_trim(s=`value`))**.
1. `payload` == ""
  Return *None*.
We **question = `payload`** and **gen = `gen` + 1** and **phase = "sending"** and **trace_seen = 0** and **trace_open = ""**.
Return *[Enter 提交同一协议](_send_effect(payload=`payload`, generation=`gen`, selected_model=`model`, session=`session_id`, knowledge=`kb`))*.

## on_tick

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

定时器只在当前任务运行时读取事实。不执行模型或工具，不因旧定时器唤起已经结束的回合；每个请求携带当前会话和代数。

1. `phase` != "streaming"
  Return *None*.
Return *[读取当前任务事实](_request(address=("/api/chat/pull?gen=" + str(`gen`)), generation=`gen`, session=`session_id`))*.

## _decode_response

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 保留 URL 的网络结果 |
| generation | number | required | 当前代数 |
| current_phase | text | required | 当前阶段 |
| session | text | required | 当前任务 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `results`, `generation`, `current_phase` and `session`。先看原地址再解析正文，旧任务的网络错误也要忽略。正在停止时普通轮询无权写回；成功 HTTP 还必须有真实协议身份和安全渲染片段。

There are three identity boundaries. The original URL carries the task and generation even for a failed fetch. The current phase decides whether the response is still allowed to update anything. Finally the parsed protocol must echo the same task and job generation. Check them in that order, before using HTML or showing a network error.

A response from a hidden old session must be ignored even if it has the same numeric generation as the current session. During stopping, only the cancellation request may settle the UI; an earlier successful pull cannot restore running controls. Once idle or loading a different session, late task responses have no effect.

An HTTP success alone is insufficient. Invalid JSON, a failure Result, missing readable content or mismatched identity is an explicit error for the current request. Preserve that distinction instead of inserting the raw response body. The parsed page fragment comes from the trusted Markdown renderer, and tool outputs remain escaped in their own cards.

This helper is pure classification. It does not change phase, trace_seen, question or selected task. The direct callback owns those persistent updates so an ignored response cannot poison the cache or resume a timer.

We **response = access(`results`, 1)**.
We **address = json.get(value=`response`, key="url")**.
1. not `address` or not text.ends_with(text=`address`, suffix=("qd_generation=" + str(`generation`))) or not text.contains(text=`address`, sub=("qd_session=" + `session` + "&"))
  Return *[_旧响应无效果](_decision(action="ignore", status="", parsed=None, is_stop=False))*.
We **is_stop = text.contains(text=`address`, sub="/api/chat/stop?")**.
1. `current_phase` == "idle" or `current_phase` == "loading" or `current_phase` == "stopping" and not `is_stop`
  Return *[过期阶段忽略](_decision(action="ignore", status="", parsed=None, is_stop=`is_stop`))*.
1. not access(`response`, "ok")
  Return *[请求失败](_decision(action="error", status="网络请求失败，请重新打开当前任务以恢复实际状态", parsed=None, is_stop=`is_stop`))*.
We **decoded = json.try_parse(text=access(`response`, "body"))**.
1. not access(`decoded`, "ok")
  Return *[格式错误](_decision(action="error", status="服务响应格式错误", parsed=None, is_stop=`is_stop`))*.
We **parsed = access(`decoded`, "value")**.
1. json.get(value=`parsed`, key="ok") != True
  Return *[实际服务失败](_decision(action="error", status=json.stringify(value=`parsed`), parsed=None, is_stop=`is_stop`))*.
1. json.get(value=`parsed`, key="session") != `session` or json.get(value=`parsed`, key="gen") != `generation` or not json.get(value=`parsed`, key="page_html")
  Return *[协议身份不一致](_decision(action="error", status="任务响应身份不一致，请重新打开当前任务", parsed=None, is_stop=`is_stop`))*.
Return *[有效真实快照](_decision(action="render", status="", parsed=`parsed`, is_stop=`is_stop`))*.

## _trace

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| cards | list | required | 实际卡片投影 |
| seen | number | required | 浏览器已建立的最大序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `cards` and `seen`。新卡片一次追加，已有卡片只更新状态和结果叶节点。详情容器始终保留，轮询不重建它，所以刚展开的内容不会立刻折叠。没有结束记录的阶段显示运行或中断，不提供虚假百分比。

A start sequence creates exactly one card. For sequences already displayed, update only the status text, result text and lifecycle classes. The details region and its expanded class are deliberately absent from the patch. A new shell already contains its current values, so do not attempt to patch a node before append_html has created it.

Status classes need the same non-overlap rule as panel classes: the new class must be excluded from the removal set because the official bridge applies class effects in a fixed order. Running animation stops when a recorded terminal state arrives. The actual result is text, not model-selected markup.

These effects can share set_text with the global status line. Use the local selector-aware merge helper so one map does not overwrite the other. Otherwise a new answer could appear while its tool cards kept stale running text, even though the server had sent their completed values.

We **append = ""** and **htmls = table.empty_map()** and **texts = [叶节点更新映射](table.empty_map())** and **adds = [真实状态样式](table.empty_map())** and **removes = [只移除旧状态](table.empty_map())**.
- [稳定卡片身份](for cards as card)
  We **seq = access(`card`, "seq")** and **status = access(`card`, "status")**.
  1. `seq` > `seen`
    We **append = `append` + access(`card`, "html")**.
  2. *
    We **prefix = "#qd-event-" + str(`seq`)**.
    We **texts = [只更新状态](table.put(in=`texts`, at=(`prefix` + "-status"), value=access(`card`, "status_text")))**.
    We **texts = [只更新结果](table.put(in=`texts`, at=(`prefix` + "-output"), value=access(`card`, "output")))**.
    We **thinking_html = json.get(value=`card`, key="thinking_html")**.
    1. `thinking_html` != None
      We **htmls = table.put(in=`htmls`, at=(`prefix` + "-thinking"), value=`thinking_html`)**.
    We **adds = [实际状态对应动画](table.put(in=`adds`, at=`prefix`, value=("is-" + `status`)))**.
    We **others = text.replace(text="is-running is-succeeded is-failed is-cancelled is-interrupted is-ready is-answer_only is-incomplete", old=("is-" + `status`), new="")**.
    We **removes = [新类不在移除集合](table.put(in=`removes`, at=`prefix`, value=`others`))**.
We **out = [稳定文本更新](table.put(in=None, at="set_text", value=`texts`))**.
We **out = table.put(in=`out`, at="set_html", value=`htmls`)**.
We **out = [保留详情展开类](table.put(in=`out`, at="add_class", value=`adds`))**.
We **out = [清理已结束动画](table.put(in=`out`, at="remove_class", value=`removes`))**.
1. `append` != ""
  We **out = [追加真实新步骤](table.put(in=`out`, at="append_html", value=table.put(in=None, at="#qd-trace", value=`append`)))**.
Return *out*.

## on_response

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 官方桥接请求结果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `results`。直接回调验证身份后持久化状态。正文未变化时保留 DOM；时间线单独追加与更新，不能因为回复变长重置用户展开的卡片。取消确认和完成都停止轮询，传输错误提示恢复任务查看真实服务状态。

Accept the response only after the pure decoder confirms its original request, protocol identity and current phase. Then persist trace_seen from the accepted card list. An ignored response must not advance that counter or change last_html, because either change could hide the next legitimate update.

The answer region is replaced only when its safe rendered fragment changes. The timeline is a sibling outside that region and is updated through stable leaf targets. Combining these effects must merge inner selector maps; a global status update must not discard completed tool results.

Done means stop scheduling pulls for this job. The actual status may be succeeded, failed, cancelled, incomplete or answer_only, and should remain visible. A currently running response schedules a new read after a short delay; it does not execute a task step in the browser.

On a current network error, make the failure readable and allow reopening the task to restore actual server state. Do not claim that losing the browser connection cancelled the independent worker. A generation mismatch or an old task response never performs that recovery for the new task.

The inspector summary is another independent target. Updating it cannot replace the selected document or the main trace containers.

We **decision = [先验证请求归属](_decode_response(results=`results`, generation=`gen`, current_phase=`phase`, session=`session_id`))**.
1. access(`decision`, "action") == "ignore"
  Return *None*.
1. access(`decision`, "action") == "error"
  We **phase = "idle"** and **question = ""**.
  Return *[保留失败提示](_idle(status=access(`decision`, "status")))*.
We **parsed = access(`decision`, "parsed")**.
We **page = access(`parsed`, "page_html")** and **answer = json.get(value=`parsed`, key="answer_html")**.
1. not `answer`
  We **answer = ""**.
We **paint = [实际事件独立更新](_trace(cards=access(`parsed`, "trace_cards"), seen=`trace_seen`))**.
We **activity_html = json.get(value=`parsed`,key="activity_html")**.
1. `activity_html` != None
  We **paint = _merge(a=`paint`,b=browser.set_html(sel="#qd-inspector-activity",html=`activity_html`))**.
We **workbench = json.get(value=`parsed`,key="workbench_html")**.
1. `workbench` != None and `workbench` != `last_workbench`
  We **paint = _merge(a=`paint`,b=browser.set_html(sel="#qd-workbench,#qd-inspector-body",html=`workbench`))**.
  We **last_workbench = `workbench`**.
We **cards = access(`parsed`, "trace_cards")**.
- [保存已经创建的卡片序号](for cards as card)
  1. access(`card`, "seq") > `trace_seen`
    We **trace_seen = access(`card`, "seq")**.
1. `page` != `last_html` or `answer` != `last_answer`
  We **paint = [只替换回答区域](_merge(a=`paint`, b=_paint_page(html=`page`, answer=`answer`, scroll_sel="#qd-reply")))** and **last_html = `page`** and **last_answer = `answer`**.
1. access(`parsed`, "done")
  We **phase = "idle"** and **question = ""**.
  Return *[任务已有真实终态](_merge(a=`paint`, b=_idle(status=("任务状态 · " + access(`parsed`, "status")))))*.
We **phase = "streaming"**.
Return *[等待实际下一阶段](_merge(a=`paint`, b=_merge(a=browser.set_text(sel="#chat-status", text="任务运行中 · 详见执行记录"), b=browser.after(ms=600, then="on_tick"))))*.

## stop

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

停止只针对当前任务。确认之前保持 stopping，普通轮询不能抢写半成品或恢复发送。后端验证任务和代数，并停止受控进程组；其他任务继续运行。

The stop request includes the task and generation selected at click time. While it is pending, both send and stop are disabled to prevent overlapping begins. A separate session can still be opened and used. If this response arrives after a switch, normal identity filtering protects the newly selected task.

1. `phase` == "idle" or `phase` == "loading" or `phase` == "stopping"
  Return *None*.
We **phase = "stopping"**.
Return *[等待实际取消确认](_merge(a=_controls(send_off=True, stop_off=True), b=_request(address=("/api/chat/stop?gen=" + str(`gen`)), generation=`gen`, session=`session_id`)))*.

## on_session

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 委托按钮携带的业务身份 |
| id | text | "" | 委托按钮的任务身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `data_id`="" and `id`=""。切换会立即失效旧回调，但不停止旧任务。新任务状态完全由服务端恢复，不能把上一个任务的 gen、已显示卡片或正文缓存带过去。

Switching invalidates old UI callbacks but leaves their server processes alone. The newly selected task restores its own generation, transcript and event sequence. Titles are not identities, so two tasks with the same title remain distinct.

1. `data_id` != ""
  We **id = `data_id`**.
1. `id` == ""
  Return *None*.
We **session_id = `id`** and **view_epoch = `view_epoch` + 1** and **phase = "loading"** and **trace_seen = 0** and **trace_open = ""** and **last_html = ""** and **question = ""** and **kb = "none"**.
Return *[切换独立任务](_merge(a=_controls(send_off=True, stop_off=True), b=_merge(a=close_panels(), b=_state_request(session=`session_id`, epoch=`view_epoch`))))*.

## create_session

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | text | "" | 新任务标题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `value`=""。创建由工程服务生成真实独立 UUID。等待期间保持 loading，切换序号使更旧的恢复或创建响应不能覆盖这个任务；标题只是展示文字。

The server creates the opaque identity and workspace. A browser title is never used as a directory. Incrementing the view epoch also protects against a slower earlier create or restore request returning later. The resulting state callback adopts the returned id only after its request epoch is still current.

We **title = text.str_trim(s=`value`)**.
1. `title` == ""
  We **title = "新任务"**.
We **view_epoch = `view_epoch` + 1** and **phase = "loading"** and **trace_seen = 0** and **trace_open = ""** and **last_html = ""**.
We **params = table.put(in=None, at="title", value=`title`)**.
We **params = table.put(in=`params`, at="epoch", value=`view_epoch`)**.
Return *[建立真正独立的任务](_merge(a=close_panels(), b=_control_request(address=("/api/sessions?" + url.query_stringify(map=`params`)), epoch=`view_epoch`, callback="on_state")))*.

## _control_result

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 网络结果 |
| epoch | number | required | 当前切换身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `results` and `epoch`。控制响应先核对原地址上的序号，再解析正文。失效响应返回空值；当前请求失败仍保留失败，调用者明确显示错误，不把旧页面当作最新状态。

A control request can fail before any JSON exists. Preserve that distinction for the caller, and ignore an expired epoch even in the error case. A successful HTTP response still needs its service-level ok field checked by the direct callback.

We **response = access(`results`, 1)**.
1. not text.ends_with(text=access(`response`, "url"), suffix=("qd_epoch=" + str(`epoch`)))
  Return *None*.
1. not access(`response`, "ok")
  Return *[保留真实传输失败](table.put(in=None, at="ok", value=False))*.
We **parsed = json.try_parse(text=access(`response`, "body"))**.
1. not access(`parsed`, "ok")
  Return *[格式错误不注入正文](table.put(in=None, at="ok", value=False))*.
Return *[取得真实协议](access(`parsed`, "value"))*.

## on_state

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 恢复或新建响应 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `results`。直接回调保存新会话状态，并一次建立该任务的卡片。正在运行的任务恢复轮询；已结束任务只阅读历史。任务卡片的折叠只在真正切换或恢复时重置，正常轮询保持原节点。

This callback is the only place where a restore or create response adopts a session snapshot. It saves the server generation rather than carrying the old task's value forward. It also clears the displayed-card counter and expanded-state record because this is a real session replacement, unlike ordinary polling.

The four HTML targets have separate purposes: qd-dialogue holds safe Markdown history and qd-reply holds the current answer, qd-trace begins empty for newly appended cards, and the two panel bodies hold actual plugin and session controls. Replacing those list bodies cannot erase the separate create-title input. A running job schedules observation with its restored identity; a completed job remains a static readable history.

The trace append effect is applied to the freshly cleared parent, using card shells that already contain current results. Later polls update their leaf nodes only. This preserves the user's detail expansion until they actually switch away. No answer text is interpreted as a task status or executable instruction.

If restoring fails, show the service diagnostic and let the user reopen the task. Do not manufacture an empty successful session in the browser, because its files and worker may still exist independently on the server.

Restoring a task also refreshes the current user's public model choices, without returning any credential. The browser's chosen model is highlighted again after the list has been replaced. That visual update keeps the current modal open and does not start inference or change a running job. The model form remains outside the replaced list, preserving unfinished input.

The accepted snapshot also supplies the workbench of persistent plans, child states and real files. Restoring replaces that region once; subsequent normal polls leave it untouched when its rendered content is unchanged.

The accepted snapshot supplies the workspace display name. Only this callback updates the page heading; subsequent answer paints leave it alone. Missing names in legacy fixtures retain the current heading rather than showing an opaque session id.

Restoring a task also clears the previous task's preview and invalidates any in-flight file request. Public model titles are data for labels only.

The public model-title map is refreshed with this accepted task snapshot, without transferring credentials to the browser.

An initial account default is adopted only before the user has made a choice. Explicit selection, including none, survives later task switches; restoring a task never silently changes the model already running on its worker.

We **parsed = _control_result(results=`results`, epoch=`view_epoch`)**.
1. not `parsed`
  Return *None*.
1. json.get(value=`parsed`, key="ok") != True
  We **phase = "idle"**.
  Return *[恢复失败清楚说明](_idle(status=("任务恢复失败，请重新打开任务："+json.stringify(value=`parsed`))))*.
We **titles = json.get(value=`parsed`,key="model_titles")**.
1. `titles` != None
  We **model_titles = `titles`**.
We **nav_open = False**.
We **preferred = json.get(value=`parsed`,key="default_model")**.
1. not `model_chosen` and `preferred` and `preferred` != "none"
  We **model = `preferred`** and **model_chosen = True**.
We **session_id = access(`parsed`, "session")** and **gen = access(`parsed`, "gen")** and **last_html = access(`parsed`, "page_html")** and **trace_seen = 0** and **trace_open = ""**.
We **last_answer = json.get(value=`parsed`, key="answer_html")**.
1. not `last_answer`
  We **last_answer = ""**.
We **preview_gen = `preview_gen` + 1**.
We **html = table.put(in=None, at="#qd-preview,#qd-workspace-files,#qd-preview-title",value="")**.
We **html = table.put(in=`html`, at="#qd-dialogue", value=`last_html`)**.
We **html = table.put(in=`html`, at="#qd-reply", value=`last_answer`)**.
We **html = table.put(in=`html`, at="#qd-trace", value="")**.
We **last_workbench = json.get(value=`parsed`,key="workbench_html")**.
1. `last_workbench` == None
  We **last_workbench = ""**.
We **html = table.put(in=`html`,at="#qd-workbench,#qd-inspector-body",value=`last_workbench`)**.
We **activity_html = json.get(value=`parsed`,key="activity_html")**.
1. `activity_html` != None
  We **html = table.put(in=`html`,at="#qd-inspector-activity",value=`activity_html`)**.
We **html = table.put(in=`html`, at="#panel-plugins-body", value=access(`parsed`, "plugins_html"))**.
We **html = table.put(in=`html`, at="#panel-workspace-body", value=access(`parsed`, "sessions_html"))**.
We **knowledge = json.get(value=`parsed`, key="knowledge_html")**.
1. `knowledge`
  We **html = table.put(in=`html`, at="#panel-kb-body", value=`knowledge`)**.
We **models_html = json.get(value=`parsed`, key="models_html")**.
1. `models_html` != None
  We **html = table.put(in=`html`, at="#panel-model-body", value=`models_html`)**.
We **kb = "none"**.
We **paint = _merge(a=table.put(in=None, at="set_html", value=`html`),b=browser.remove_class(sel="body",class="qd-nav-open"))**.
We **workspace_title = json.get(value=`parsed`, key="workspace_title")**.
1. `workspace_title`
  We **paint = _merge(a=`paint`, b=browser.set_text(sel="#qd-workspace-title", text=`workspace_title`))**.
We **paint = _merge(a=`paint`, b=browser.set_text(sel="#tab-kb", text="知识库"))**.
We **paint = _merge(a=`paint`, b=_trace(cards=access(`parsed`, "trace_cards"), seen=0))**.
We **active = "#model-none"**.
1. `model` != "none"
  We **active = "#model-" + `model`**.
1. `model` == "qwen3.5:4b-q4_K_M"
  We **active = "#model-qwen"**.
We **paint = _merge(a=`paint`, b=browser.interval(ms=25, then="sync_model_choice", id="model-choice"))**.
We **cards = access(`parsed`, "trace_cards")**.
- [保存当前卡片序号](for cards as card)
  We **trace_seen = access(`card`, "seq")**.
We **phase = "idle"**.
1. not access(`parsed`, "done")
  We **phase = "streaming"**.
  Return *[继续读取原任务](_merge(a=`paint`, b=_merge(a=_controls(send_off=True, stop_off=False), b=browser.after(ms=600, then="on_tick"))))*.
Return *[阅读真实历史](_merge(a=`paint`, b=_idle(status=("任务已就绪 · " + `session_id`))))*.

## on_plugin

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 委托按钮携带的业务身份 |
| id | text | "" | 已登记拓展身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `data_id`="" and `id`=""。标准库按钮禁用，后端也独立拒绝关闭。拓展开关控制下一次实际调用，不把当前界面卸载掉；切换后只刷新面板，不重置正在阅读的执行卡片。

1. `data_id` != ""
  We **id = `data_id`**.
1. `id` == "" or `id` == "stdlib"
  Return *None*.
Return *[修改真实拓展授权](_control_request(address=("/api/plugins?id=" + `id` + "&session=" + `session_id` + "&epoch=" + str(`view_epoch`)), epoch=`view_epoch`, callback="on_plugins"))*.

## on_plugins

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 真实切换结果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `results`。插件响应使用切换序号过滤，避免更新到另一任务。只替换插件和任务列表；对话、卡片父容器和用户展开状态保持现有节点。失败说明来自实际服务，不能只改前端按钮来伪装授权成功。

独立注册表响应只包含插件列表，可能不包含会话列表。仅在字段实际存在时刷新会话区域，避免读取插件后清空已有任务选择。

The service returns the actual persisted switch state. This callback does not toggle a local boolean optimistically or assume that a disabled button is authorization. A failed standard-library toggle or missing plugin remains a readable failure. Only the panel lists refresh; normal task polling continues with its own identity.

We **parsed = _control_result(results=`results`, epoch=`view_epoch`)**.
1. not `parsed`
  Return *None*.
1. json.get(value=`parsed`, key="ok") != True
  Return *[真实切换失败](_merge(a=browser.set_text(sel="#chat-status", text=json.stringify(value=`parsed`)), b=browser.set_text(sel="#panel-plugins-body", text="插件清单读取失败，请关闭后重试。")))*.
We **html = table.put(in=None, at="#panel-plugins-body", value=access(`parsed`, "plugins_html"))**.
We **sessions_html = json.get(value=`parsed`,key="sessions_html")**.
1. `sessions_html` != None
  We **html = table.put(in=`html`,at="#panel-workspace-body",value=`sessions_html`)**.
Return *[只刷新能力面板](table.put(in=None, at="set_html", value=`html`))*.

## toggle_trace

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 委托按钮携带的业务身份 |
| id | text | "" | 真实卡片序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

Use `data_id`="" and `id`=""。展开状态由直接点击入口持久化。只切换已存在卡片的详情类，并更新按钮的 aria-expanded；轮询只改叶节点，因此不会马上把它折回去。这里不会执行卡片里显示的调用。

The details target is derived from an event sequence already supplied by the server. The button carries that sequence as data-id. Opening a card adds its own token to the local expanded-state record, and closing removes only that token; two open cards do not collide because the delimiter includes both sides of the identity.

A normal poll cannot remove the details class: it patches the card's status and result leaves, not this container. The aria-expanded attribute uses explicit lowercase values for assistive technology. No click evaluates the displayed argv, tool output or Markdown content.

A genuine session switch resets the token record along with the timeline. A new run in the same session does likewise because its sequence numbers restart. These resets correspond to new content, while an unchanged running card keeps its stable identity.

1. `data_id` != ""
  We **id = `data_id`**.
1. `id` == ""
  Return *None*.
We **token = "|" + `id` + "|"**.
We **selector = "#qd-event-" + `id` + "-details"**.
We **button = "#qd-event-" + `id` + " .qd-trace-toggle"**.
We **expanded = True** and **key = "add_class"**.
1. text.contains(text=`trace_open`, sub=`token`)
  We **trace_open = text.replace(text=`trace_open`, old=`token`, new="")** and **expanded = False** and **key = "remove_class"**.
2. *
  We **trace_open = `trace_open` + `token`**.
We **effect = table.put(in=None, at=`key`, value=table.put(in=None, at=`selector`, value="is-expanded"))**.
We **aria = "false"**.
1. `expanded`
  We **aria = "true"**.
We **attribute = table.put(in=None, at="aria-expanded", value=`aria`)**.
Return *[阅读真实详情](_merge(a=`effect`, b=table.put(in=None, at="set_attr", value=table.put(in=None, at=`button`, value=`attribute`))))*.

## open_activity

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方桥接实际执行的浏览器效果 |

执行经过已经位于对话区，这个兼容入口只滚动定位，不能触发一次模型或工具，也不清除后台记录。

Return *[定位对话里的真实经过](table.put(in=None, at="scroll_into", value="#qd-execution"))*.

## _controls

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| send_off | bool | required | True：忙，隐藏发送、显示停止 |
| stop_off | bool | required | True：闲，隐藏停止、显示发送 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | set_attr disabled 对 |

布尔值由官方桥接转换成属性的存在与移除，False 不是字符串形式的禁用。按钮外观继续由产品样式决定。

Use `send_off` and `stop_off`.

We **s = [发送按钮属性](table.put(in=None, at="disabled", value=`send_off`))** and **t = [停止按钮属性](table.put(in=None, at="disabled", value=`stop_off`))** and **attrs = [发送选择器在前](table.put(in=None, at="#chat-send", value=`s`))** and **attrs = [停止选择器在后](table.put(in=`attrs`, at="#chat-stop", value=`t`))**.
Return *[一个 set_attr 携带两个选择器](table.put(in=None, at="set_attr", value=`attrs`))*.

## _idle

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| status | text | "就绪" | 状态文案 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 恢复发送按钮 |

此函数只更新外观。调用它之前，直接事件入口应当已经把阶段和问题保存为闲置状态。

Use `status`.

We **stat = [写状态](browser.set_text(sel="#chat-status", text=`status`))** and **btn = [恢复按钮](_controls(send_off=False, stop_off=True))**.
Return *[状态与按钮](_merge(a=`stat`, b=`btn`))*.

## _paint_page

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| html | text | required | 安全渲染的历史与问题 |
| answer | text | "" | 独立的当前 Markdown 回复 |
| scroll_sel | text | "#qd-chat-log" | 滚动目标 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 替换官方结构容器 |

片段来自服务端官方渲染。标题更新和正文替换属于不同效果键，合并时不会互相覆盖。

滚动目标取自已验证的响应，空片段不会在解码阶段放行。

Use `html`, `answer`="" and `scroll_sel`.

We **paint = [聊天壳](_merge(a=browser.set_html(sel="#qd-dialogue", html=`html`), b=browser.set_html(sel="#qd-reply", html=`answer`)))** and **scroll = [滚动](table.put(in=None, at="scroll_into", value=`scroll_sel`))**.
Return *[合并](_merge(a=`paint`, b=`scroll`))*.

## _show_panel

| 参数 | 类型 | 说明 |
|---|---|---|
| id | text | 要打开的面板选择器 |
| tab | text | 与面板对应的标签选择器 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 清理旧高亮后打开指定面板 |

Use `id` and `tab`。面板与标签由四个顶层入口固定传入，不从模型回答中取选择器。
先复用关闭效果，再写入一份 add_class 映射。remove_class 与 add_class 是不同的效果键，
能够合并；同一个键必须先合并内部映射，不能期待浅合并函数自动合并两套选择器。
此辅助函数没有需要持久化的状态；当前打开哪个面板由 DOM 的类表示。

The dialog, backdrop and body receive distinct state classes. Their removal targets deliberately exclude the panel being opened, so the bridge's fixed class-effect order cannot immediately close it again. aria-hidden follows the same exclusion rule. The backdrop sits above the composer, and the dialog above the backdrop. Marking the conversation and composer inert keeps clicks and keyboard focus out of the background. Focus moves to the selected dialog's close button, giving a predictable keyboard starting point. No visibility change writes settings or sends a model request.

We **closed = [只清理其他面板](close_panels(except_panel=`id`, except_tab=`tab`))**.
We **add = [打开目标面板](table.put(in=None, at=`id`, value="is-open"))**.
We **add = table.put(in=`add`, at="#qd-backdrop", value="is-open")**.
We **add = table.put(in=`add`, at="body", value="qd-modal-open")**.
We **add = [高亮对应标签](table.put(in=`add`, at=`tab`, value="is-active"))**.
We **opened = _merge(a=`closed`, b=table.put(in=None, at="add_class", value=`add`))**.
We **attrs = table.put(in=None, at=`id`, value=table.put(in=None, at="aria-hidden", value="false"))**.
We **attrs = table.put(in=`attrs`, at="#qd-conversation,#qd-chrome,#qd-sidebar,.qd-workspace-header,#qd-inspector", value=table.put(in=None, at="inert", value=True))**.
Return *[居中打开并聚焦关闭按钮](_merge(a=`opened`, b=_merge(a=table.put(in=None, at="set_attr", value=`attrs`), b=browser.focus(sel=(`id` + "-close")))))*.

## open_model

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 打开模型面板 |

打开模型选择面板，标签与面板的关系固定在这个入口。

The composer opens a compact selection list. Adding or editing a connection is an explicit management action from the sidebar or the list footer, so choosing a model does not expose a credential form unnecessarily.

Return *[快捷选择下一轮模型](_merge(a=_show_panel(id="#panel-model",tab="#tab-model"),b=browser.add_class(sel="#panel-model",class="is-open is-picker")))*.

## open_plugins

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 打开插件库 |

展示插件面板，不在浏览器端加载服务器动态库。打开时独立请求注册表，完整列出标准库与全部已登记拓展，不等待聊天档案恢复。加载提示仅表示请求尚未返回，不能被当成空注册表。

The catalogue request uses the current view epoch and the existing authenticated same-origin control transport. Its response goes through on_plugins, which preserves conversation and expanded trace nodes. An unavailable native artifact remains an explicit unavailable card, while errors remain visible inside the panel. Reading this list never enables a plugin, requests a model or unloads the running Web host. A new open action refreshes the real persisted settings rather than trusting stale local visibility.

We **panel = _show_panel(id="#panel-plugins", tab="#tab-plugins")**.
We **loading = browser.set_text(sel="#panel-plugins-body", text="正在读取全部已注册插件…")**.
We **request = _control_request(address=("/api/plugin_catalog?epoch=" + str(`view_epoch`)), epoch=`view_epoch`, callback="on_plugins")**.
Return *[打开并读取全部已注册能力](_merge(a=`panel`, b=_merge(a=`loading`, b=`request`)))*.

## open_workspace

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 打开工作区 |

展示工作区面板；这里不授予文件读写权限。

Return *[打开工作区](_show_panel(id="#panel-workspace", tab="#tab-workspace"))*.

## close_panels

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| except_panel | text | "" | 本次要打开的面板，空则全部关闭 |
| except_tab | text | "" | 本次要激活的标签，空则全部取消 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 关闭面板 |

关闭时一次性给所有面板和标签移除各自的状态类，保留原来的布局和内容。
逗号分隔的选择器由浏览器统一匹配，不再逐个构造重复操作。两组类合在同一映射后
才包成 remove_class，所以关闭模型不会遗漏刚刚打开的知识面板，也不会保留错误高亮。
此函数只构造效果，不承担客户端持久状态的清理。

关闭只影响四组浮层。对话结构容器、当前输入和网络请求均不属于此操作的目标，关闭浮层不会取消正在进行的回答。

同一关闭效果也供模型选择后收起浮层使用。

Use `except_panel`="" and `except_tab`=""。官方桥接应用类效果时有固定顺序，
不能用映射构造顺序表达“先移除再添加”。打开某项时，关闭选择器必须排除该项；
否则新添加的类会被稍后的整组移除立刻清掉。关闭按钮不传例外，所以仍关闭全部面板。

The same effect is consumed directly by the close button, backdrop click and Escape handler, and indirectly after choosing a model or knowledge source. It must restore aria-hidden, remove the body scroll lock and backdrop class, and remove inert from the conversation and composer. Returning only remove_class would leave an invisible but unusable page, so callers must preserve the accompanying set_attr and focus effects. When another panel is being opened, retain the backdrop and inert state; only the previous dialog becomes hidden. Closing a selection never cancels a task or changes its archive.

We **panels = [排除本次要打开的面板](_without_selector(group="#panel-model,#panel-plugins,#panel-workspace,#panel-kb", selected=`except_panel`))**.
We **tabs = [排除本次要激活的标签](_without_selector(group="#tab-model,#tab-plugins,#tab-workspace,#tab-kb", selected=`except_tab`))**.
We **removed = [收起全部面板](table.put(in=None, at=`panels`, value="is-open"))**.
We **removed = [取消全部标签高亮](table.put(in=`removed`, at=`tabs`, value="is-active"))**.
We **attrs = table.put(in=None, at=`panels`, value=table.put(in=None, at="aria-hidden", value="true"))**.
1. `except_panel` == ""
  We **removed = table.put(in=`removed`, at="#qd-backdrop", value="is-open")**.
  We **removed = table.put(in=`removed`, at="body", value="qd-modal-open")**.
  We **attrs = table.put(in=`attrs`, at="#qd-conversation,#qd-chrome,#qd-sidebar,.qd-workspace-header,#qd-inspector", value=table.put(in=None, at="inert", value=False))**.
We **out = _merge(a=table.put(in=None, at="remove_class", value=`removed`), b=table.put(in=None, at="set_attr", value=`attrs`))**.
1. `except_panel` == ""
  We **out = _merge(a=`out`, b=browser.focus(sel="#chat-input"))**.
Return *[收起遮罩并恢复对话操作](`out`)*.

## _model_chrome

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| active | text | required | 高亮按钮选择器 |
| label | text | required | 状态与角标文案 |
| close | bool | True | 用户选择后收起面板；恢复状态时保持当前浮层 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 只改 DOM；不写外层 model 状态 |

颜色和文字只表达选择结果。服务器使用发送时传入的真实模型标识，不根据按钮显示文案推断模型。

面板关闭和模型选项清理也共享 remove_class 这一效果键。因此先读取关闭效果的内部映射，把模型选择器加入同一映射，再一次提交。这样既收起浮层，也移除旧选项高亮，后续添加当前选项时不会出现两个模型同时被选中的视觉状态。

移除状态的选择器排除当前按钮，因而不依赖桥接先添加还是先移除。当前按钮原有样式类继续保留，只改变选择状态类，不把整个 class 属性替换成一段临时文字。

Use `active`, `label` and `close`=True. 外层 model 必须由 pick_* 顶层赋值。

外观更新只使用传入的 active 与 label，不隐式读取或改写入口中的 model。
三个模型按钮共享同一组状态类，先移除整组高亮，再给选中的按钮添加高亮。
状态行和角标属于同一个 set_text 效果，因此先把两个选择器合成内部映射，再包成效果。
若直接合并两份 set_text，后者会覆盖前者；这里明确避免这种浅合并陷阱。

Dynamic custom choices participate in the same non-overlapping highlight cleanup. Restoring a snapshot can request close=False, retaining the current dialog while only synchronizing selection.

We **closed = table.empty_map()**.
1. `close`
  We **closed = [取得面板关闭效果](close_panels())**.
We **removed = [保留面板和标签清理](json.get(value=`closed`, key="remove_class"))**.
We **others = [只清理未选中的模型](_without_selector(group="#model-none,#model-echo,#model-qwen", selected=`active`))**.
We **removed = table.put(in=`removed`, at=(".qd-model-select:not(" + `active` + ")"), value="is-active")**.
We **removed = [合并模型选择清理](table.put(in=`removed`, at=`others`, value="is-active"))**.
We **remove = [一次提交所有清理选择器](table.put(in=None, at="remove_class", value=`removed`))**.
We **add = [高亮当前模型](browser.add_class(sel=`active`, class="is-active"))**.
We **labels = [更新状态文案](table.put(in=None, at="#chat-status", value=("模型：" + `label`)))**.
We **labels = [更新模型角标](table.put(in=`labels`, at="#chat-model-label,#tab-model", value=`label`))**.
We **labels = [合成同一文本效果](table.put(in=None, at="set_text", value=`labels`))**.
Return *[应用模型选择外观](_merge(a=`closed`, b=_merge(a=_merge(a=`remove`, b=`add`), b=`labels`)))*.

## pick_none

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 选 none |

在直接事件入口保存 none，下一轮不启动模型；已有对话、任务目录和能力面板仍可阅读。

We **model_chosen = True**.
We **model = "none"**.
Return *[选 none](_model_chrome(active="#model-none", label="none"))*.

## pick_qwen

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 选 qwen |

保存的是本地 Ollama 的完整模型标识，角标只展示较短名称。模型未安装时应由服务端保留真实错误。

We **model_chosen = True**.
We **model = "qwen3.5:4b-q4_K_M"**.
Return *[选 qwen](_model_chrome(active="#model-qwen", label="qwen3.5"))*.

## _decision

| 参数 | 类型 | 说明 |
|---|---|---|
| action | text | ignore、error 或 render |
| status | text | 可读的失败原因，成功时为空 |
| parsed | any | 已通过协议校验的响应，忽略与失败时为 None |
| is_stop | bool | 是否来自当前停止请求 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 四个字段始终存在的纯判定结果 |

Use `action`, `status`, `parsed` and `is_stop`。统一结果形状使回调可以先决定是否处理，
再读取成功正文。它只表达判定，不设置按钮、不清空问题、不触碰浏览器状态。
忽略不是错误；过期响应连错误提示都不能写进当前回合。

`decision` =

| action | status | parsed | is_stop |
|---|---|---|---|
| `action` | `status` | `parsed` | `is_stop` |

Return *decision*.

## _without_selector

| 参数 | 类型 | 说明 |
|---|---|---|
| group | text | 产品声明的逗号分隔简单 ID 选择器 |
| selected | text | 需要排除的单个 ID；空则不排除 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 保留合法逗号结构的其他选择器 |

Use `group` and `selected`。这不是通用 CSS 解析器，只处理本文件固定的简单 ID 列表。
排除项可能在首部、中间或尾部，因此分别消去后置逗号与前置逗号，不留下空选择器。
列表包含多个固定控件，正常打开操作不会把整组变为空。

排除当前项让 add_class 和 remove_class 的目标互不重叠。这样无论官方桥接以怎样的
固定顺序执行两类效果，当前目标都不会在同一轮里被再次取消；模型高亮和浮层开关
共享这一条明确合同，不需要复制外部 JavaScript 或改写官方桥接。

1. `selected` == ""
  Return *group*.
We **others = [处理首部或中间项](text.replace(text=`group`, old=(`selected` + ","), new=""))**.
Return *[处理末尾项](text.replace(text=`others`, old=("," + `selected`), new=""))*.




## _merge

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| a | any | required | 前一组效果 |
| b | any | required | 后一组效果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 保留不同 DOM 目标的效果映射 |

Use `a` and `b`。官方 merge 是浅合并；状态行与执行卡片都使用 set_text，直接合并会丢掉前一组目标。这里只对明确的 DOM 目标映射合并内部选择器，同一选择器以后者为准。网络、定时器和其他效果继续沿用官方语义，不擅自拼接两次调用。

For example, set_text can update both chat-status and qd-event-4-output in one callback. The two selectors must survive together. This helper is limited to known DOM-target maps and does not concatenate asynchronous operations or change the official bridge.

We **out = browser.merge(a=`a`, b=`b`)**.

`keys` =

| key |
|---|
| "set_text" |
| "set_html" |
| "set_value" |
| "set_attr" |
| "add_class" |
| "remove_class" |
| "append_html" |

- [保留不同目标的同类效果](for keys as key)
  We **left = json.get(value=`a`, key=`key`)** and **right = json.get(value=`b`, key=`key`)**.
  1. `left` and `right`
    We **both = browser.merge(a=`left`, b=`right`)**.
    We **out = table.put(in=`out`, at=`key`, value=`both`)**.
Return *out*.

## open_knowledge

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 居中的知识库选择浮层 |

只打开已有参考来源，不执行模型，也不授予任何新能力。列表来自服务端真实目录，选择在下一轮发送时生效。关闭按钮、遮罩和 Esc 共享同一份关闭效果，因此不会遗留压暗背景。

Return *[选择本轮参考](_show_panel(id="#panel-kb", tab="#tab-kb"))*.

## pick_knowledge

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 委托按钮携带的业务身份 |
| id | text | "" | 已登记的知识根 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 保存下一轮参考并收起浮层 |

Use `data_id`="" and `id`=""。选项来自实际目录，服务端还会独立校验；这个选择不是服务器路径或执行权限。直接事件入口保存 kb，不能把赋值藏进辅助函数。当前运行的任务保留开始时的参考，改变选项只影响下一次发送。

The selected label is deliberately short and appears in the capsule. Closing restores background interaction through the existing effect contract. Other knowledge buttons lose their active class, while the chosen button is excluded from that removal set, preserving the official bridge's fixed effect order.

1. `data_id` != ""
  We **id = `data_id`**.
1. `id` == ""
  Return *None*.
We **kb = `id`**.
We **out = close_panels()**.
We **clear = browser.remove_class(sel=(".qd-kb-select:not(#kb-" + `id` + ")"), class="is-active")**.
We **selected = browser.add_class(sel=("#kb-" + `id`), class="is-active")**.
We **label = "知识库"**.
1. `id` != "none"
  We **label = "知识·" + `id`**.
Return *[选择只是下一轮的上下文](_merge(a=`out`, b=_merge(a=_merge(a=`clear`, b=`selected`), b=browser.set_text(sel="#tab-kb", text=`label`))))*.

## on_escape

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| key | text | "" | 浏览器按键 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Esc 关闭选择浮层，其他按键保持默认 |

Use `key`=""。键盘事件来自原生桥接。只有 Escape 触发关闭，不拦截输入框中的普通文字或 Enter，不把关闭面板误当成停止任务。背景在浮层期间不可操作，关闭会恢复原来的输入能力。

1. `key` == "Escape"
  Return *[关闭当前选择浮层](close_panels())*.
Return *None*.

## on_file

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| file_size | number | 0 | 原生文件字节数 |
| file_name | text | "" | 原生文件显示名 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 建立当前任务的有界上传 |

Use `file_size`=0 and `file_name`=""。读取前检查 50 MiB 上限，保存发起时的任务和切换序号。先向服务端申请上传身份，不把整份 Base64 放入 WASM。原生选择器在完成或失败前禁用，避免两份异步读取混淆。空文件也经过真实的开始和完成操作。

The browser owns only a selected file and byte cursor. The server owns the destination, expected total and acknowledged offset. A successful begin is not a published attachment. Every later read is at most 256 KiB and is triggered only after the previous server acknowledgement. Switching workspaces stops this chain instead of uploading into the newly selected task.

No chunk is read until the server has established its own upload identity. This also supports empty files without manufacturing a data block or claiming a picker event saved content. The client retains only the cursor and identity, not the complete file bytes.

1. `upload_busy`
  Return *None*.
1. `file_name` == ""
  Return *None*.
1. `file_size` > 52428800
  Return *[读取前拒绝超过 50 MiB](browser.set_text(sel="#chat-status", text="单文件上限 50 MiB"))*.
We **upload_busy = True** and **upload_session = `session_id`** and **upload_epoch = `view_epoch`** and **upload_total = `file_size`** and **upload_offset = 0** and **upload_id = ""** and **upload_phase = "begin"**.
We **payload = table.put(in=None, at="action", value="begin")**.
We **payload = table.put(in=`payload`, at="name", value=`file_name`)**.
We **payload = table.put(in=`payload`, at="total", value=`file_size`)**.
We **payload = table.put(in=`payload`, at="session", value=`upload_session`)**.
We **payload = table.put(in=`payload`, at="epoch", value=`upload_epoch`)**.
We **disabled = table.put(in=None, at="#chat-file", value=table.put(in=None, at="disabled", value=True))**.
We **paint = _merge(a=table.put(in=None, at="set_attr", value=`disabled`), b=browser.set_text(sel="#chat-status", text="正在准备上传…"))**.
Return *[先建立真实上传身份](_merge(a=`paint`, b=_upload_request(payload=`payload`, epoch=`upload_epoch`)))*.


## on_file_read

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| ok | bool | False | 实际范围读取成功 |
| data_url | text | "" | 有界文件片段 |
| offset | number | 0 | 实际读取起点 |
| read_size | number | 0 | 实际片段字节数 |
| error | text | "" | 宿主错误 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 只上传当前任务的下一块 |

Use `ok`=False, `data_url`="", `offset`=0, `read_size`=0 and `error`=""。核对宿主读取偏移、当前上传阶段、任务和切换序号。错误或切换时停止上传，不把旧文件移到新任务。每次只传一块，下一块等待真实服务端确认。

The read_file host returns bytes from Blob.slice, not a filesystem path. Data is ordinary JSON and cannot choose a service function or native executable. No local read is counted as uploaded. The response must acknowledge exactly this chunk's bytes before the cursor advances, preventing duplicate or skipped ranges from being displayed as progress.

A local read cannot advance the acknowledged cursor.

1. not `ok` or `upload_session` != `session_id` or `upload_epoch` != `view_epoch` or `upload_phase` != "reading" or `offset` != `upload_offset` or `read_size` <= 0 or `read_size` > 262144
  We **upload_busy = False** and **upload_phase = ""**.
  Return *[失败或切换时停止分块](_upload_idle(status="上传已停止：读取失败或工作区已切换"))*.
We **upload_read_size = `read_size`** and **upload_phase = "chunk"**.
We **payload = table.put(in=None, at="action", value="chunk")**.
We **payload = table.put(in=`payload`, at="upload_id", value=`upload_id`)**.
We **payload = table.put(in=`payload`, at="offset", value=`upload_offset`)**.
We **payload = table.put(in=`payload`, at="data_url", value=`data_url`)**.
We **payload = table.put(in=`payload`, at="session", value=`upload_session`)**.
We **payload = table.put(in=`payload`, at="epoch", value=`upload_epoch`)**.
Return *[只提交实际读取的片段](_upload_request(payload=`payload`, epoch=`upload_epoch`))*.


## _upload_idle

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| status | text | required | 真实状态说明 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 恢复上传选择器并显示状态 |

Use `status`。这个辅助函数只构造 DOM 效果，不改变任务阶段、模型或会话身份。恢复 file input 后清空它的值，让用户可以再次选择同名文件。真正的上传忙闲由直接回调保存，失败不生成“已保存”附件提示。

The cleared picker value never deletes the uploaded workspace file; it only resets this input control for a later explicit selection.

We **attrs = table.put(in=None, at="#chat-file", value=table.put(in=None, at="disabled", value=False))**.
Return *[恢复原生文件选择](_merge(a=table.put(in=None, at="set_attr", value=`attrs`), b=_merge(a=browser.set_value(sel="#chat-file", value=""), b=browser.set_text(sel="#chat-status", text=`status`))))*.

## on_uploaded

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 实际分块服务响应 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 按真实确认位置继续或完成上传 |

Use `results`。先过滤旧任务响应，失败就停止，不盲目重试追加。开始响应保存不透明身份；分块响应必须与本地待确认范围完全一致；全部收齐后再请求 finish。只有完成返回真实路径，界面才写“已上传”。

The cursor advances from the server's acknowledged bytes, never a timer or guessed percentage. The chosen native file input remains the source for the next bounded read. A workspace switch invalidates the response and restores the picker, leaving any old partial file unpublished in its original task. The server independently verifies ownership, order, total and actual file length under its control lock.

No aggregate Base64 string is stored in browser session state. At most one 256 KiB chunk is in flight. A failed finish is not reported as a saved attachment, and a partial upload is not inserted into the model's reference list. Previously completed workspace files remain intact.

Begin, chunk and finish are distinct phases rather than guesses inferred from a response length. The handler saves each phase in the direct callback before scheduling another effect. A mismatch stops immediately and leaves the server's partial file unpublished. Normal task polling may continue independently, but cannot change this upload identity or move it into another workspace.

Publishing is a separate server acknowledgement, including the zero-byte case.

We **parsed = _control_result(results=`results`, epoch=`view_epoch`)**.
1. not `parsed` or `upload_session` != `session_id`
  We **upload_busy = False** and **upload_phase = ""**.
  Return *[旧上传不污染新任务](_upload_idle(status="工作区已切换，上传已停止"))*.
1. json.get(value=`parsed`, key="ok") != True
  We **upload_busy = False** and **upload_phase = ""**.
  Return *[错误不是成功进度](_upload_idle(status=("上传失败：" + json.stringify(value=`parsed`))))*.
We **value = access(`parsed`,"value")**.
1. `upload_phase` == "finish"
  We **upload_busy = False** and **upload_phase = ""**.
  Return *[完整文件才显示完成](_upload_idle(status=("已上传到当前工作区：" + access(`value`,"path"))))*.
1. `upload_phase` == "begin"
  We **upload_id = access(`value`,"upload_id")**.
1. `upload_phase` == "chunk"
  1. access(`value`,"offset") != `upload_offset` + `upload_read_size`
    We **upload_busy = False** and **upload_phase = ""**.
    Return *[拒绝不一致确认](_upload_idle(status="上传确认不一致，请重新选择文件"))*.
We **upload_offset = access(`value`,"offset")**.
1. `upload_offset` < `upload_total`
  We **upload_phase = "reading"**.
  We **sent_mib = `upload_offset` / 1048576** and **total_mib = `upload_total` / 1048576**.
  We **status = "正在上传 · " + str(`sent_mib`) + " / " + str(`total_mib`) + " MiB"**.
  Return *[服务端确认后读取下一块](_merge(a=browser.set_text(sel="#chat-status", text=`status`), b=_read_upload(offset=`upload_offset`)))*.
We **upload_phase = "finish"**.
We **payload = table.put(in=None, at="action", value="finish")**.
We **payload = table.put(in=`payload`, at="upload_id", value=`upload_id`)**.
We **payload = table.put(in=`payload`, at="session", value=`upload_session`)**.
We **payload = table.put(in=`payload`, at="epoch", value=`upload_epoch`)**.
Return *[收齐后请求原子发布](_upload_request(payload=`payload`, epoch=`upload_epoch`))*.


## pick_custom_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 真实配置身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 保存下一轮选择并关闭面板 |

Use `data_id`=""。委托事件读取业务身份，不把 DOM id 当作供应商模型名。该身份由服务端保存响应或当前用户清单提供；实际调用仍会验证拥有者。选择只影响下一轮，不改写运行中的作业，也不在浏览器读取 API Key。

1. `data_id` == ""
  Return *None*.
We **model_chosen = True**.
We **model = `data_id`**.
We **name = json.get(value=`model_titles`,key=`model`)**.
1. not `name`
  We **name = "自定义模型"**.
Return *[下一轮使用该配置](_model_chrome(active=("#model-" + `model`), label=`name`))*.

## _model_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| payload | map | required | JSON 设置数据 |
| epoch | number | required | 发起时切换序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 模型配置 POST 效果 |

Use `payload` and `epoch`。凭据在 JSON 请求体中，URL 只带响应筛选序号。地址和回调固定，不从模型文字中选择。浏览器使用现有同源认证，服务端重新注入真实身份；前端不保存 API Key 到 URL、localStorage 或对话档案。

We **address = "/api/models?qd_epoch=" + str(`epoch`)**.
We **body = json.stringify(value=`payload`)**.

`requests` =

| @ | url | method | body |
|---|---|---|---|
| 1 | `address` | "POST" | `body` |

Return *[凭据只在请求正文传输](browser.fetch_all(requests=`requests`, then="on_models"))*.

## save_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| fields | any | None | 原生 FormData 字段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 保存当前配置，不触发推理 |

Use `fields`=None。官方桥接在 submit 时读取原生表单，先阻止页面导航。直接回调保存忙状态，一次只提交一个配置请求。密钥不复制到客户端持久变量，保存结束后清空密码输入。失败保留其他字段便于修正，不把保存成功冒充供应商测试通过。

The form collects only provider data. It cannot select a service function, owner, project directory or plugin. A task's model selection is updated only by the accepted save response, and the backend encrypts credentials before returning an opaque profile id. Until that acknowledgement arrives, the existing model remains selected.

1. `model_saving` or not `fields`
  Return *None*.
We **model_saving = True**.
We **payload = table.put(in=`fields`, at="epoch", value=`view_epoch`)**.
We **busy = table.put(in=None, at="#model-save", value=table.put(in=None, at="disabled", value=True))**.
We **paint = _merge(a=table.put(in=None, at="set_attr", value=`busy`), b=browser.set_text(sel="#model-form-status", text="正在加密保存模型配置…"))**.
Return *[同源保存自定义模型](_merge(a=`paint`, b=_model_request(payload=`payload`, epoch=`view_epoch`)))*.

## remove_model

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 已保存配置身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 删除自己的配置 |

Use `data_id`=""。删除同样进入认证后的接口，不在浏览器先移除一张卡片假装成功。与保存共享请求忙状态，避免迟到列表覆盖后来的设置。正在运行的任务不自动换模型，服务端继续独立验证配置归属。

The shared busy guard serializes settings writes; a delayed response cannot resurrect a model removed by a later concurrent request.

1. `data_id` == "" or `model_saving`
  Return *None*.
We **model_saving = True**.
We **payload = table.put(in=None, at="action", value="remove")**.
We **payload = table.put(in=`payload`, at="id", value=`data_id`)**.
We **payload = table.put(in=`payload`, at="epoch", value=`view_epoch`)**.
Return *[实际删除当前用户设置](_model_request(payload=`payload`, epoch=`view_epoch`))*.

## on_models

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 实际保存或删除响应 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 公开列表和选中状态更新，不回填密钥 |

Use `results`。先按切换序号过滤，再读取公开结果。保存成功后直接事件持久化模型身份，刷新可选择清单并收起浮层。删除当前选项会回到 none；删除别的选项保持原来选择。没有响应或失败时恢复提交按钮，并在表单保留错误提示。

The response never contains a credential. Clear the password field only for an accepted current response, so a stale acknowledgement cannot erase newly typed input after a workspace switch. The selector-aware merge retains both list HTML and close attributes, avoiding an invisible modal interaction lock. Saving a profile never starts a model request by itself.

A stale response restores the submit control but does not clear a password newly typed in another workspace. A current failure clears the submitted secret and retains the other editable fields. Public list updates and modal cleanup use separate effect maps so the official bridge can preserve both. The accepted profile id is the only model state saved in the browser.

Dynamic option highlights run only after the new DOM exists, using an independent one-shot interval rather than competing with the task polling timer.

The new list also refreshes public model names, so the composer shows the actual selected configuration.

We **model_saving = False**.
We **attrs = table.put(in=None, at="#model-save", value=table.put(in=None, at="disabled", value=False))**.
We **paint = table.put(in=None, at="set_attr", value=`attrs`)**.
We **parsed = _control_result(results=`results`, epoch=`view_epoch`)**.
1. not `parsed`
  Return *paint*.
We **paint = _merge(a=`paint`, b=browser.set_value(sel="#model-api_key", value=""))**.
1. json.get(value=`parsed`, key="ok") != True
  Return *[配置错误留在表单](_merge(a=`paint`, b=browser.set_text(sel="#model-form-status", text=("保存失败：" + json.stringify(value=`parsed`)))))*.
We **titles = json.get(value=`parsed`,key="model_titles")**.
1. `titles` != None
  We **model_titles = `titles`**.
We **paint = _merge(a=`paint`, b=browser.set_html(sel="#panel-model-body", html=access(`parsed`,"models_html")))**.
We **paint = _merge(a=`paint`, b=browser.set_text(sel="#model-form-status", text="模型配置已更新"))**.
We **sync = browser.interval(ms=25, then="sync_model_choice", id="model-choice")**.
We **id = json.get(value=`parsed`, key="model_id")**.
1. `id`
  We **model_chosen = True**.
  We **model = `id`**.
  Return *[已加密保存并选中](_merge(a=`paint`, b=_merge(a=close_panels(), b=`sync`)))*.
1. json.get(value=`parsed`, key="removed") == `model`
  We **model = "none"**.
  Return *[已删除当前模型](_merge(a=`paint`, b=_merge(a=close_panels(), b=`sync`)))*.
Return *[只刷新公开清单](_merge(a=`paint`, b=_merge(a=`sync`, b=browser.set_text(sel="#model-form-status", text="模型配置已删除"))))*.

## _upload_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| payload | map | required | 本次有界上传数据 |
| epoch | number | required | 发起任务切换序号 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 同源分块 POST 效果 |

Use `payload` and `epoch`。URL 只保留回调身份，片段在 JSON 请求体内。服务端不接受浏览器指定的文件根或源程序。这个助手不保存上传状态，阶段和游标由直接事件入口持久化；也不重复一个可能已写入的片段。

We **address = "/api/upload?qd_epoch=" + str(`epoch`)**.
We **body = json.stringify(value=`payload`)**.

`requests` =

| @ | url | method | body |
|---|---|---|---|
| 1 | `address` | "POST" | `body` |

Return *[现有认证接口接收有界数据](browser.fetch_all(requests=`requests`, then="on_uploaded"))*.

## _read_upload

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| offset | number | required | 已确认的下一个字节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Web 插件已有 read_file ABI 的有界范围 |

Use `offset`。本地 Web 插件对 read_file 增加 offset 和 length，宿主每次只取 Blob.slice。固定单块 256 KiB，不把五十 MiB 的 Base64 送入 WASM。回调还会核对偏移、实际片段长度及任务归属；读取不代表服务端保存成功。

`spec` =

| sel | then | offset | length | as |
|---|---|---|---|---|
| "#chat-file" | "on_file_read" | `offset` | 262144 | "data_url" |

Return *[使用本地 Web 宿主有界 ABI](table.put(in=None, at="read_file", value=`spec`))*.

## sync_model_choice

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 先完成列表渲染，再同步真实选项高亮 |

官方桥接按固定顺序应用效果，add_class 在 set_html 之前。新建模型的按钮若在同一效果中才被创建，高亮会丢失；因此使用独立的一次 interval 回调，在 DOM 更新后再应用选择样式。它进入后立即清除自己的定时器，不进行后台轮询，也不会与任务拉取的 after 键冲突。

The callback reads the latest persisted model, so a fast user change cannot apply a stale profile's highlight. No model request or settings mutation occurs here. The modal remains in its existing state, and the separate form is preserved. This same synchronization is used after a restored public list and after save or delete, retaining consistent behavior for dynamic controls.

We **active = "#model-none"** and **label = `model`**.
1. `model` == "none"
  We **label = "选择模型"**.
1. `model` != "none"
  We **active = "#model-" + `model`**.
1. `model` == "qwen3.5:4b-q4_K_M"
  We **active = "#model-qwen"**.
1. text.starts_with(text=`model`, prefix="custom-")
  We **label = json.get(value=`model_titles`,key=`model`)**.
  1. not `label`
    We **label = "自定义模型"**.
We **paint = _merge(a=browser.clear_interval(id="model-choice"), b=_model_chrome(active=`active`, label=`label`, close=False))**.
Return *[同步已建立的模型控件](`paint`)*.


## toggle_navigation

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 移动端导航可见性 |

导航开关只改变布局，不重新加载会话，也不会清空输入和执行展开状态。移动端按同一个入口打开和收起侧栏；桌面导航始终可见。状态在直接事件入口保存，服务数据与运行进程不受此操作影响。

A drawer is a visual affordance. It must not reload the page, choose a task or erase an unfinished composer draft. The directly invoked callback persists the boolean before returning the class effect, allowing the next click to reverse the same operation.

We **nav_open = not `nav_open`**.
We **key = "remove_class"**.
1. `nav_open`
  We **key = "add_class"**.
Return *[只改变导航布局](table.put(in=None,at=`key`,value=table.put(in=None,at="body",value="qd-nav-open")))*.

## toggle_inspector

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| viewport_width | number | 1600 | 宿主实际视口宽度 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 文件检查区显隐 |

关闭检查区会保留正在阅读的文档，重新打开不需要重复模型或文件写入。这个开关不属于浮层遮罩，也不阻止对话输入。窄屏上检查区覆盖对话，仍有明确关闭入口，原会话状态保留。

The pane can be reopened with its existing content. A visual close is distinct from cancelling a task or dismissing a modal. This direct callback stores the visibility decision and leaves server-side execution entirely unchanged.

Opening the pane refreshes only the file list; closing it preserves the already rendered document and its open details.

Use `viewport_width`=1600。桌面默认展开，小屏默认收起；第一次点击小屏开关应直接打开，不需要先点一次关闭隐藏的面板。显式打开以后切换遵守已保存的布尔状态，不能只依赖CSS猜测。

1. `inspector_initial` and `viewport_width` <= 1180
  We **inspector_open = False**.
We **inspector_initial = False**.
We **inspector_open = not `inspector_open`**.
We **key = "remove_class"**.
1. `inspector_open`
  We **key = "add_class"**.
  We **paint = table.put(in=None,at=`key`,value=table.put(in=None,at="body",value="qd-inspector-open qd-inspector-requested"))**.
  Return *[打开时读取当前文件](_merge(a=`paint`,b=_inspect_request(session=`session_id`,epoch=`view_epoch`,request_id=`preview_gen`,action="files",callback="on_files")))*.
Return *[只改变阅读空间](table.put(in=None,at=`key`,value=table.put(in=None,at="body",value="qd-inspector-open")))*.

## open_files

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 打开文件检查区并读取当前任务真实文件 |

每次打开都从当前会话读取文件清单，已有产物卡片继续来自正常任务轮询。序号和会话身份由客户端当前状态提供，不接受模型正文选择。此入口不会写入文件，不从旧任务缓存拼出新的列表。

A fresh list reflects files created since the last inspection. The list request does not replace the current document; only selecting a file does. The current task identity travels with the request and an old task's delayed list is ignored.

We **inspector_initial = False**.
We **inspector_open = True**.
We **paint = _merge(a=browser.add_class(sel="body",class="qd-inspector-open qd-inspector-requested"),b=browser.remove_class(sel="body",class="qd-inspector-process"))**.
Return *[读取当前任务文件](_merge(a=`paint`,b=_inspect_request(session=`session_id`,epoch=`view_epoch`,request_id=`preview_gen`,action="files",callback="on_files")))*.

## _inspect_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | required | 当前会话 |
| epoch | number | required | 当前视图 |
| request_id | number | required | 当前文件请求 |
| action | text | required | files 或 preview |
| callback | text | required | 固定回调 |
| path | text | "" | 相对路径 |
| artifact | text | "" | 产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 编码后的只读请求 |

Use `session`, `epoch`, `request_id`, `action`, `callback`, `path`="" and `artifact`=""。参数使用标准 URL 编码，文件名中的空格和符号不能改变查询结构。请求携带会话、视图和预览三种身份，回调仍需检查它们；请求开始不代表预览成功。

`params` =

| session | epoch | request_id | action | path | artifact |
|---|---|---|---|---|---|
| `session` | `epoch` | `request_id` | `action` | `path` | `artifact` |

We **query = url.query_stringify(map=`params`)**.
Return *[只读接口请求](_control_request(address=("/api/inspect?" + `query`),epoch=`epoch`,callback=`callback`))*.

## inspect_artifact

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 登记的产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实产物内容预览请求 |

Use `data_id`=""。按钮身份来自后端清单，服务再次核对归属。先显示读取提示，再请求源稿；文件序号在直接事件中递增，旧预览的响应不能覆盖后来的选择。对话与工具详情保持原 DOM。

An artifact is selected by its registered identity, not a label or a filename guessed from model prose. Incrementing the request identity before fetch ensures that two quick selections cannot race to display the wrong manuscript. The server resolves the source and the UI preserves the running conversation.

We **preview_gen = `preview_gen` + 1** and **inspector_open = True**.
We **paint = _merge(a=browser.add_class(sel="body",class="qd-inspector-open qd-inspector-requested"),b=browser.remove_class(sel="body",class="qd-inspector-process"))**.
We **paint = _merge(a=`paint`,b=browser.set_text(sel="#qd-preview",text="正在读取文稿…"))**.
Return *[按真实身份读取文稿](_merge(a=`paint`,b=_inspect_request(session=`session_id`,epoch=`view_epoch`,request_id=`preview_gen`,action="preview",artifact=`data_id`,callback="on_preview")))*.

## inspect_file

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| data_id | text | "" | 工作根相对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前工作文件只读预览 |

Use `data_id`=""。工作文件与产物使用同一归属和响应过滤，但路径仍由服务器文件根强制限制。Marqdo 源文件只交给原生 DocumentViewV1，不执行其函数。打开新文件只改变检查区，不改变对话或当前模型。

The file path is ordinary query data and passes through URL encoding. The server's native root boundary remains authoritative, even if a crafted event supplies a parent path. No filesystem permission is derived from a visible filename or a successful earlier preview.

We **preview_gen = `preview_gen` + 1** and **inspector_open = True**.
We **paint = _merge(a=browser.add_class(sel="body",class="qd-inspector-open"),b=browser.remove_class(sel="body",class="qd-inspector-process"))**.
We **paint = _merge(a=`paint`,b=browser.set_text(sel="#qd-preview",text="正在使用原生阅读器解析…"))**.
Return *[真实文件只读请求](_merge(a=`paint`,b=_inspect_request(session=`session_id`,epoch=`view_epoch`,request_id=`preview_gen`,action="preview",path=`data_id`,callback="on_preview")))*.

## on_files

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 实际响应 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前任务文件清单局部更新 |

Use `results`。会话和视图同时匹配才更新文件列表。读取失败显示诊断，不能把接口失败当作空目录；文件内容不作为客户端代码运行。列表与文稿预览是不同节点，刷新列表不会清除正在阅读的内容。

A list is an observation of what exists now, not a statement that a model understood those files. Empty directories and failed reads remain different states. The component-generated buttons can be rebound by stable delegation without injecting another script or changing application permissions.

We **parsed = _control_result(results=`results`,epoch=`view_epoch`)**.
1. not `parsed`
  Return *None*.
1. json.get(value=`parsed`,key="ok") != True
  Return *browser.set_text(sel="#qd-workspace-files",text="文件列表读取失败，请重新打开。")*.
1. json.get(value=`parsed`,key="session") != `session_id`
  Return *None*.
Return *[更新真实文件列表](browser.set_html(sel="#qd-workspace-files",html=json.get(value=`parsed`,key="files_html")))*.

## on_preview

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| results | list | required | 实际只读结果 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前文件的安全渲染内容 |

Use `results`。视图、会话和文件请求身份全部匹配后才展示内容。原生 View 或安全 Markdown 已在可信服务端生成，客户端不重新解释语法或执行源文件。迟到的旧文件响应不清空新文档，错误保留可读提示。

The accepted result is already a safe rendering from the trusted reader. Source code is never evaluated by this callback. A malformed or foreign response cannot replace the current pane, and a late response cannot clear a newer selected document. The header title and document body use separate effects so text remains escaped. Both successful and failed network observations retain the original request identity, allowing the pane to reject stale errors as well as stale content. Preview requests have no authority to change tasks, model choice, plugin switches or worker lifecycle.

Source and filename are accepted only after the same session and request checks as the rendered fragment. The source is written with set_text into a separate pre target, preserving literal markup safely. A newly selected document returns to rendered mode, avoiding a confusing inherited source-only view. The filename is download metadata rather than a filesystem capability; no path from this callback is used to read another server file.

We **current_request = False**.
- [错误响应也要按原请求排序](for results as response)
  1. re.is_match(text=str(json.get(value=`response`,key="url")),pattern=("[?&#]request_id=" + str(`preview_gen`) + "(&|#|$)"))
    We **current_request = True**.
1. not `current_request`
  Return *None*.
We **parsed = _control_result(results=`results`,epoch=`view_epoch`)**.
1. not `parsed`
  Return *None*.
1. json.get(value=`parsed`,key="ok") != True
  Return *browser.set_text(sel="#qd-preview",text="预览无法读取，请确认登录状态后重新选择文件。")*.
1. json.get(value=`parsed`,key="session") != `session_id` or json.get(value=`parsed`,key="request_id") != str(`preview_gen`)
  Return *None*.
We **preview_source = json.get(value=`parsed`,key="source")**.
1. not `preview_source`
  We **preview_source = ""**.
We **preview_filename = json.get(value=`parsed`,key="filename")**.
1. not `preview_filename`
  We **preview_filename = "document.mq.md"**.
We **paint = browser.set_html(sel="#qd-preview",html=json.get(value=`parsed`,key="html"))**.
We **paint = _merge(a=`paint`,b=browser.set_text(sel="#qd-preview-source",text=`preview_source`))**.
We **paint = _merge(a=`paint`,b=browser.remove_class(sel="#qd-inspector",class="qd-show-source"))**.
We **paint = _merge(a=`paint`,b=table.put(in=None,at="scroll_into",value="#qd-preview-title"))**.
Return *[标题与文稿分别更新](_merge(a=`paint`,b=browser.set_text(sel="#qd-preview-title",text=json.get(value=`parsed`,key="title"))))*.

## show_activity

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际执行摘要检查区 |

过程标签打开真实事件摘要，详细参数仍在对话中的稳定卡片内展开。不会复制带相同身份的 DOM，也不会启动模型或重试工具。新任务没有记录时明确提示，进度动画只表示正在运行的实际阶段。检查区与对话分别滚动，关闭检查区保留当前卡片和文稿。

We **inspector_initial = False**.
We **inspector_open = True**.
Return *[显示真实过程检查区](browser.add_class(sel="body",class="qd-inspector-open qd-inspector-process qd-inspector-requested"))*.


## reveal_logic

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | "" | 原生 View 生成的逻辑标签身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 展开同一阅读片段中的实际逻辑侧注 |

Use `id`=""。原生 View 的遮蔽标签与实际逻辑侧注有匹配身份，点击只打开这个检查区中的对应 details。事件不会调用文件函数、模型或工具。目标身份必须符合原生逻辑标记格式，无法选择页面之外的任意节点。

The native fragment supplies both the label and its note. This callback adds only the host interaction needed when that fragment is embedded in the harness. It does not parse Marqdo syntax or replace the official renderer. Opening the note preserves its original formatting and exposes its actual source disclosure. Scoping the selector to the preview prevents another document's node from being changed.

The operation is a visual read action. It does not mark a step completed, create an execution receipt, or grant access to another file. Source content remains inactive even when its logic is fully visible.

1. not re.is_match(text=`id`,pattern="^logic-[A-Za-z0-9_-]+-source$")
  Return *None*.
We **target = "#qd-preview #" + text.replace(text=`id`,old="-source",new="-note")**.
We **attrs = table.put(in=None,at="open",value=True)**.
Return *[只展开原生侧注](table.put(in=None,at="set_attr",value=table.put(in=None,at=`target`,value=`attrs`)))*.


## open_model_settings

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 完整模型管理表单 |

配置和选择是不同操作。输入区打开紧凑的已有模型列表，侧栏和管理按钮打开完整表单；同一份真实模型清单持续复用，避免出现两套选择状态。进入配置不启动推理，不清空当前对话或输入，关闭后回到任务。

Return *[管理入口显示完整配置](_merge(a=_show_panel(id="#panel-model",tab="#nav-settings"),b=browser.remove_class(sel="#panel-model",class="is-picker")))*.


## toggle_plan

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 收起或展开计划详情 |

这里只改变真实计划的阅读空间。步骤数量、状态和验收条件仍来自保存的计划，不启动子任务、不完成步骤、不改写证据。页面类在普通轮询中保持，因此更新进度后用户仍保留收起状态。控制位于主对话，检查区隐藏重复计划。

Return *[计划详情保持独立](browser.toggle_class(sel="body",class="qd-plan-collapsed"))*.

## _layout_effect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| left | number | required | 侧栏像素宽度 |
| right | number | required | 检查区像素宽度 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 同步布局变量与无障碍数值 |

Use `left` and `right`。同一变量控制页首、对话、输入区与分隔条，杜绝不同的硬编码偏移。已经校验的宽度仅写 CSS 和 aria-valuenow。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

We **style = table.put(in=None,at="--qd-sidebar",value=(str(`left`) + "px"))**.
We **style = table.put(in=`style`,at="--qd-inspector",value=(str(`right`) + "px"))**.
We **paint = browser.set_style(sel="body",style=`style`)**.
We **attrs = table.put(in=None,at="#resize-sidebar",value=table.put(in=None,at="aria-valuenow",value=`left`))**.
We **attrs = table.put(in=`attrs`,at="#resize-inspector",value=table.put(in=None,at="aria-valuenow",value=`right`))**.
Return *[所有区域同步调宽](_merge(a=`paint`,b=table.put(in=None,at="set_attr",value=`attrs`)))*.

## begin_resize

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | "" | 原生分隔条 |
| client_x | number | 0 | 横坐标 |
| viewport_width | number | 1600 | 宿主视口 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 开始指针拖拽 |

Use `id`="", `client_x`=0 and `viewport_width`=1600。只接受两个固定分隔条。捕获保证拖出手柄后仍能结束操作。小屏使用抽屉，不改变已保存的桌面宽度。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `viewport_width` <= 1180 or (`id` != "resize-sidebar" and `id` != "resize-inspector")
  Return *None*.
We **drag_region = `id`** and **drag_anchor = `client_x`**.
We **drag_start = `layout_sidebar`**.
1. `id` == "resize-inspector"
  We **drag_start = `layout_inspector`**.
Return *[拖拽期间防止选择文字](browser.add_class(sel="body",class="qd-pane-dragging"))*.

## resize_pane

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| client_x | number | 0 | 指针横坐标 |
| viewport_width | number | 1600 | 宿主视口 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 保留中心至少480像素的实时布局 |

Use `client_x`=0 and `viewport_width`=1600。左边向右增加宽度，右边向左增加宽度。两边相互约束，不能把中心挤没。没有活动拖拽时普通移动不产生效果，也不写存储。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `drag_region` == "" or `viewport_width` <= 1180
  Return *None*.
1. `drag_region` == "resize-sidebar"
  We **width = `drag_start` + `client_x` - `drag_anchor`**.
  We **upper = `viewport_width` - `layout_inspector` - 480**.
  1. `upper` > 440
    We **upper = 440**.
  1. `width` > `upper`
    We **width = `upper`**.
  1. `width` < 220
    We **width = 220**.
  We **layout_sidebar = `width`**.
2. *
  We **width = `drag_start` - `client_x` + `drag_anchor`**.
  We **upper = `viewport_width` - `layout_sidebar` - 480**.
  1. `upper` > 760
    We **upper = 760**.
  1. `width` > `upper`
    We **width = `upper`**.
  1. `width` < 320
    We **width = 320**.
  We **layout_inspector = `width`**.
Return *[只改变阅读空间](_layout_effect(left=`layout_sidebar`,right=`layout_inspector`))*.

## end_resize

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 结束拖拽并保存本地偏好 |

只在真实拖拽结束时保存宽度，取消指针也清理拖拽状态，避免永久禁止选中文字。记录仅留在当前站点 localStorage，刷新后恢复，不向服务器或其他用户同步。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `drag_region` == ""
  Return *None*.
We **drag_region = ""**.
We **value = table.put(in=table.put(in=None,at="left",value=`layout_sidebar`),at="right",value=`layout_inspector`)**.
Return *[恢复阅读并记住尺寸](_merge(a=browser.remove_class(sel="body",class="qd-pane-dragging"),b=browser.store_set(key="qdagent.panes.v3",value=json.stringify(value=`value`),scope="local")))*.

## restore_layout

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| ok | bool | False | 存储可用 |
| found | bool | False | 记录存在 |
| value | any | None | 已存记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 校验后恢复尺寸 |

The browser storage ABI stores strings, so writes use explicit JSON serialization and recovery uses a checked JSON parse. Corrupt, missing or foreign-shaped values retain the baseline instead of breaking task recovery. Numeric strings are normalized only after the exact bounded-digit check; no stored CSS or executable source is accepted.

Use `ok`=False, `found`=False and `value`=None。只接收对象中的有界数值，不接收 CSS 或可执行文字。无记录则保持侧栏267和文稿496像素。小屏由媒体规则覆盖为抽屉，不受桌面偏好挤压。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `ok` and `found` and text.starts_with(text=str(`value`),prefix="{")
  We **decoded = json.try_parse(text=str(`value`))**.
  1. access(`decoded`,"ok")
    We **stored = access(`decoded`,"value")**.
    We **left = json.get(value=`stored`,key="left")** and **right = json.get(value=`stored`,key="right")**.
    1. re.is_match(text=str(`left`),pattern="^[0-9]{3}$") and re.is_match(text=str(`right`),pattern="^[0-9]{3}$")
      We **left = json.parse(text=str(`left`))** and **right = json.parse(text=str(`right`))**.
      1. `left` >= 220 and `left` <= 440 and `right` >= 320 and `right` <= 760
        We **layout_sidebar = `left`** and **layout_inspector = `right`**.
Return *[恢复界面偏好](_layout_effect(left=`layout_sidebar`,right=`layout_inspector`))*.

## resize_keyboard

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | "" | 分隔条 |
| key | text | "" | 方向键或Home |
| viewport_width | number | 1600 | 宿主视口 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 键盘调宽与保存 |

Keyboard steps are rejected at a boundary rather than wrapping around or hiding the center pane.

Use `id`="", `key`="" and `viewport_width`=1600。方向键每次移动16像素，Home恢复该侧基准，右边界向左意味着文稿增宽。遵守和指针相同的边界与中心空间约束，保存不依赖鼠标。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `viewport_width` <= 1180 or (`id` != "resize-sidebar" and `id` != "resize-inspector") or (`key` != "ArrowLeft" and `key` != "ArrowRight" and `key` != "Home")
  Return *None*.
We **delta = 16**.
1. `key` == "ArrowLeft"
  We **delta = -16**.
1. `id` == "resize-sidebar"
  We **width = `layout_sidebar` + `delta`**.
  1. `key` == "Home"
    We **width = 267**.
  1. `width` >= 220 and `width` <= 440 and `width` + `layout_inspector` + 480 <= `viewport_width`
    We **layout_sidebar = `width`**.
2. *
  We **width = `layout_inspector` - `delta`**.
  1. `key` == "Home"
    We **width = 496**.
  1. `width` >= 320 and `width` <= 760 and `width` + `layout_sidebar` + 480 <= `viewport_width`
    We **layout_inspector = `width`**.
We **value = table.put(in=table.put(in=None,at="left",value=`layout_sidebar`),at="right",value=`layout_inspector`)**.
Return *[键盘调节同步保存](_merge(a=_layout_effect(left=`layout_sidebar`,right=`layout_inspector`),b=browser.store_set(key="qdagent.panes.v3",value=json.stringify(value=`value`),scope="local")))*.

## reset_layout

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 双击恢复设计比例 |

双击任一分隔条恢复两侧基准，清理拖拽状态并保存。用户不需要清浏览器缓存或重建工作区就能回到设计尺寸。任务、文稿与输入草稿保持原有生命周期。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

We **layout_sidebar = 267** and **layout_inspector = 496** and **drag_region = ""**.
We **value = table.put(in=table.put(in=None,at="left",value=267),at="right",value=496)**.
Return *[恢复设计比例](_merge(a=_layout_effect(left=267,right=496),b=_merge(a=browser.remove_class(sel="body",class="qd-pane-dragging"),b=browser.store_set(key="qdagent.panes.v3",value=json.stringify(value=`value`),scope="local"))))*.

## toggle_preview_source

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 文稿与源码切换 |

源码由同一个所有权检查接口返回，这里只切换稳定阅读节点，不重新读取服务器路径，不调用文稿函数。源码写入普通pre文字，即使包含 HTML 或可执行语法也不执行。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

Return *[源码也是可读内容](browser.toggle_class(sel="#qd-inspector",class="qd-show-source"))*.

## expand_preview

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 扩大或还原阅读空间 |

专注阅读扩大检查区，再次点击恢复文稿宽度。不清除已选文件或改写已保存偏好。小屏原本就是抽屉，仍保留关闭入口。扩大阅读空间不是执行文稿或取消任务。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

Return *[阅读空间可以还原](browser.toggle_class(sel="body",class="qd-reader-focus"))*.

## download_preview

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 下载已读源稿快照 |

只保存已经通过所有权检查并送到客户端的文本，不接收任意服务器路径或外部 URL。文件名来自服务端回显的相对路径，大小受预览限制。文件后来改变需重新读取，下载不声称包含尚未收到的新内容。

The handler runs as a direct browser entry so its state persists in the official WASM. Returned effects change presentation only: no task process, provider request, plugin permission or source execution is involved. Numeric dimensions are bounded before becoming CSS. The conversation and expanded trace remain stable siblings while the inspector changes width. Local preferences are optional; unavailable browser storage never blocks task recovery. All application decisions remain readable Marqdo source rather than host JavaScript.

1. `preview_source` == ""
  Return *None*.
Return *[保存当前源稿](browser.download(body=`preview_source`,filename=`preview_filename`,mime="text/markdown;charset=utf-8"))*.

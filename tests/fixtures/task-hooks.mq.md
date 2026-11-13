
只安排正式入口并检查已持久化的状态，不在辅助函数里替产品保存状态。

## fixture_start

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 挂载结束后触发真实 Enter |

初始 interval 等官方挂载完成后才开始一次输入处理。后续测试不使用内联 JavaScript，直接由官方桥接调用真实入口。

Return *[挂载后开始](browser.merge(a=browser.clear_interval(id="fixture"), b=browser.after(ms=10, then="on_key")))*.

## fixture_next

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 两任务及展开状态的实际终态 |

只有真实 on_response 保存 idle、清空问题且保留展开身份后才继续。切换由正式 on_state 清空旧卡片状态；第二轮结束时 DOM 仍应保持展开。


This callback observes values saved by earlier direct event entries. It does not fix a failed phase transition, create a missing card or force an expected task identity. The first completed response must have preserved its expanded token, the state response must clear it for a new session, and the second task must independently recreate it. Any unexpected state writes a failure marker instead of silently scheduling another attempt. The final browser runner also reads the actual DOM so a token alone cannot hide a collapsed region.

1. `phase` != "idle" or `question` != ""
  Return *[状态未收束](browser.set_text(sel="#probe", text="task-ui-failed:phase"))*.
1. `session_id` == "default" and `trace_open` == "|1|"
  Return *[直接切换正式入口](browser.after(ms=10, then="on_session"))*.
1. `session_id` == "fixture-b" and `gen` == 0 and `trace_seen` == 0 and `trace_open` == ""
  Return *[切换后再发一轮](browser.after(ms=10, then="on_key"))*.
1. `session_id` == "fixture-b" and `gen` == 1 and `trace_open` == "|1|" and `trace_seen` == 1
  Return *[实际状态成立](browser.set_text(sel="#probe", text="task-ui-pass:two-sessions-expanded"))*.
Return *[保留意外状态](browser.set_text(sel="#probe", text="task-ui-failed:" + `session_id` + ":" + str(`gen`) + ":" + `trace_open`))*.


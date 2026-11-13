
## fixture_start

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 等待挂载结束后调用真实 Enter 入口 |

初始 interval 只触发一次；直接 after 会被 autoMount 等待，其就绪文案会覆盖测试结果。
因此先让官方桥接完成挂载，再由独立定时器进入真实客户端处理函数。

Return *[挂载后开始](browser.merge(a=browser.clear_interval(id="fixture"), b=browser.merge(a=browser.after(ms=1, then="on_key"), b=browser.interval(ms=500, then="fixture_monitor", id="monitor"))))*.

## fixture_next

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 检查三轮持久状态，包括一次取消 |

每次结束都必须看到 phase 与 question 在事件入口正确保存。前两轮由正常回答结束，
第三轮明确走 stop 和 on_response 的取消分支。此测试证明客户端状态和官方桥接配合，
其 data 响应是测试夹具，不可当作真实 HTTP 或模型的端到端验收。

1. `phase` != "idle" or `question` != ""
  Return *[状态未收束](browser.set_text(sel="#chat-status", text="state-failed"))*.
1. `gen` < 3
  Return *[再从真实 Enter 入口开始](browser.after(ms=50, then="on_key"))*.
1. `gen` == 3 and `stopped`
  Return *[再从真实入口选择模型](browser.after(ms=10, then="pick_qwen"))*.
Return *[保留意外状态](browser.set_text(sel="#chat-status", text="unexpected-gen:" + str(`gen`)))*.

## fixture_monitor

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 观察真实会话状态，模型选择后写结束标记 |

等待正式 pick_qwen 在直接入口保存模型，才标记结束。此处不替它修改 model，
模型按钮的类也由正式 _model_chrome 处理，run 随后检查实际 DOM 中的三个外观条件。
成功后清除观察定时器，不在空闲阶段继续制造额外回调。

1. `gen` == 3 and `stopped` and `phase` == "idle" and `model` == "qwen3.5:4b-q4_K_M"
  Return *[状态与模型选择均成立](browser.merge(a=browser.set_text(sel="#chat-status", text="state-pass:3-cancel"), b=browser.clear_interval(id="monitor")))*.
Return *[观察真实状态](browser.set_text(sel="#probe", text=str(`gen`) + ":" + `phase` + ":" + str(`stopped`)))*.

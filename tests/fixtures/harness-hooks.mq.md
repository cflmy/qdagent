## fixture_harness_done

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安排真实检查区操作 |

这里只安排下一个直接事件入口，不替产品预设状态。预览、过程和关闭分别由正式的客户端处理器完成，随后才独立检查 DOM。

This hook only schedules direct production entrypoints. It does not set the visibility boolean or modify the preview node to create an expected outcome. Each mode deliberately reaches a different observable terminal state before the runner inspects the DOM.

We **fixture_mode = "@MODE@"**.
1. `fixture_mode` == "activity"
  Return *browser.after(ms=20,then="show_activity")*.
1. `fixture_mode` == "closed"
  Return *browser.after(ms=20,then="toggle_inspector")*.
Return *browser.after(ms=20,then="fixture_harness_end")*.

## fixture_harness_end

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 状态成立才产生终态标记 |

直接事件需要持久化检查区状态与预览请求序号。仅有 DOM 看似打开并不够；这个检查拒绝嵌套调用导致的局部状态丢失。返回标记仍需运行器配合真实 DOM 校验。

A successful marker requires a real accepted preview request and the expected persisted visibility. The separate runner also inspects the rendered document and expanded trace, so a state-only fixture cannot pass with an empty or replaced interface. No model or user data is involved.

We **fixture_mode = "@MODE@"**.
1. `preview_gen` < 1 or (`fixture_mode` == "closed" and `inspector_open`) or (`fixture_mode` != "closed" and not `inspector_open`)
  Return *browser.set_text(sel="#probe",text="harness-ui-fail:state")*.
Return *browser.set_text(sel="#probe",text="harness-ui-pass")*.

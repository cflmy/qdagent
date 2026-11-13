
只观察正式回调保存的值，不替产品补写正确状态。

## fixture_upload_done

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 检查已完成上传后安排模型配置事件 |

正式 on_uploaded 已经确认最后一块并处理 finish 才进入此处。必须闲置且确认字节数为五，之后由官方定时器直接调用正式 save_model。这个观察器不修改上传游标、阶段或成功标记。

1. `upload_busy` or `upload_offset` != 5 or `upload_phase` != ""
  Return *[状态没有正确收束](browser.set_text(sel="#probe", text="input-ui-failed:upload"))*.
Return *[正式入口保存配置](browser.after(ms=20, then="save_model"))*.

## fixture_model_done

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 只有实际配置回调成功后写通过标记 |

直接回调必须保存自定义模型身份，结束配置忙状态并保留之前展开的执行记录。这里不修改任何产品状态，也不在初始宿主预置通过文本。最终 DOM 还需确认模型选项高亮和面板关闭。

An effect record that once requested a highlight is insufficient. The browser runner separately checks the final button class after the official bridge has applied its fixed ordering.

1. `model` != "custom-fixture" or `model_saving` or `upload_busy` or `trace_open` != "|1|"
  Return *[保存状态或展开丢失](browser.set_text(sel="#probe", text="input-ui-failed:model"))*.
Return *[实际状态成立才通过](browser.set_text(sel="#probe", text="input-ui-pass:chunks-model-detail"))*.

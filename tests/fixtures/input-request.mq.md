---
markup: occlusion
title: 输入控件的确定性协议响应
import:
  browser: lib/browser.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  net: lib/net.mq.md
  bytes: lib/bytes.mq.md
  re: lib/re.mq.md
---

只替换隔离测试的网络边界；并未写入真实文件、创建真实模型或调用供应商。产品回调和状态机来自每次读取的正式客户端。

## _upload_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| payload | map | required | 真实客户端构造的请求 |
| epoch | number | required | 真实请求身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 符合分块协议的确定性 fetch 响应 |

Use `payload` and `epoch`。分块大小从实际请求中的 Base64 解码取得，不能由测试替产品保存游标。开始、追加和完成使用同一不透明身份，输出仍经过官方 fetch_all 和正式 on_uploaded 回调。这个夹具不能用来证明后端文件正确，真实五十 MiB 文件由 upload-size 验收。

The response is deliberately transported through a data URL so the official bridge still performs fetch and invokes the production callback. Its URL retains qd_epoch as the final suffix, matching the ordinary stale-response filter. A chunk request contributes exactly the decoded number of bytes to its own submitted offset. The fixture never writes the client's global cursor and cannot repair a missing direct-entry assignment. It has no filesystem or provider side effect.

We **action = access(`payload`,"action")**.
We **offset = 0**.
1. `action` == "chunk"
  We **data = bytes.from_base64(text=re.replace(text=access(`payload`,"data_url"), pattern="^data:[^,]*;base64,", with=""))**.
  We **offset = access(`payload`,"offset") + bytes.len(data=`data`)**.
1. `action` == "finish"
  We **offset = 5**.

`value` =

| upload_id | offset | total | path |
|---|---|---|---|
| "fixture-upload" | `offset` | 5 | "uploads/fixture.txt" |

We **out = table.put(in=None, at="ok", value=True)**.
We **out = table.put(in=`out`, at="value", value=`value`)**.
We **target = "data:application/json," + net.url_encode(text=json.stringify(value=`out`)) + "#qd_epoch=" + str(`epoch`)**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `target` | "GET" |

Return *[实际 fetch 后进入产品回调](browser.fetch_all(requests=`requests`, then="on_uploaded"))*.

## _model_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| payload | map | required | 实际设置字段 |
| epoch | number | required | 实际切换身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 仅为浏览器状态测试提供保存响应 |

Use `payload` and `epoch`。测试响应只含公开模型列表与不透明身份，不含提交凭据。保存器、加密和跨用户隔离另有真实 SQLite/ABI 验收。这里保留官方 fetch 与 on_models，用于验证直接回调是否保存模型选择并恢复按钮和浮层。

The fixture checks that the actual form payload contains the expected model identifier before acknowledging it. This prevents a test from passing while a renamed field or selector silently submits an empty record. Public choice markup comes from the production panel renderer. The fake id exists only in the isolated browser and cannot authenticate a real provider request.

1. json.get(value=`payload`, key="model") != "fixture"
  Return *[真实表单没有传入字段](browser.set_text(sel="#probe", text="input-ui-failed:form-fields"))*.
We **out = table.put(in=None, at="ok", value=True)**.
We **out = table.put(in=`out`, at="model_id", value="custom-fixture")**.
We **out = table.put(in=`out`, at="models_html", value="@MODELS@")**.
We **target = "data:application/json," + net.url_encode(text=json.stringify(value=`out`)) + "#qd_epoch=" + str(`epoch`)**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `target` | "GET" |

Return *[仍由实际回调采用选择](browser.fetch_all(requests=`requests`, then="on_models"))*.

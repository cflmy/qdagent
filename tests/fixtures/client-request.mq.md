## _request

| 参数 | 类型 | 说明 |
|---|---|---|
| address | text | 原 API 地址 |
| generation | number | 原请求代数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 仅隔离测试替换 HTTP 传输为 data 响应 |

Use `address` and `generation`。业务状态处理仍使用原 on_response。

We **is_stop = [取消响应](text.contains(text=`address`, sub="/stop?"))**.
We **complete = [前两轮完成，第三轮等待取消](text.contains(text=`address`, sub="/pull?") and `generation` < 3 or `is_stop`)**.

`payload` =

| ok | gen | done | page_html | ans_sel |
|---|---|---|---|---|
| True | `generation` | `complete` | "<article id='qd-answer-document'>fixture</article>" | "#qd-answer-document" |

We **encoded = [按 URL 编码响应](net.url_encode(text=json.stringify(value=`payload`)))**.
We **target = "data:application/json," + `encoded` + "#route=" + `address` + "&qd_generation=" + str(`generation`)**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `target` | GET |

Return *[仍调用官方 fetch_all](browser.fetch_all(requests=`requests`, then="on_response"))*.


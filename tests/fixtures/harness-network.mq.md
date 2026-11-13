## _inspect_request

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| session | text | required | 当前会话 |
| epoch | number | required | 当前视图 |
| request_id | number | required | 当前文件请求 |
| action | text | required | 实际阅读动作 |
| callback | text | required | 正式回调 |
| path | text | "" | 相对路径 |
| artifact | text | "" | 产物身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 明确的确定性传输 |

Use `session`, `epoch`, `request_id`, `action`, `callback`, `path`="" and `artifact`=""。只替换传输，不改客户端的状态赋值、身份检查与渲染逻辑。原生 View 片段由实际生产函数提前读取，数据 URL 只是测试网络观察，不是另一个应用实现。
Each observation includes the current request identity in its original URL as well as its response body. The unchanged callback must inspect both boundaries before showing content. A completed transport alone does not establish that this is still the selected document.

We **payload = json.parse(text="@PAYLOAD@")**.
We **payload = table.put(in=`payload`,at="fixture_action",value=`action`)**.
We **payload = table.put(in=`payload`,at="session",value=`session`)**.
We **payload = table.put(in=`payload`,at="epoch",value=str(`epoch`))**.
We **payload = table.put(in=`payload`,at="request_id",value=str(`request_id`))**.
We **target = "data:application/json," + net.url_encode(text=json.stringify(value=`payload`)) + "#request_id=" + str(`request_id`) + "&qd_epoch=" + str(`epoch`)**.

`requests` =

| @ | url | method |
|---|---|---|
| 1 | `target` | "GET" |

Return *[正式回调处理观察](browser.fetch_all(requests=`requests`,then=`callback`))*.

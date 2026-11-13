## fixture_http_start

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 挂载后只触发一次正式 Enter 入口 |

此检查器只装入隔离站点，不替换 HTTP、回答或界面回调。直接触发官方 timer 调用 on_key，
让事件入口保留自身状态；禁止在辅助函数内调用 on_key 后宣称完成了真实入口验收。
问题与按键来自隔离副本的明确默认值，正式客户端仍保持空默认输入。

Return *[只触发一次真实 Enter](browser.merge(a=browser.clear_interval(id="http-acceptance"), b=browser.after(ms=1, then="on_key")))*.

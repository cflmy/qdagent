---
markup: occlusion
title: 对话 HTTP 参数边界
import:
  text: lib/text.mq.md
  re: lib/re.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

官方 Web 路由把查询参数作为文本交给端点，直接 CLI 调用则可以传数字。边界必须接收两种
表示，再转换成统一数字身份；不能把 HTTP 字符串直接交给 number 契约，也不能让内部作业
和客户端响应混用数字与文本。本文件只处理这一真实接口差异，不修改官方路由或解释器。

## generation

| 参数 | 类型 | 说明 |
|---|---|---|
| value | any | HTTP 文本或 CLI 数字形式的非负整数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，成功 value 为统一数字，失败保留 invalid_generation |

Use `value`。先取得去空白的文本表示，再验证十进制非负整数形式，最后通过原生 JSON
解析转换为数字。零保留旧调用兼容含义；正整数用于明确回合身份。禁止小数、负数、指数、
布尔值和任意文字，避免不同表示在请求比较时得到意外相等或隐式转换。

| 输入形态 | 处理结果 | 理由 |
|---|---|---|
| 数字 81 或文本 81 | 都规范为数字 81 | CLI 与 HTTP 使用相同作业身份 |
| 文本两侧有空白 | 去空白后按相同规则检查 | 不让传输空白改变正常身份 |
| 零 | 规范为数字零 | 仅保留既有兼容调用，不作为新客户端常规身份 |
| 小数、负数或指数形式 | 返回失败 | 回合代数必须具有明确的整数表示 |
| 超过 JavaScript 安全整数上界 | 返回失败 | 浏览器不能可靠地区分更大的相邻整数 |

解析失败不是默认零，不能把错误请求变成一个绕过身份核对的兼容调用。此函数返回 Result，
端点必须先检查 ok，再覆盖自己的输入值并读取 job.json。响应中的 gen 也使用规范后的数字，
让浏览器严格比较代数时不会因为字符串类型而误判过期。

We **raw = [统一取得文本表示](text.str_trim(s=str(`value`)))**.
1. not [只允许规范非负十进制整数](re.is_match(text=`raw`, pattern="^(0|[1-9][0-9]*)$"))
  Return *[拒绝非法代数](result.error(code="qdagent.invalid_generation", message="回合代数必须是非负十进制整数", operation="generation"))*.
We **parsed = [由原生 JSON 转换为数字](json.try_parse(text=`raw`))**.
1. not access(`parsed`, "ok")
  Return *[拒绝不可解析代数](result.error(code="qdagent.invalid_generation", message="回合代数不能解析", operation="generation"))*.
We **number = [读取规范数字](access(`parsed`, "value"))**.
1. `number` > 9007199254740991
  Return *[拒绝浏览器无法准确表示的身份](result.error(code="qdagent.invalid_generation", message="回合代数超过浏览器安全整数范围", operation="generation"))*.
Return *[返回统一数字身份](result.ok(value=`number`))*.

---
markup: occlusion
title: 真实资料研究
description: 按需获取公开来源候选并核对实际页面的只读研究能力
agent_effects: external
import:
  io: ../../agent/io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

研究可选搜索、真实网页观察与引文核查。候选搜索摘要不是已浏览的证据。该 SKILL 只返回实际来源与未解问题，不能凭模型生成网址、引用和访问时间。对于网络访问失败，保留明确不确定性。请求只读公开页面，也遵循用户对外联效果的授权。

## search
    + `query`

| 参数 | 类型 | 说明 |
|---|---|---|
| query | text | 精确查询 |

Use `query`。

Return *io.native(operation="runtime_search",payload=table.put(in=None,at="query",value=`query`))*.

## open
    + `url`

| 参数 | 类型 | 说明 |
|---|---|---|
| url | text | 真实公开 HTTP(S) 来源 |

Use `url`。

Return *io.native(operation="runtime_browser_open",payload=table.put(in=None,at="url",value=`url`))*.

## run

| 参数 | 类型 | 说明 |
|---|---|---|



We **raw_input = io.input()**.
1. not access(`raw_input`,"ok")
  Return *`raw_input`*.
We **goal = access(`raw_input`,"value")**.
We **found = search(query=`goal`)**.
1. not access(`found`,"ok")
  Return *`found`*.
`evidence` =

| status | question | search_candidates |
|---|---|---|
| "needs_source_read" | `goal` | access(`found`,"value") |

Return *[返回确实检索到的候选，等待逐个打开和核实](result.ok(value=`evidence`))*.

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
    + `context`
    + `query`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信身份 |
| query | text | 精确查询 |

Use `context`, `query`。

We **actor = table.put(in=`context`,at="role",value="research")**.
Return *io.native(context=`actor`,operation="runtime_search",payload=table.put(in=None,at="query",value=`query`))*.

## open
    + `context`
    + `url`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信身份 |
| url | text | 真实公开 HTTP(S) 来源 |

Use `context`, `url`。

We **actor = table.put(in=`context`,at="role",value="research")**.
Return *io.native(context=`actor`,operation="runtime_browser_open",payload=table.put(in=None,at="url",value=`url`))*.

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信研究范围 |
| goal | text | 用户的真实研究问题 |

Use `context`, `goal`。

We **found = search(context=`context`,query=`goal`)**.
1. not access(`found`,"ok")
  Return *`found`*.
`evidence` =

| status | question | search_candidates |
|---|---|---|
| "needs_source_read" | `goal` | access(`found`,"value") |

Return *[返回确实检索到的候选，等待逐个打开和核实](result.ok(value=`evidence`))*.

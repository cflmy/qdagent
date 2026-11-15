---
markup: occlusion
title: 搜索观察的可信保存
import:
  io: ext/root-skill/runtime/io.mq.md
  observations: ext/root-skill/runtime/observations.mq.md
  fs: lib/fs.mq.md
  hash: lib/hash.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  time: lib/time.mq.md
---

搜索服务只有固定内网地址，不允许模型选择服务主机。

## capture

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信角色与任务根 |
| query | text | required | 有界搜索问题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 查询、候选地址、摘要与引擎故障 |

Use `context`, `query`。

Search discovers candidate addresses. It does not claim to have read those pages. The transport contacts only the internal SearXNG container, with a bounded query, response size and deadline. Upstream engines can block a datacenter or return no matches, and their failures remain visible rather than becoming a synthetic answer. The query and normalized results are saved before a successful end event is emitted. This is a local observation at one moment; it is not an independent citation or an approval. No browser source record is created here. A later ordinary browse function must read the destination through the existing public-network sandbox. The model receives titles, excerpts and links as untrusted data, never as a new system instruction. Credentials, identity cookies and model configuration do not enter the search service. The service is internal to Docker and does not require another public port. The author can recover after a restart because the current role's saved observations are rebuilt into its next context. Independent testers never receive this material, and another work unit does not obtain it merely by guessing a path. Full search records remain available to the task owner for inspection; bounded recent observations avoid unlimited context growth.

查询与真实结果一并保存，外部标题不会成为文件名。状态 pending、空结果与上游错误都不能成为一个已完成研究。每个候选网页仍需浏览与核对。这里不修改独立案例、不增加已阅读来源，也不推进任何用户确认阶段。

We **event = table.put(in=table.put(in=None,at="id",value=access(`context`,"unit_id")),at="query",value=`query`)**.
We **_ = io.event(context=`context`,kind="search_start",data=`event`)**.
We **response = io.native(context=`context`,operation="runtime_search",payload=table.put(in=None,at="query",value=`query`))**.
1. not access(`response`,"ok")
  We **_ = io.event(context=`context`,kind="search_end",data=table.put(in=table.put(in=`event`,at="status",value="failed"),at="result",value=`response`))**.
  Return *response*.
We **value = access(`response`,"value")**.
We **identity = hash.sha256(text=`query`)**.
We **path = "evidence/search/" + `identity` + ".json"**.
We **_ = fs.make_dirs(path="evidence/search")**.
We **_ = fs.atomic_write(path=`path`,text=json.stringify(value=`value`))**.
We **value = table.put(in=table.put(in=`value`,at="identity",value=`identity`),at="path",value=`path`)**.
We **value = observations.save(context=`context`,record=`value`)**.
We **_ = io.event(context=`context`,kind="search_end",data=table.put(in=table.put(in=`value`,at="id",value=access(`context`,"unit_id")),at="status",value="succeeded"))**.
Return *response*.

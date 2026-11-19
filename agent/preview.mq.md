---
markup: occlusion
title: 安全 Marqdo 文稿阅读
description: 仅在授权文件根内预览真实文稿，不执行程序。
import:
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
  plugin: lib/plugin.mq.md
---

# preview

## show
    + `path`

| 参数 | 类型 | 说明 |
|---|---|---|
| path | text | 已获授权工作区相对 Marqdo 文稿路径 |

Use `path`。

1. not fs.exists(path=`path`)
  Return *table.put(in=None,at="kind",value="missing")*.
We **source = fs.read_text(path=`path`)**.
We **lib = sys.env_get(name="MARQDO_EXT") + "/native/libqdagent_transport.so"**.
We **_ = plugin.load(path=`lib`)**.
We **request = table.put(in=None,at="operation",value="document_view")**.
We **request = table.put(in=`request`,at="workspace",value=sys.cwd())**.
We **request = table.put(in=`request`,at="path",value=`path`)**.
We **rendered = qdagent_transport(request=`request`)**.
1. not access(`rendered`,"ok")
  `fallback` =
  
  | kind | filename | source | title | executed |
  |---|---|---|---|---|
  | "markdown" | `path` | `source` | `path` | False |
  
  Return *`fallback`*.
We **value = access(`rendered`,"value")**.
`out` =

| kind | filename | title | source | html | executed |
|---|---|---|---|---|---|
| "marqdo-view" | `path` | `path` | `source` | access(access(`value`,"render"),"fragment") | False |

Return *`out`*.

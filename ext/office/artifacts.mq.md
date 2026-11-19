---
markup: occlusion
title: Office 真实制品与可重建清单
description: 只基于工作区真实文件登记来源与摘要，不承担任何 Web 视图。
import:
  manifest: manifest.mq.md
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

# artifacts

清单只存真实文件身份、可编辑源稿与哈希，绝不以路径字符串自证文件存在。
并发写入由原生清单锁串行化，文件下载仍由已鉴权的 Go 服务按登记身份重新校验。

## list

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 当前工作区登记的所有实际产物 |

1. fs.exists(path=".agent/artifacts.json")
  Return *fs.read_json(path=".agent/artifacts.json")*.
Return *table.empty_list()*.

## register
    + `id`
    + `title`
    + `kind`
    + `path`
    + `source`

| 参数 | 类型 | 说明 |
|---|---|---|
| id | text | 不透明制品身份 |
| title | text | 人类可读标题 |
| kind | text | docx、pptx、pdf 或 md |
| path | text | 当前工作区内已生成的真实文件 |
| source | text | 可编辑源稿文件 |

Use `id`, `title`, `kind`, `path`, `source`。

We **digest = fs.file_hash(path=`path`)**.
We **size = access(fs.stat(path=`path`),"size")**.
We **_ = fs.stat(path=`source`)**.
`entry` =

| id | title | kind | path | source | sha256 | bytes | verification |
|---|---|---|---|---|---|---|---|
| `id` | `title` | `kind` | `path` | `source` | `digest` | `size` | "producer_checked_and_digest" |

We **saved = manifest.save(entry=`entry`)**.
1. not access(`saved`,"ok")
  Return *`saved`*.
Return *`entry`*.

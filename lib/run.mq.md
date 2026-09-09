---
title: lib/run
description: 求道运行沉淀 — 把一次捕捉写成 data/runs/*.mq.md，并可同步到笔记库。
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import sys:lib/sys.mq.md
import web:ext/web/web.mq.md
---

## 数据根

*root = > sys.env_get name="QDAGENT_DATA"*
1. `root`
  **root**
2. *
  **"data"**

## 确保目录

*root = > 数据根*
> fs.make_dir path=`root`
> fs.make_dir path=`root` + "/runs"
> fs.make_dir path=`root` + "/kb"
> fs.make_dir path=`root` + "/skills"
> fs.make_dir path=`root` + "/sessions"
**root**

## 新标识

*u = > time.now_unix*
*s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"*
**"run-" + `s`**

## 装配正文
    + `title`
    + `task`
    + `result`
    + `slug`
    + `surface`=""
    + `session_id`=""

把一次执行写成可被 `marqdo view` 浏览的 `.mq.md` 文本。

*fm = "---\ntitle: " + `title` + "\ndescription: qdagent run " + `slug`*
1. `surface`
  *fm = `fm` + "\nsurface: " + `surface`*
1. `session_id`
  *fm = `fm` + "\nsession_id: " + `session_id`*
*fm = `fm` + "\n---\n\n# 任务\n\n" + `task` + "\n\n# 结果\n\n" + `result` + "\n"*
**fm**

## 写出
    + `title`
    + `task`
    + `result`=""
    + `slug`=""
    + `surface`=""
    + `session_id`=""

落盘 `data/runs/<slug>.mq.md`，返回相对路径。

*root = > 确保目录*
1. `slug` == ""
  *slug = > 新标识*
*`body` = > 装配正文 title=`title` task=`task` result=`result` slug=`slug` surface=`surface` session_id=`session_id`*
*path = `root` + "/runs/" + `slug` + ".mq.md"*
> fs.write_text path=`path` text=`body`
**path**

## 库行
    + `slug`
    + `title`
    + `summary`
    + `body`

组装插入 `runs` 表的一行（GFM 表）。

`row` =

| slug | title | summary | body |
|------|-------|---------|------|
| `slug` | `title` | `summary` | `body` |

**`row`**

## 沉淀
    + `store`
    + `title`
    + `task`
    + `result`=""
    + `slug`=""
    + `surface`=""
    + `session_id`=""
    + `summary`=""

写盘 + 写入笔记库索引；返回路径。列表摘要优先用短 `summary`，避免把长正文塞进卡片。

1. `slug` == ""
  *slug = > 新标识*
*`path` = > 写出 title=`title` task=`task` result=`result` slug=`slug` surface=`surface` session_id=`session_id`*
*`body` = > fs.read_text path=`path`*
*sum = `summary`*
1. not `sum`
  *sum = `task`*
1. not `sum`
  *sum = `result`*
*parts = > split value=`sum` sep="\n"*
*sum1 = parts[^1]*
1. not `sum1`
  *sum1 = `sum`*
*n = > len value=`sum1`*
1. `n` > 140
  *sum1 = `sum1` + "…"*
*`row` = > 库行 slug=`slug` title=`title` summary=`sum1` body=`body`*
> `store`.insert table=runs rows=`row`
**`path`**

## 同步库
    + `store`

把库里每条 run 的 `body` 写回 `data/runs/<slug>.mq.md`（Web 表单写入后可再跑一次）。

*root = > 确保目录*
*rows = > store.select table="runs" limit=500 order="-created_at"*
- [r](rows)
  *slug = r[^slug]*
  *body = r[^body]*
  1. `slug`
    1. `body`
      > fs.write_text path=`root` + "/runs/" + `slug` + ".mq.md" text=`body`
**root**

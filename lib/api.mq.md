---
title: lib/api
description: HTTP invoke 入口 — 沉淀 / 同步 / 列表 / 搜索 / 画像 / 整理（供 app.invoke 与 MCP 共用）。
import run:lib/run.mq.md
import db:../db/index.mq.md
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import agent:ext/ai/agent.mq.md
import profile:lib/profile.mq.md
import time:lib/time.mq.md
import fmt:lib/kb_format.mq.md
---

## health

*root = > run.确保目录*
*out = > json.parse text={"ok":true,"role":"marqdo-host","marqdo":"0.3.7"}*
*out = > json.set map=`out` key="data_root" value=`root`*
**out**

## capture
    + `title`="对话沉淀"
    + `task`=""
    + `result`=""
    + `summary`=""
    + `slug`=""
    + `surface`="web"
    + `session_id`=""
    + `payload`=None

1. `payload`
  *pt = > json.get value=`payload` key="title"*
  1. `pt`
    *title = `pt`*
  *pk = > json.get value=`payload` key="task"*
  1. `pk`
    *task = `pk`*
  *pr = > json.get value=`payload` key="result"*
  1. `pr`
    *result = `pr`*
  *psu = > json.get value=`payload` key="summary"*
  1. `psu`
    *summary = `psu`*
  *ps = > json.get value=`payload` key="slug"*
  1. `ps`
    *slug = `ps`*
  *pf = > json.get value=`payload` key="surface"*
  1. `pf`
    *surface = `pf`*
  *sid = > json.get value=`payload` key="session_id"*
  1. `sid`
    *session_id = `sid`*

1. `slug` == ""
  *slug = > run.新标识*

*store = > db.open*
*path = > run.沉淀 store=`store` title=`title` task=`task` result=`result` summary=`summary` slug=`slug` surface=`surface` session_id=`session_id`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="slug" value=`slug`*
*out = > json.set map=`out` key="path" value=`path`*
**out**

## sync

*store = > db.open*
*root = > run.同步库 store=`store`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="root" value=`root`*
**out**

## list
    + `limit`=20
    + `payload`=None

1. `payload`
  *pl = > json.get value=`payload` key="limit"*
  1. `pl`
    *limit = `pl`*

*rows = > db.recent limit=`limit`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="runs" value=`rows`*
**out**

## search
    + `query`=""
    + `top_k`=5
    + `payload`=None

1. `payload`
  *pq = > json.get value=`payload` key="query"*
  1. `pq`
    *query = `pq`*
  *pk = > json.get value=`payload` key="top_k"*
  1. `pk`
    *top_k = `pk`*

1. `query` == ""
  *empty = > json.parse text={"ok":true,"mode":"corpus","hits":[]}*
  **empty**

*root = > run.确保目录*
*corpus = `root` + "/runs"*
*raw = > agent.corpus_search query=`query` root=`corpus` limit=`top_k`*
*hits = raw[^hits]*
*out = > json.parse text={"ok":true,"mode":"corpus","hint":"evidence only"}*
*out = > json.set map=`out` key="hits" value=`hits`*
*out = > json.set map=`out` key="top_k" value=`top_k`*
*out = > json.set map=`out` key="query" value=`query`*
**out**

## get_run
    + `slug`=""
    + `payload`=None

1. `payload`
  *ps = > json.get value=`payload` key="slug"*
  1. `ps`
    *slug = `ps`*

*root = > run.确保目录*
*path = `root` + "/runs/" + `slug` + ".mq.md"*
*exists = > fs.exists path=`path`*
1. not `exists`
  *err = > json.parse text={"ok":false,"error":"run not found"}*
  **err**
*body = > fs.read_text path=`path`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="slug" value=`slug`*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="body" value=`body`*
**out**

## profile_get
    + `payload`=None

*path = > profile.确保*
*body = > profile.读取*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="body" value=`body`*
**out**

## context
    + `query`=""
    + `top_k`=5
    + `payload`=None

1. `payload`
  *pq = > json.get value=`payload` key="query"*
  1. `pq`
    *query = `pq`*
  *pk = > json.get value=`payload` key="top_k"*
  1. `pk`
    *top_k = `pk`*

*ppath = > profile.确保*
*profile_body = > profile.读取*
*hits = > json.parse text=[]*
1. `query`
  *root = > run.确保目录*
  *corpus = `root` + "/runs"*
  *raw = > agent.corpus_search query=`query` root=`corpus` limit=`top_k`*
  *hits = raw[^hits]*

*out = > json.parse text={"ok":true,"hint":"evidence only"}*
*out = > json.set map=`out` key="profile_path" value=`ppath`*
*out = > json.set map=`out` key="profile" value=`profile_body`*
*out = > json.set map=`out` key="hits" value=`hits`*
*out = > json.set map=`out` key="query" value=`query`*
*out = > json.set map=`out` key="top_k" value=`top_k`*
**out**

## profile_update
    + `task`=""
    + `result`=""
    + `payload`=None

1. `payload`
  *pt = > json.get value=`payload` key="task"*
  1. `pt`
    *task = `pt`*
  *pr = > json.get value=`payload` key="result"*
  1. `pr`
    *result = `pr`*

*path = > profile.轻量追加 task=`task` result=`result`*
*body = > fs.read_text path=`path`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="body" value=`body`*
**out**

## organize
    + `query`=""
    + `limit`=12
    + `payload`=None

1. `payload`
  *pq = > json.get value=`payload` key="query"*
  1. `pq`
    *query = `pq`*
  *pl = > json.get value=`payload` key="limit"*
  1. `pl`
    *limit = `pl`*

1. not `query`
  *query = "求道"*

*root = > run.确保目录*
*corpus = `root` + "/runs"*
*raw = > agent.corpus_search query=`query` root=`corpus` limit=`limit`*
*hits = raw[^hits]*
*rows = > db.recent limit=`limit`*
*u = > time.now_unix*
*day = > time.format unix=`u` pattern="%Y-%m-%d"*
*stamp = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"*
*slug = "organize-" + `stamp`*
*kb_path = `root` + "/kb/整理-" + `stamp` + ".mq.md"*
*plan = > fmt.整理文稿 query=`query` day=`day` hits=`hits` rows=`rows`*
> fs.write_text path=`kb_path` text=`plan`
*brief = "整理完成：主题「" + `query` + "」。可读索引已写入 kb/整理-" + `stamp` + ".mq.md（表格摘要，无 JSON dump）。历史 runs 未改写。"*
*store = > db.open*
*run_path = > run.沉淀 store=`store` title="笔记整理 · " + `query` task=`query` result=`brief` summary=`brief` slug=`slug` surface="organize"*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="kb_path" value=`kb_path`*
*out = > json.set map=`out` key="slug" value=`slug`*
*out = > json.set map=`out` key="path" value=`run_path`*
*out = > json.set map=`out` key="summary" value=`brief`*
*out = > json.set map=`out` key="hits" value=`hits`*
**out**

## profile_reset
    + `payload`=None

*path = > profile.重建*
*body = > fs.read_text path=`path`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="body" value=`body`*
**out**

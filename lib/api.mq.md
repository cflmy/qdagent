---
title: lib/api
description: HTTP invoke 入口 — 沉淀 / 同步 / 列表 / 搜索（供 app.invoke 与 MCP 共用）。
import run:lib/run.mq.md
import db:../db/index.mq.md
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import agent:ext/ai/agent.mq.md
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
*path = > run.沉淀 store=`store` title=`title` task=`task` result=`result` slug=`slug` surface=`surface` session_id=`session_id`*
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

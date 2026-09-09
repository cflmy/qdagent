---
title: lib/api
description: HTTP invoke 入口 — 沉淀 / 同步 / 列表 / 搜索 / 画像 / 整理 / 变更提案（供 app.invoke 与 MCP 共用）。
import run:lib/run.mq.md
import db:../db/index.mq.md
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import agent:ext/ai/agent.mq.md
import profile:lib/profile.mq.md
import time:lib/time.mq.md
import fmt:lib/kb_format.mq.md
import websearch:lib/web_search.mq.md
import kbgit:lib/kb_git.mq.md
import changes:lib/changes.mq.md
---

## health

*root = > run.确保目录*
*git = > kbgit.确保*
*out = > json.parse text={"ok":true,"role":"marqdo-host","marqdo":"0.3.7"}*
*out = > json.set map=`out` key="data_root" value=`root`*
*out = > json.set map=`out` key="git" value=`git`*
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
*git = > kbgit.提交 message="capture: " + `slug`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="slug" value=`slug`*
*out = > json.set map=`out` key="path" value=`path`*
*out = > json.set map=`out` key="git" value=`git`*
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

偏好/焦点不再静默写盘：生成对「用户画像」的变更提案，待记忆页审查后应用。

1. `payload`
  *pt = > json.get value=`payload` key="task"*
  1. `pt`
    *task = `pt`*
  *pr = > json.get value=`payload` key="result"*
  1. `pr`
    *result = `pr`*

*draft = > profile.试算追加 task=`task` result=`result`*
*body = draft[^body]*
*ppath = draft[^path]*
*root = > run.确保目录*
*payload_path = `root` + "/tmp/propose_payload.json"*
*prop = > json.parse text={"target":"kb/用户画像.mq.md","source":"profile_update"}*
*prop = > json.set map=`prop` key="title" value="画像追加 · " + `task`*
*prop = > json.set map=`prop` key="reason" value="对话偏好/焦点提案（未自动应用）"*
*prop = > json.set map=`prop` key="body" value=`body`*
*raw = > json.stringify value=`prop`*
> fs.write_text path=`payload_path` text=`raw`
*out = > changes.提案 payload_path=`payload_path`*
*out = > json.set map=`out` key="profile_path" value=`ppath`*
*out = > json.set map=`out` key="mode" value="propose"*
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
*brief = "整理完成：主题「" + `query` + "」。可读索引已写入 kb/整理-" + `stamp` + ".mq.md（表格摘要，无 JSON dump）。历史 runs 未改写。清理画像请走变更提案。"*
*store = > db.open*
*run_path = > run.沉淀 store=`store` title="笔记整理 · " + `query` task=`query` result=`brief` summary=`brief` slug=`slug` surface="organize"*
*git = > kbgit.提交 message="organize: " + `query`*
*out = > json.parse text={"ok":true}*
*out = > json.set map=`out` key="kb_path" value=`kb_path`*
*out = > json.set map=`out` key="slug" value=`slug`*
*out = > json.set map=`out` key="path" value=`run_path`*
*out = > json.set map=`out` key="summary" value=`brief`*
*out = > json.set map=`out` key="hits" value=`hits`*
*out = > json.set map=`out` key="git" value=`git`*
**out**

## profile_reset
    + `payload`=None

重置改为变更提案（完整模板正文），不直接覆盖权威画像。

*root = > run.确保目录*
*tpl = > profile.默认正文*
*payload_path = `root` + "/tmp/propose_payload.json"*
*prop = > json.parse text={"target":"kb/用户画像.mq.md","source":"profile_reset","title":"重置用户画像模板"}*
*prop = > json.set map=`prop` key="reason" value="重置为多维度模板（需审查后应用）"*
*prop = > json.set map=`prop` key="body" value=`tpl`*
*raw = > json.stringify value=`prop`*
> fs.write_text path=`payload_path` text=`raw`
*out = > changes.提案 payload_path=`payload_path`*
*out = > json.set map=`out` key="mode" value="propose"*
**out**

## change_propose
    + `payload`=None

*root = > run.确保目录*
*payload_path = `root` + "/tmp/propose_payload.json"*
*raw = > json.stringify value=`payload`*
> fs.write_text path=`payload_path` text=`raw`
*out = > changes.提案 payload_path=`payload_path`*
**out**

## change_list
    + `status`=""
    + `payload`=None

1. `payload`
  *ps = > json.get value=`payload` key="status"*
  1. `ps`
    *status = `ps`*

*out = > changes.列表 status=`status`*
**out**

## change_get
    + `id`=""
    + `payload`=None

1. `payload`
  *pid = > json.get value=`payload` key="id"*
  1. `pid`
    *id = `pid`*

*out = > changes.详情 id=`id`*
**out**

## change_apply
    + `id`=""
    + `payload`=None

1. `payload`
  *pid = > json.get value=`payload` key="id"*
  1. `pid`
    *id = `pid`*

*out = > changes.应用 id=`id`*
**out**

## change_reject
    + `id`=""
    + `payload`=None

1. `payload`
  *pid = > json.get value=`payload` key="id"*
  1. `pid`
    *id = `pid`*

*out = > changes.拒绝 id=`id`*
**out**

## git_log
    + `limit`=20
    + `payload`=None

1. `payload`
  *pl = > json.get value=`payload` key="limit"*
  1. `pl`
    *limit = `pl`*

*lim = "" + `limit`*
*out = > kbgit.日志 limit=`lim`*
**out**

## git_show
    + `rev`="HEAD"
    + `payload`=None

1. `payload`
  *pr = > json.get value=`payload` key="rev"*
  1. `pr`
    *rev = `pr`*

*out = > kbgit.查看 rev=`rev`*
**out**

## git_revert
    + `rev`=""
    + `payload`=None

1. `payload`
  *pr = > json.get value=`payload` key="rev"*
  1. `pr`
    *rev = `pr`*

*out = > kbgit.回滚 rev=`rev`*
**out**

## web_search
    + `query`=""
    + `limit`=5
    + `payload`=None

1. `payload`
  *pq = > json.get value=`payload` key="query"*
  1. `pq`
    *query = `pq`*
  *pl = > json.get value=`payload` key="limit"*
  1. `pl`
    *limit = `pl`*

*out = > websearch.search query=`query` limit=`limit`*
**out**

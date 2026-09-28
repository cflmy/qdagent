---
title: lib/api
description: HTTP invoke 入口 — 沉淀 / 同步 / 列表 / 搜索 / 画像 / 整理 / 变更提案（供 Endpoint / MCP 共用）。
import run:lib/run.mq.md
import db:../db/index.mq.md
import data:ext/data/db.mq.md
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
import agent:ext/ai/agent.mq.md
import profile:lib/profile.mq.md
import time:lib/time.mq.md
import fmt:lib/kb_format.mq.md
import websearch:lib/web_search.mq.md
import kbgit:lib/kb_git.mq.md
import changes:lib/changes.mq.md
import asr:lib/asr.mq.md
import org:lib/organize.mq.md
import eng_pf:../agent/preflight.mq.md
import eng_res:../knowledge/resolver.mq.md
import eng_ver:../execution/verify.mq.md
import eng_qd:../agent/qdagent.mq.md
import eng_met:../knowledge/metrics.mq.md
import eng_promote:../execution/promote.mq.md
---

## 成功
    + `字段`=None

统一成功应答（GFM 表 / merge，不用 json.set 袋胶水）。

**base = > table.put in=None at="ok" value=True**
1. `字段`
  *> table.merge a=`base` b=`字段`*
*`base`*

## 失败
    + `error`="error"

`out` =

| ok | error |
|----|-------|
| False | `error` |

*out*

## health

**root = > run.确保目录**
**git = > kbgit.确保**
`字段` =

| role | marqdo | data_root | git |
|------|--------|-----------|-----|
| marqdo-host | 1.3.0 | `root` | `git` |

*> 成功 字段=`字段`*

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
  **pt = > json.get value=`payload` key="title"**
  1. `pt`
    **title = `pt`**
  **pk = > json.get value=`payload` key="task"**
  1. `pk`
    **task = `pk`**
  **pr = > json.get value=`payload` key="result"**
  1. `pr`
    **result = `pr`**
  **psu = > json.get value=`payload` key="summary"**
  1. `psu`
    **summary = `psu`**
  **ps = > json.get value=`payload` key="slug"**
  1. `ps`
    **slug = `ps`**
  **pf = > json.get value=`payload` key="surface"**
  1. `pf`
    **surface = `pf`**
  **sid = > json.get value=`payload` key="session_id"**
  1. `sid`
    **session_id = `sid`**

1. `slug` == ""
  **slug = > run.新标识**

**store = > db.open**
**path = > run.沉淀 store=`store` title=`title` task=`task` result=`result` summary=`summary` slug=`slug` surface=`surface` session_id=`session_id`**
**git = > kbgit.提交 message="capture: " + `slug`**
`字段` =

| slug | path | git |
|------|------|-----|
| `slug` | `path` | `git` |

*> 成功 字段=`字段`*

## sync

**store = > db.open**
**root = > run.同步库 store=`store`**
**字段 = > table.put in=None at="root" value=`root`**
*> 成功 字段=`字段`*

## list
    + `limit`=20
    + `payload`=None

1. `payload`
  **pl = > json.get value=`payload` key="limit"**
  1. `pl`
    **limit = `pl`**

**rows = > db.recent limit=`limit`**
**字段 = > table.put in=None at="runs" value=`rows`**
*> 成功 字段=`字段`*

## search
    + `query`=""
    + `top_k`=5
    + `payload`=None

1. `payload`
  **pq = > json.get value=`payload` key="query"**
  1. `pq`
    **query = `pq`**
  **pk = > json.get value=`payload` key="top_k"**
  1. `pk`
    **top_k = `pk`**

1. `query` == ""
  **hits = > table.empty_list**
  `empty` =

  | ok | mode | hits |
  |----|------|------|
  | True | corpus | `hits` |

  *empty*

**root = > run.确保目录**
**corpus = `root` + "/runs"**
**raw = > agent.corpus_search query=`query` root=`corpus` limit=`top_k`**
**hits = [hits](raw)**
`字段` =

| mode | hint | hits | top_k | query |
|------|------|------|-------|-------|
| corpus | evidence only | `hits` | `top_k` | `query` |

*> 成功 字段=`字段`*

## get_run
    + `slug`=""
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="slug"**
  1. `ps`
    **slug = `ps`**

**root = > run.确保目录**
**path = `root` + "/runs/" + `slug` + ".mq.md"**
**exists = > fs.exists path=`path`**
1. not `exists`
  *> 失败 error="run not found"*
**body = > fs.read_text path=`path`**
`字段` =

| slug | path | body |
|------|------|------|
| `slug` | `path` | `body` |

*> 成功 字段=`字段`*

## profile_get
    + `payload`=None

**path = > profile.确保**
**body = > profile.读取**
`字段` =

| path | body |
|------|------|
| `path` | `body` |

*> 成功 字段=`字段`*

## context
    + `query`=""
    + `top_k`=5
    + `payload`=None

1. `payload`
  **pq = > json.get value=`payload` key="query"**
  1. `pq`
    **query = `pq`**
  **pk = > json.get value=`payload` key="top_k"**
  1. `pk`
    **top_k = `pk`**

**ppath = > profile.确保**
**profile_body = > profile.读取**
**hits = > table.empty_list**
1. `query`
  **root = > run.确保目录**
  **corpus = `root` + "/runs"**
  **raw = > agent.corpus_search query=`query` root=`corpus` limit=`top_k`**
  **hits = [hits](raw)**

`字段` =

| hint | profile_path | profile | hits | query | top_k |
|------|--------------|---------|------|-------|-------|
| evidence only | `ppath` | `profile_body` | `hits` | `query` | `top_k` |

*> 成功 字段=`字段`*

## profile_update
    + `task`=""
    + `result`=""
    + `payload`=None

偏好/焦点不再静默写盘：生成对「用户画像」的变更提案，待记忆页审查后应用。

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
  **pr = > json.get value=`payload` key="result"**
  1. `pr`
    **result = `pr`**

**draft = > profile.试算追加 task=`task` result=`result`**
**body = [body](draft)**
**ppath = [path](draft)**
**root = > run.确保目录**
**payload_path = `root` + "/tmp/propose_payload.json"**
**prop_title = "画像追加 · " + `task`**
`prop` =

| target | source | title | reason | body |
|--------|--------|-------|--------|------|
| kb/用户画像.mq.md | profile_update | `prop_title` | 对话偏好/焦点提案（未自动应用） | `body` |

**raw = > json.stringify value=`prop`**
> fs.write_text path=`payload_path` text=`raw`
**out = > changes.提案 payload_path=`payload_path`**
**extra = > table.put in=None at="profile_path" value=`ppath`**
**extra = > table.put in=`extra` at="mode" value="propose"**
*> table.merge a=`out` b=`extra`*

## organize
    + `query`=""
    + `limit`=20
    + `mode`="incremental"
    + `payload`=None

1. `payload`
  **pq = > json.get value=`payload` key="query"**
  1. `pq`
    **query = `pq`**
  **pl = > json.get value=`payload` key="limit"**
  1. `pl`
    **limit = `pl`**
  **pm = > json.get value=`payload` key="mode"**
  1. `pm`
    **mode = `pm`**

1. not `query`
  **query = "求道"**
1. not `mode`
  **mode = "incremental"**

**root = > run.确保目录**
**corpus = `root` + "/runs"**
**raw = > agent.corpus_search query=`query` root=`corpus` limit=`limit`**
**hits = [hits](raw)**
**rows = > db.recent limit=`limit`**
**store = > db.open**
**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](cfg_rows)**
**llm_key = [llm_api_key](cfg)**
**llm_base = [llm_base_url](cfg)**
**llm_model = [llm_model](cfg)**
1. not `llm_base`
  **llm_base = "https://api.openai.com/v1"**
1. not `llm_model`
  **llm_model = "gpt-4o-mini"**

`req` =

| run_catalog | mode | query | limit | rows | hits | llm_api_key | llm_base_url | llm_model |
|-------------|------|-------|-------|------|------|-------------|--------------|-----------|
| True | `mode` | `query` | `limit` | `rows` | `hits` | `llm_key` | `llm_base` | `llm_model` |

**prom = > org.整理 payload=`req`**
**prom_ok = [ok](prom)**
**u = > time.now_unix**
**day = > time.format unix=`u` pattern="%Y-%m-%d"**
**stamp = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
**slug = "organize-" + `stamp`**

1. `prom_ok`
  **brief = [summary](prom)**
  1. not `brief`
    **n = [promoted](prom)**
    **brief = "OKF 智能整理完成：晋升 " + `n` + " 条概念笔记（mode=" + `mode` + "）。历史 runs 未改写。"**
  **git = > kbgit.提交 message="organize-okf: " + `query`**
  **run_path = > run.沉淀 store=`store` title="OKF 整理 · " + `query` task=`query` result=`brief` summary=`brief` slug=`slug` surface="organize"**
  `字段` =

  | via | slug | path | summary | promote | git | mode |
  |-----|------|------|---------|---------|-----|------|
  | okf | `slug` | `run_path` | `brief` | `prom` | `git` | `mode` |

  *> 成功 字段=`字段`*

**kb_path = `root` + "/kb/整理-" + `stamp` + ".mq.md"**
**plan = > fmt.整理文稿 query=`query` day=`day` hits=`hits` rows=`rows`**
> fs.write_text path=`kb_path` text=`plan`
**err = [error](prom)**
1. not `err`
  **err = "okf promote failed"**
**brief = "OKF 晋升未完成（" + `err` + "），已回退写出表格索引 kb/整理-" + `stamp` + ".mq.md。历史 runs 未改写。"**
**git = > kbgit.提交 message="organize-fallback: " + `query`**
**run_path = > run.沉淀 store=`store` title="笔记整理 · " + `query` task=`query` result=`brief` summary=`brief` slug=`slug` surface="organize"**
`字段` =

| via | warning | error | kb_path | slug | path | summary | promote | hits | git | mode |
|-----|---------|-------|---------|------|------|---------|---------|------|-----|------|
| index-fallback | `err` | `err` | `kb_path` | `slug` | `run_path` | `brief` | `prom` | `hits` | `git` | `mode` |

*> 成功 字段=`字段`*

## kb_list
    + `payload`=None

**out = > org.列表**
*out*

## kb_get
    + `slug`=""
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="slug"**
  1. `ps`
    **slug = `ps`**
**out = > org.读取 slug=`slug` payload=`payload`**
*out*

## profile_reset
    + `payload`=None

重置改为变更提案（完整模板正文），不直接覆盖权威画像。

**root = > run.确保目录**
**tpl = > profile.默认正文**
**payload_path = `root` + "/tmp/propose_payload.json"**
`prop` =

| target | source | title | reason | body |
|--------|--------|-------|--------|------|
| kb/用户画像.mq.md | profile_reset | 重置用户画像模板 | 重置为多维度模板（需审查后应用） | `tpl` |

**raw = > json.stringify value=`prop`**
> fs.write_text path=`payload_path` text=`raw`
**out = > changes.提案 payload_path=`payload_path`**
**extra = > table.put in=None at="mode" value="propose"**
*> table.merge a=`out` b=`extra`*

## change_propose
    + `payload`=None

**root = > run.确保目录**
**payload_path = `root` + "/tmp/propose_payload.json"**
**raw = > json.stringify value=`payload`**
> fs.write_text path=`payload_path` text=`raw`
**out = > changes.提案 payload_path=`payload_path`**
*out*

## change_list
    + `status`=""
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="status"**
  1. `ps`
    **status = `ps`**

**out = > changes.列表 status=`status`**
*out*

## change_get
    + `id`=""
    + `payload`=None

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**

**out = > changes.详情 id=`id`**
*out*

## change_apply
    + `id`=""
    + `payload`=None

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**

**out = > changes.应用 id=`id`**
*out*

## change_reject
    + `id`=""
    + `payload`=None

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**

**out = > changes.拒绝 id=`id`**
*out*

## git_log
    + `limit`=20
    + `payload`=None

1. `payload`
  **pl = > json.get value=`payload` key="limit"**
  1. `pl`
    **limit = `pl`**

**lim = "" + `limit`**
**out = > kbgit.日志 limit=`lim`**
*out*

## git_show
    + `rev`="HEAD"
    + `payload`=None

1. `payload`
  **pr = > json.get value=`payload` key="rev"**
  1. `pr`
    **rev = `pr`**

**out = > kbgit.查看 rev=`rev`**
*out*

## git_revert
    + `rev`=""
    + `payload`=None

1. `payload`
  **pr = > json.get value=`payload` key="rev"**
  1. `pr`
    **rev = `pr`**

**out = > kbgit.回滚 rev=`rev`**
*out*

## web_search
    + `query`=""
    + `limit`=5
    + `payload`=None

1. `payload`
  **pq = > json.get value=`payload` key="query"**
  1. `pq`
    **query = `pq`**
  **pl = > json.get value=`payload` key="limit"**
  1. `pl`
    **limit = `pl`**

**out = > websearch.search query=`query` limit=`limit`**
*out*

## asr_transcribe
    + `payload`=None

**out = > asr.转写 payload=`payload`**
*out*

## preflight
    + `task`=""
    + `payload`=None

Engineering Preflight (qdagent 2.0). Delegates to agent/preflight.

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
1. not `task`
  *> 失败 error="task_required"*
**out = > eng_pf.run task=`task`**
*out*

## eng_reuse
    + `task`=""
    + `payload`=None

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
1. not `task`
  *> 失败 error="task_required"*
**out = > eng_res.reuse task=`task`**
*out*

## eng_verify
    + `payload`=None

**out = > eng_ver.run**
*out*

## eng_learn
    + `task`=""
    + `failure`=""
    + `payload`=None

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
  **pf = > json.get value=`payload` key="failure"**
  1. `pf`
    **failure = `pf`**
**out = > eng_qd.learn task=`task` failure=`failure`**
*out*

## eng_metrics
    + `payload`=None

**out = > eng_met.read**
*out*

## eng_candidates
    + `status`=""
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="status"**
  1. `s`
    **status = `s`**
**out = > eng_promote.list status=`status`**
*out*

## eng_promote
    + `slug`=""
    + `kind`="decision"
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="slug"**
  1. `s`
    **slug = `s`**
  **k = > json.get value=`payload` key="kind"**
  1. `k`
    **kind = `k`**
1. not `slug`
  *> 失败 error="slug_required"*
**out = > eng_promote.promote slug=`slug` kind=`kind`**
*out*

## eng_reject
    + `slug`=""
    + `reason`="rejected"
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="slug"**
  1. `s`
    **slug = `s`**
  **r = > json.get value=`payload` key="reason"**
  1. `r`
    **reason = `r`**
1. not `slug`
  *> 失败 error="slug_required"*
**out = > eng_promote.reject slug=`slug` reason=`reason`**
*out*

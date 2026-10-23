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
import eng_gate:../execution/docgate.mq.md
import eng_qd:../agent/qdagent.mq.md
import eng_met:../knowledge/metrics.mq.md
import eng_promote:../execution/promote.mq.md
import eng_run:../execution/run.mq.md
import eng_sess:../execution/session.mq.md
import eng_openai:../gateway/openai.mq.md
import eng_policy:../knowledge/policy.mq.md
import text:lib/text.mq.md
import settings:../db/settings.mq.md
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
| marqdo-host | 1.4.4 | `root` | `git` |

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
**sess = > eng_sess.link session_id=`session_id` surface=`surface` workbook_slug="" run_id=`slug`**
**sid = [session_id](sess)**
**git = > kbgit.提交 message="capture: " + `slug`**
`字段` =

| slug | path | git | session_id |
|------|------|-----|------------|
| `slug` | `path` | `git` | `sid` |

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

## settings_get

Read the model / voice settings row so the SPA settings form can populate.
Secrets are never echoed back: `llm_api_key` / `asr_api_key` / `tts_api_key`
are replaced by an `*_api_key_set` boolean.

**store = > db.open**
**rows = > `store`.select table="settings" limit=1**
**cfg = [1](rows)**
**llm_key = [llm_api_key](cfg)**
**asr_key = [asr_api_key](cfg)**
**tts_key = [tts_api_key](cfg)**
**llm_base = [llm_base_url](cfg)**
**llm_model = [llm_model](cfg)**
**asr_base = [asr_base_url](cfg)**
**asr_model = [asr_model](cfg)**
**tts_base = [tts_base_url](cfg)**
**tts_model = [tts_model](cfg)**
**lang = [dictation_lang](cfg)**
**has_llm = False**
1. `llm_key`
  **has_llm = True**
**has_asr = False**
1. `asr_key`
  **has_asr = True**
**has_tts = False**
1. `tts_key`
  **has_tts = True**
`字段` =

| llm_base_url | llm_model | llm_api_key_set | tts_base_url | tts_model | tts_api_key_set | asr_base_url | asr_model | asr_api_key_set | dictation_lang |
|--------------|-----------|-----------------|--------------|-----------|-----------------|--------------|-----------|-----------------|----------------|
| `llm_base` | `llm_model` | `has_llm` | `tts_base` | `tts_model` | `has_tts` | `asr_base` | `asr_model` | `has_asr` | `lang` |

*> 成功 字段=`字段`*

## settings_update
    + `payload`=None

Patch the settings row. Only the fields present in the payload are written;
empty strings clear a field, and `*_api_key` is only overwritten when provided.

1. not `payload`
  *> 失败 error="payload required"*

**store = > db.open**
**rows = > `store`.select table="settings" limit=1**
1. not `rows`
  **seed = > settings.seed**
  > `store`.insert table=settings rows=`seed`

**row = > table.empty_map**
**llm_base = > json.get value=`payload` key="llm_base_url"**
**llm_model = > json.get value=`payload` key="llm_model"**
**llm_key = > json.get value=`payload` key="llm_api_key"**
**tts_base = > json.get value=`payload` key="tts_base_url"**
**asr_base = > json.get value=`payload` key="asr_base_url"**
**lang = > json.get value=`payload` key="dictation_lang"**
**u = > time.now_unix**

1. `llm_base`
  **row = > table.put in=`row` at="llm_base_url" value=`llm_base`**
1. `llm_model`
  **row = > table.put in=`row` at="llm_model" value=`llm_model`**
1. `llm_key`
  **row = > table.put in=`row` at="llm_api_key" value=`llm_key`**
1. `tts_base`
  **row = > table.put in=`row` at="tts_base_url" value=`tts_base`**
1. `asr_base`
  **row = > table.put in=`row` at="asr_base_url" value=`asr_base`**
1. `lang`
  **row = > table.put in=`row` at="dictation_lang" value=`lang`**
**row = > table.put in=`row` at="updated_at" value=`u`**

**saved = > `store`.update table="settings" id=1 row=`row`**
**字段 = > table.put in=None at="saved" value=True**
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

## eng_find
    + `query`=""
    + `limit`=20
    + `payload`=None

1. `payload`
  **pq = > json.get value=`payload` key="query"**
  1. `pq`
    **query = `pq`**
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    1. not `query`
      **query = `pt`**
  **lim = > json.get value=`payload` key="limit"**
  1. `lim`
    **limit = `lim`**
1. not `query`
  *> 失败 error="query_required"*
**out = > eng_res.find query=`query` limit=`limit`**
*out*

## eng_capability
    + `id`=""
    + `payload`=None

Capability detail — catalog Implemented By + linked constraints/failures.

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**
1. not `id`
  *> 失败 error="id_required"*
**out = > eng_res.capability id=`id`**
*out*

## eng_impact
    + `paths`=""
    + `payload`=None

1. `payload`
  **pp = > json.get value=`payload` key="paths"**
  1. `pp`
    **paths = `pp`**
**out = > eng_res.impact paths=`paths`**
*out*

## eng_conflicts
    + `payload`=None

**out = > eng_res.conflicts**
*out*

## eng_stale
    + `payload`=None

**out = > eng_res.stale**
*out*

## eng_duplicate
    + `payload`=None

**out = > eng_res.duplicate**
*out*

## eng_verify
    + `payload`=None

**out = > eng_ver.run**
*out*

## eng_docgate
    + `text`=""
    + `root`="."
    + `payload`=None

Document Gate over arbitrary text — the same contract check that guards agent
answers and sedimented notes (`execution/docgate.mq.md`): 提取 → 结构检查 →
沙箱试跑. Returns `{ ok, stage, doc, stdout, error, violations }`.
The UI uses this to show why a note or answer is not yet a runnable document.

1. `payload`
  **pt = > json.get value=`payload` key="text"**
  1. `pt`
    **text = `pt`**
  **pr = > json.get value=`payload` key="root"**
  1. `pr`
    **root = `pr`**
1. not `root`
  **root = "."**
**out = > eng_gate.门禁 text=`text` root=`root`**
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

## eng_build
    + `task`=""
    + `force_create`=False
    + `session_id`=""
    + `async`=True
    + `payload`=None

Web BUILD — **async by default** (N6): Preflight + workbook → status=executing →
orphan `cli/求道-构建-继续` finishes agent/verify. Pass `async=false` for sync CLI-style.

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
  **fc = > json.get value=`payload` key="force_create"**
  1. `fc`
    **force_create = `fc`**
  **sid = > json.get value=`payload` key="session_id"**
  1. `sid`
    **session_id = `sid`**
  **asyn = > json.get value=`payload` key="async"**
  1. `asyn` == False
    **async = False**
  2. `asyn` == "false"
    **async = False**
1. not `task`
  **task = "给 OpenAI /v1 网关增加工程预检再调上游"**
1. not `async`
  **out = > eng_qd.build task=`task` force_create=`force_create` session_id=`session_id`**
  *out*
**started = > eng_qd.build_start task=`task` force_create=`force_create` session_id=`session_id`**
**sok = > json.get value=`started` key="ok"**
1. not `sok`
  *started*
**slug = > json.get value=`started` key="slug"**
**sid2 = > json.get value=`started` key="session_id"**
**root = > sys.env_get name="QDAGENT_ROOT"**
1. not `root`
  **root = > sys.cwd**
> sys.env_set name="QDAGENT_BUILD_SLUG" value=`slug`
> sys.env_set name="QDAGENT_TASK" value=`task`
> sys.env_set name="QDAGENT_SESSION_ID" value=`sid2`
> sys.env_set name="QDAGENT_ROOT" value=`root`
> sys.env_set name="MARQDO_FS_ROOT" value=`root`
**log = `root` + "/data/tmp/build-" + `slug` + ".log"**
> fs.make_dir path=`root` + "/data/tmp"
**cmd = "cd \"$QDAGENT_ROOT\" && nohup marqdo run cli/求道-构建-继续.mq.md --fs-root \"$QDAGENT_ROOT\" > \"" + `log` + "\" 2>&1 & echo $!"**
`args` =

| a |
|---|
| "-c" |
| `cmd` |

**proc = > sys.exec cmd="sh" args=args capture=True**
**pid_raw = > json.get value=`proc` key="stdout"**
**pid = > text.str_trim s=`pid_raw`**
**dec = > json.get value=`started` key="decision"**
**allowed = > json.get value=`started` key="create_allowed"**
**cpath = > json.get value=`started` key="context_path"**
`out` =

| ok | async | slug | decision | create_allowed | context_path | status | session_id | job_pid | log |
|----|-------|------|----------|----------------|--------------|--------|------------|---------|-----|
| True | True | `slug` | `dec` | `allowed` | `cpath` | executing | `sid2` | `pid` | `log` |

*out*

## eng_session
    + `id`=""
    + `payload`=None

Read server Session file (`data/sessions/<id>.mq.md`).

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**
  **ps = > json.get value=`payload` key="session_id"**
  1. `ps`
    1. not `id`
      **id = `ps`**
1. not `id`
  *> 失败 error="id_required"*
**out = > eng_sess.read id=`id`**
*out*

## eng_workbooks
    + `limit`=20
    + `payload`=None

1. `payload`
  **lim = > json.get value=`payload` key="limit"**
  1. `lim`
    **limit = `lim`**
**out = > eng_run.list limit=`limit`**
*out*

## eng_workbook
    + `slug`=""
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="slug"**
  1. `s`
    **slug = `s`**
1. not `slug`
  *> 失败 error="slug_required"*
**out = > eng_run.read_detail slug=`slug`**
*out*

## eng_today
    + `payload`=None

Engineering Today strip — recent workbooks · sessions · KPI · candidates count.

**wbs = > eng_run.list limit=5**
**kpi = > eng_met.read**
**cands = > eng_promote.list status=""**
**sess = > eng_sess.list limit=5**
**items = > json.get value=`cands` key="items"**
1. not `items`
  **items = > json.get value=`cands` key="candidates"**
1. not `items`
  **n_cand = 0**
2. *
  **n_cand = > len value=`items`**
**wb_n = > json.get value=`wbs` key="count"**
**wb_rows = > json.get value=`wbs` key="workbooks"**
**sess_n = > json.get value=`sess` key="count"**
**sess_rows = > json.get value=`sess` key="sessions"**
`out` =

| ok | workbook_count | workbooks | candidates | metrics | session_count | sessions |
|----|----------------|-----------|------------|---------|---------------|----------|
| True | `wb_n` | `wb_rows` | `n_cand` | `kpi` | `sess_n` | `sess_rows` |

*out*

## eng_sessions
    + `limit`=10
    + `payload`=None

1. `payload`
  **lim = > json.get value=`payload` key="limit"**
  1. `lim`
    **limit = `lim`**
**out = > eng_sess.list limit=`limit`**
*out*

## eng_knowledge
    + `payload`=None

Compile EKC (`marqdo knowledge`) — promote 后刷新图。

> sys.env_set name="QDAGENT_EKC_ROOT" value="."
> sys.env_set name="QDAGENT_EKC_OUT" value=".marqdo"
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
**stderr = [stderr](proc)**
1. `code` != 0
  `fail` =

  | ok | error | stderr |
  |----|-------|--------|
  | False | knowledge_failed | `stderr` |

  *fail*
`out` =

| ok | message |
|----|---------|
| True | `stdout` |

*out*

## eng_policies
    + `task`=""
    + `payload`=None

List authored Engineering Policies (L6) + constraints (L4).
Optional `task` → also return matched policies for Preflight enrichment.

1. `payload`
  **pt = > json.get value=`payload` key="task"**
  1. `pt`
    **task = `pt`**
**listed = > eng_policy.list**
1. `task`
  **matched = > eng_policy.match task=`task`**
  **hits = [matches](matched)**
  **out = > table.put in=`listed` at="matches" value=`hits`**
  **out = > table.put in=`out` at="task" value=`task`**
  *out*
*listed*

## _v1_check_bearer
    + `authorization`=""
    + `api_key`=""
    + `payload`=None

1. `payload`
  **a = > json.get value=`payload` key="authorization"**
  1. `a`
    **authorization = `a`**
  **k = > json.get value=`payload` key="api_key"**
  1. `k`
    **api_key = `k`**
**expect = > sys.env_get name="QDAGENT_API_KEY"**
1. not `expect`
  **expect = "qdagent-local"**
**token = ""**
1. `api_key`
  **token = `api_key`**
1. `authorization`
  **has_b = > text.starts_with text=`authorization` prefix="Bearer "**
  1. `has_b`
    **parts = > text.str_split s=`authorization` sep="Bearer "**
    **token = > at value=`parts` index=1**
  2. *
    **token = `authorization`**
1. `token` != `expect`
  `fail` =

  | ok | error |
  |----|-------|
  | False | unauthorized |

  *fail*
`pass` =

| ok | authorized |
|----|------------|
| True | True |

*pass*

## v1_models
    + `authorization`=""
    + `api_key`=""
    + `payload`=None

OpenAI-compatible `GET /v1/models` — Marqdo invoke (C2b, no Python).

**auth = > _v1_check_bearer authorization=`authorization` api_key=`api_key` payload=`payload`**
**aok = > json.get value=`auth` key="ok"**
1. not `aok`
  *auth*
**u = > time.now_unix**
`m1` =

| id | object | owned_by |
|----|--------|----------|
| qdagent | model | qdagent |

`m2` =

| id | object | owned_by |
|----|--------|----------|
| qdagent-fast | model | qdagent |

**data = > table.empty_list**
**data = > table.append list=`data` item=`m1`**
**data = > table.append list=`data` item=`m2`**
`out` =

| object | data |
|--------|------|
| list | `data` |

*out*

## v1_chat_completions
    + `messages`=""
    + `model`="qdagent"
    + `stream`=False
    + `authorization`=""
    + `api_key`=""
    + `payload`=None

OpenAI-compatible `POST /v1/chat/completions` — EFI via `gateway/openai.chat` (C2b).

**auth = > _v1_check_bearer authorization=`authorization` api_key=`api_key` payload=`payload`**
**aok = > json.get value=`auth` key="ok"**
1. not `aok`
  *auth*
1. `payload`
  **pm = > json.get value=`payload` key="messages"**
  1. `pm`
    **messages = `pm`**
  **pmodel = > json.get value=`payload` key="model"**
  1. `pmodel`
    **model = `pmodel`**
  **ps = > json.get value=`payload` key="stream"**
  1. `ps` == True
    **stream = True**
  2. `ps` == "true"
    **stream = True**
**task = ""**
1. `messages`
  **arr = > json.parse text="[]"**
  1. `messages` == ""
    **arr = > json.parse text="[]"**
  2. *
    **arr = `messages`**
  1. `arr`
    - [m](arr)
      **role = > json.get value=`m` key="role"**
      **content = > json.get value=`m` key="content"**
      1. `role` == "user"
        1. `content`
          **task = `content`**
1. not `task`
  **task = "ping"**
**chat = > eng_openai.chat message=`task` mode="" authorization=`authorization` api_key=`api_key` payload=`payload`**
**content = [content](chat)**
**run_id = [run_id](chat)**
**cok = [ok](chat)**
1. not `cok`
  1. not `content`
    **content = [error](chat)**
**u = > time.now_unix**
**cid = "chatcmpl-" + `run_id`**
1. not `run_id`
  **cid = "chatcmpl-" + `u`**
`message` =

| role | content |
|------|---------|
| assistant | `content` |

`choice` =

| index | message | finish_reason |
|-------|---------|---------------|
| 0 | `message` | stop |

**choices = > table.empty_list**
**choices = > table.append list=`choices` item=`choice`**
1. `stream`
  **delta_s = > json.stringify value=`content`**
  **cok_s = "false"**
  1. `cok`
    **cok_s = "true"**
  **chunk = "{\"id\":\"" + `cid` + "\",\"object\":\"chat.completion.chunk\",\"created\":" + `u` + ",\"model\":\"" + `model` + "\",\"ok\":" + `cok_s` + ",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":" + `delta_s` + "},\"finish_reason\":\"stop\"}]}"**
  **sse = "data: " + `chunk` + "\n\ndata: [DONE]\n\n"**
  `sse_out` =

  | sse | run_id | ok |
  |-----|--------|-----|
  | `sse` | `run_id` | `cok` |

  *sse_out*
`out` =

| id | object | created | model | choices | qdagent_run_id | ok |
|----|--------|---------|-------|---------|----------------|-----|
| `cid` | chat.completion | `u` | `model` | `choices` | `run_id` | `cok` |

*out*

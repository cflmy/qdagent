---
markup: occlusion
title: lib/workbench
description: >-
  Workspaces, DocumentView bridge, citations, uploads/imports, usage ledger,
  profile items, turn cancel (Q03–Q08). Read paths never execute documents.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  eng_imp: ../knowledge/import.mq.md
  run: lib/run.mq.md
---

## app_ok
    + `data`=None

`out` =

| ok | schema_version | data |
|----|----------------|------|
| True | 1 | `data` |

*out*

## app_err
    + `code`="error"
    + `message`="error"

`error` =

| code | message | retryable |
|------|---------|-----------|
| `code` | `message` | False |

`out` =

| ok | error |
|----|-------|
| False | `error` |

*out*

## workspaces_list

**store = > db.open**
**rows = > `store`.select table="workspaces" limit=100 order="-updated_at"**
*> app_ok data=`rows`*

## workspaces_save
    + `payload`=None

**store = > db.open**
**u = > time.now_unix**
**id = > json.get value=`payload` key="id"**
**name = > json.get value=`payload` key="name"**
**root = > json.get value=`payload` key="project_root_ref"**
1. not `name`
  *> app_err code="resource.not_found" message="name required"*
1. not `id`
  **id = "ws-" + `u`**
1. not `root`
  **root = "."**
`row` =

| id | owner_id | name | project_root_ref | kb_root_ref | data_namespace | default_selection | permissions | index_status | revision | archived | created_at | updated_at |
|----|----------|------|------------------|-------------|----------------|-------------------|-------------|--------------|----------|----------|------------|------------|
| `id` | local | `name` | `root` |  | data |  | read,run,edit,publish,configure | ready | 1 | 0 | `u` | `u` |

**exist = > `store`.get table="workspaces" id=`id`**
1. `exist`
  > `store`.update table="workspaces" id=`id` row=`row`
2. *
  > `store`.insert table=workspaces rows=`row`
*> app_ok data=`row`*

## documents_read
    + `payload`=None

Read-only DocumentView. Prefers Marqdo MLSP `view.document`; falls back to
honest capability_unavailable (never live execute).

**workspace_id = > json.get value=`payload` key="workspace_id"**
**document = > json.get value=`payload` key="document"**
**revision = > json.get value=`payload` key="revision"**
**node_id = > json.get value=`payload` key="node_id"**
1. not `document`
  *> app_err code="resource.not_found" message="document required"*
**store = > db.open**
**project = "."**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. `ws`
    **project = [project_root_ref](access(ws, "project_root_ref"))**
1. not `project`
  **project = "."**

**mlsp_req = "{\"id\":1,\"method\":\"view.document\",\"params\":{\"project\":\"" + `project` + "\",\"document\":\"" + `document` + "\",\"mode\":\"read\"}}"**
**tmp = > sys.env_get name="TMPDIR"**
1. not `tmp`
  **tmp = "/tmp"**
**req_path = `tmp` + "/qd-view-doc-req.json"**
**out_path = `tmp` + "/qd-view-doc-out.json"**
> fs.write_text path=`req_path` text=`mlsp_req`
**cmd = "marqdo mlsp < " + `req_path` + " > " + `out_path` + " 2>/dev/null; echo $?"**
**rc = > sys.exec cmd=`cmd`**
**raw = > fs.read_text path=`out_path`**
1. `raw`
  **resp = > json.parse text=`raw`**
  **ok = > json.get value=`resp` key="ok"**
  1. `ok`
    **data = > json.get value=`resp` key="result"**
    *> app_ok data=`data`*
  2. *
    **err = > json.get value=`resp` key="error"**
    **msg = > json.get value=`err` key="message"**
    1. not `msg`
      **msg = "view.document failed"**
    *> app_err code="runtime.unavailable" message=`msg`*
`unavailable` =

| schema | schema_version | completeness | capabilities | diagnostics | render |
|--------|----------------|--------------|--------------|-------------|--------|
| DocumentViewV1 | 1 | partial | {"read_only":true,"view.document":false} | ["Marqdo view.document unavailable — install matching CLI/ext/native"] | {"format":"plain","fragment":"","renderer_version":"0"} |

*> app_ok data=`unavailable`*

## citations_resolve
    + `payload`=None

**locator = > json.get value=`payload` key="locator"**
**workspace_id = > json.get value=`payload` key="workspace_id"**
**store = > db.open**
**project = "."**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. `ws`
    **project = [project_root_ref](access(ws, "project_root_ref"))**
1. not `locator`
  **artifact_id = > json.get value=`payload` key="artifact_id"**
  **document_id = > json.get value=`payload` key="document_id"**
  `locator` =

  | project_id | document_id | artifact_id | relation |
  |------------|-------------|-------------|----------|
  | `project` | `document_id` | `artifact_id` | cites |

**loc_s = > json.stringify value=`locator`**
**mlsp_req = "{\"id\":1,\"method\":\"view.reference_resolve\",\"params\":" + `loc_s` + "}"**
**tmp = > sys.env_get name="TMPDIR"**
1. not `tmp`
  **tmp = "/tmp"**
**req_path = `tmp` + "/qd-cite-req.json"**
**out_path = `tmp` + "/qd-cite-out.json"**
> fs.write_text path=`req_path` text=`mlsp_req`
**cmd = "marqdo mlsp < " + `req_path` + " > " + `out_path` + " 2>/dev/null"**
> sys.exec cmd=`cmd`
**raw = > fs.read_text path=`out_path`**
1. `raw`
  **resp = > json.parse text=`raw`**
  **ok = > json.get value=`resp` key="ok"**
  1. `ok`
    **data = > json.get value=`resp` key="result"**
    *> app_ok data=`data`*
`fallback` =

| resolution | label | diagnostics |
|------------|-------|-------------|
| unresolved | 尚未定位到具体知识 | ["view.reference_resolve unavailable"] |

*> app_ok data=`fallback`*

## usage_query
    + `payload`=None

**store = > db.open**
**limit = > json.get value=`payload` key="limit"**
1. not `limit`
  **limit = 50**
**rows = > `store`.select table="model_calls" limit=`limit` order="-created_at"**
**known = 0**
**unknown_n = 0**
- [r](遍历 rows 为 r)
  **st = [usage_state](access(r, "usage_state"))**
  1. `st` == "unknown"
    **unknown_n = `unknown_n` + 1**
  2. *
    **tt = [total_tokens](access(r, "total_tokens"))**
    1. `tt`
      **known = `known` + `tt`**
`data` =

| calls | known_tokens | unknown_call_count | rows |
|-------|--------------|--------------------|------|
| `rows` | `known` | `unknown_n` | `rows` |

*> app_ok data=`data`*

## record_usage
    + `payload`=None

**store = > db.open**
**u = > time.now_unix**
**call_id = > json.get value=`payload` key="call_id"**
**attempt_id = > json.get value=`payload` key="attempt_id"**
1. not `call_id`
  **call_id = "call-" + `u`**
1. not `attempt_id`
  **attempt_id = "a1"**
**id = `call_id` + ":" + `attempt_id`**
**usage_state = > json.get value=`payload` key="usage_state"**
1. not `usage_state`
  **usage_state = "unknown"**
`row` =

| id | call_id | attempt_id | run_id | turn_id | session_id | workspace_id | purpose | model_id | model_snapshot | status | input_tokens | output_tokens | total_tokens | cached_input_tokens | reasoning_output_tokens | usage_state | measurement_source | revision | started_at | created_at | updated_at |
|----|---------|------------|--------|---------|------------|--------------|---------|----------|----------------|--------|--------------|---------------|--------------|---------------------|-------------------------|-------------|--------------------|----------|------------|------------|------------|
| `id` | `call_id` | `attempt_id` | [run_id](access(payload, "run_id")) | [turn_id](access(payload, "turn_id")) | [session_id](access(payload, "session_id")) | [workspace_id](access(payload, "workspace_id")) | [purpose](access(payload, "purpose")) | [model_id](access(payload, "model_id")) | [model_snapshot](access(payload, "model_snapshot")) | [status](access(payload, "status")) | [input_tokens](access(payload, "input_tokens")) | [output_tokens](access(payload, "output_tokens")) | [total_tokens](access(payload, "total_tokens")) | [cached_input_tokens](access(payload, "cached_input_tokens")) | [reasoning_output_tokens](access(payload, "reasoning_output_tokens")) | `usage_state` | [measurement_source](access(payload, "measurement_source")) | 1 | `u` | `u` | `u` |

**exist = > `store`.get table="model_calls" id=`id`**
1. `exist`
  > `store`.update table="model_calls" id=`id` row=`row`
2. *
  > `store`.insert table=model_calls rows=`row`
*> app_ok data=`row`*

## uploads_create
    + `payload`=None

Browser upload bridge: accepts `{filename,content_text,workspace_id,request_id}`.
Stores under workspace data dir; does not execute uploaded `.mq.md`.

**filename = > json.get value=`payload` key="filename"**
**content = > json.get value=`payload` key="content_text"**
**workspace_id = > json.get value=`payload` key="workspace_id"**
**request_id = > json.get value=`payload` key="request_id"**
1. not `filename`
  *> app_err code="document.unsupported_format" message="filename required"*
1. not `content`
  *> app_err code="document.unsupported_format" message="content_text required"*
**ok_fmt = False**
**is_md = > text.contains text=`filename` sub=".md"**
**is_txt = > text.contains text=`filename` sub=".txt"**
1. `is_md`
  **ok_fmt = True**
1. `is_txt`
  **ok_fmt = True**
1. not `ok_fmt`
  *> app_err code="document.unsupported_format" message="only .md/.txt in first slice"*
**root = > run.确保目录**
**u = > time.now_unix**
1. not `request_id`
  **request_id = "up-" + `u`**
**dir = `root` + "/uploads/" + `request_id`**
> fs.make_dir path=`dir`
**path = `dir` + "/" + `filename`**
> fs.write_text path=`path` text=`content`
**store = > db.open**
`job` =

| id | upload_id | workspace_id | owner_id | request_id | status | original_name | stored_path | draft_path | evidence_path | title | error | revision | created_at | updated_at |
|----|-----------|--------------|----------|------------|--------|---------------|-------------|------------|---------------|-------|-------|----------|------------|------------|
| `request_id` | `request_id` | `workspace_id` | local | `request_id` | uploaded | `filename` | `path` |  |  | `filename` |  | 1 | `u` | `u` |

**exist = > `store`.get table="import_jobs" id=`request_id`**
1. `exist`
  > `store`.update table="import_jobs" id=`request_id` row=`job`
2. *
  > `store`.insert table=import_jobs rows=`job`
*> app_ok data=`job`*

## imports_start
    + `payload`=None

**store = > db.open**
**upload_id = > json.get value=`payload` key="upload_id"**
1. not `upload_id`
  **upload_id = > json.get value=`payload` key="request_id"**
**job = > `store`.get table="import_jobs" id=`upload_id`**
1. not `job`
  *> app_err code="resource.not_found" message="upload not found"*
**path = [stored_path](access(job, "stored_path"))**
**imp = > eng_imp.import_txt path=`path`**
**u = > time.now_unix**
**status = "draft_ready"**
**err = ""**
**draft = `path`**
**iok = > json.get value=`imp` key="ok"**
1. not `iok`
  **status = "failed"**
  **err = > json.get value=`imp` key="error"**
  1. not `err`
    **err = "import failed"**
`patch` =

| status | draft_path | error | updated_at |
|--------|------------|-------|------------|
| `status` | `draft` | `err` | `u` |

> `store`.update table="import_jobs" id=`upload_id` row=`patch`
**job2 = > `store`.get table="import_jobs" id=`upload_id`**
*> app_ok data=`job2`*

## imports_get
    + `payload`=None

**store = > db.open**
**id = > json.get value=`payload` key="id"**
1. not `id`
  **id = > json.get value=`payload` key="upload_id"**
**job = > `store`.get table="import_jobs" id=`id`**
1. not `job`
  *> app_err code="resource.not_found" message="import job not found"*
*> app_ok data=`job`*

## profile_items_get
    + `payload`=None

**store = > db.open**
**rows = > `store`.select table="profile_items" limit=200 order="-updated_at"**
*> app_ok data=`rows`*

## profile_items_propose
    + `payload`=None

**store = > db.open**
**u = > time.now_unix**
**text_v = > json.get value=`payload` key="text"**
**category = > json.get value=`payload` key="category"**
**scope = > json.get value=`payload` key="scope"**
1. not `scope`
  **scope = "user"**
1. not `category`
  **category = "preference"**
1. not `text_v`
  *> app_err code="resource.not_found" message="text required"*
**id = "pi-" + `u`**
`row` =

| id | category | text | scope | status | source_refs | created_at | confirmed_at | expires_at | revision |
|----|----------|------|-------|--------|-------------|------------|--------------|------------|----------|
| `id` | `category` | `text_v` | `scope` | proposed |  | `u` |  |  | 1 |

> `store`.insert table=profile_items rows=`row`
*> app_ok data=`row`*

## profile_items_set_status
    + `payload`=None

**store = > db.open**
**id = > json.get value=`payload` key="id"**
**status = > json.get value=`payload` key="status"**
1. not `id`
  *> app_err code="resource.not_found" message="id required"*
1. not `status`
  *> app_err code="resource.not_found" message="status required"*
**cur = > `store`.get table="profile_items" id=`id`**
1. not `cur`
  *> app_err code="resource.not_found" message="profile item not found"*
**u = > time.now_unix**
**confirmed_at = [confirmed_at](access(cur, "confirmed_at"))**
1. `status` == "confirmed"
  **confirmed_at = `u`**
**crev = [revision](access(cur, "revision"))**
**nrev = `crev` + 1**
`patch` =

| status | confirmed_at | revision | updated_at |
|--------|--------------|----------|------------|
| `status` | `confirmed_at` | `nrev` | `u` |

> `store`.update table="profile_items" id=`id` row=`patch`
**row = > `store`.get table="profile_items" id=`id`**
*> app_ok data=`row`*

## turns_cancel
    + `payload`=None

**store = > db.open**
**id = > json.get value=`payload` key="id"**
1. not `id`
  **id = > json.get value=`payload` key="turn_id"**
1. not `id`
  *> app_err code="resource.not_found" message="turn id required"*
**u = > time.now_unix**
`patch` =

| cancel_requested | state | updated_at |
|------------------|-------|------------|
| 1 | cancelling | `u` |

> `store`.update table="turn_state" id=`id` row=`patch`
**row = > `store`.get table="turn_state" id=`id`**
1. not `row`
  `created` =

  | id | session_id | workspace_id | request_id | state | model_id | model_snapshot | cancel_requested | usage_state | error | revision | created_at | updated_at |
  |----|------------|--------------|------------|-------|----------|----------------|------------------|-------------|-------|----------|------------|------------|
  | `id` |  |  | `id` | cancelling |  |  | 1 | unknown |  | 1 | `u` | `u` |

  > `store`.insert table=turn_state rows=`created`
  *> app_ok data=`created`*
*> app_ok data=`row`*

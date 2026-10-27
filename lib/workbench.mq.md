---
markup: occlusion
title: lib/workbench
description: >-
  HTTP facade for workspaces, DocumentView, citations, uploads/imports, usage,
  profile items, turn cancel. Business authority: execution/turns +
  knowledge/publication. Read paths never execute documents (Q-R0–R7).
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  eng_imp: ../knowledge/import.mq.md
  publication: ../knowledge/publication.mq.md
  turns: ../execution/turns.mq.md
  flags: ../lib/feature_flags.mq.md
  run: lib/run.mq.md
  workspace: ../lib/workspace.mq.md
  response_preferences: ../lib/response_preferences.mq.md
---

## tools_catalog
    + `payload`=None

GET /api/app/tools — authorized tool inventory for current product scope.
No credentials, API keys, or connector secrets. Capability/state/version only.

`tools` =

| @ | id | version | effect | availability | description |
|---|----|---------|--------|--------------|-------------|
| 1 | tools_search | 1 | read | ready | Search authorized tool catalog by intent |
| 2 | tools_describe | 1 | read | ready | Describe one authorized ToolSpec by id |
| 3 | note_read | 1 | read | ready | Read a host-relative note under an allowed root |
| 4 | file_read | 1 | read | ready | Read a host-relative workspace file |
| 5 | workspace_list | 1 | read | ready | List workspace directory entries with cursor |
| 6 | workspace_search | 1 | read | ready | Search workspace paths/content with locators |
| 7 | workspace_read | 1 | read | ready | Bounded workspace file range read |
| 8 | web_search | 1 | read | ready | Web search hits (trust=unverified) |
| 9 | web_fetch | 1 | read | ready | Fetch one http(s) URL with SSRF guards |
| 10 | plan_update | 1 | write | ready | Publish plan milestones (not execution proof) |
| 11 | task_status | 1 | write | ready | Publish task status pending\|running\|done\|blocked |
| 12 | tool_find | 1 | read | ready | Engineering find (EKC) |
| 13 | tool_reuse | 1 | read | ready | Engineering reuse |
| 14 | tool_bind | 1 | write | ready | Engineering bind |
| 15 | tool_verify | 1 | read | ready | Engineering verify |
| 16 | tool_summarize | 1 | read | ready | Engineering summarize |
| 17 | memory_forget | 1 | write | ready | Forget a profile memory item (auditable) |
| 18 | notes_create | 1 | write | ready | Create a note under allowed root |
| 19 | notes_update | 1 | write | ready | CAS update note with expected_digest |
| 20 | files_patch | 1 | write | ready | CAS content replace under workspace root |

`data` =

| schema | schema_version | tools | secrets | note |
|--------|----------------|-------|---------|------|
| ToolsCatalogV1 | 1 | `tools` | never | inventory only — search hit ≠ authorization to execute |

*> app_ok data=`data`*

## feature_flags_snapshot

**snap = > flags.snapshot**
*> app_ok data=`snap`*

## response_preferences_get
    + `payload`=None

**session_id = > json.get value=`payload` key="session_id"**
1. not `session_id`
  **session_id = ""**
**row = > response_preferences.get session_id=`session_id`**
*> app_ok data=`row`*

## response_preferences_put
    + `payload`=None

POST /api/app/response_preferences — CAS write (expected_revision required).
User turn explicit detail still overrides prefs at ask time.

**detail = > json.get value=`payload` key="detail"**
**max_chars = > json.get value=`payload` key="max_chars"**
**scope = > json.get value=`payload` key="scope"**
**principal = > json.get value=`payload` key="principal"**
**session_id = > json.get value=`payload` key="session_id"**
**expected = > json.get value=`payload` key="expected_revision"**
1. not `detail`
  **detail = "concise"**
1. not `max_chars`
  **max_chars = 0**
1. not `scope`
  **scope = "user"**
1. not `principal`
  **principal = "user"**
1. not `session_id`
  **session_id = ""**
1. not `expected`
  *> app_err code="invalid_arguments" message="expected_revision required"*
**out = > response_preferences.put detail=`detail` max_chars=`max_chars` scope=`scope` principal=`principal` session_id=`session_id` expected_revision=`expected`**
**ok = > json.get value=`out` key="ok"**
1. not `ok`
  **err = > json.get value=`out` key="error"**
  **ecode = > json.get value=`err` key="code"**
  **emsg = > json.get value=`err` key="message"**
  1. not `ecode`
    **ecode = "error"**
  1. not `emsg`
    **emsg = "response preferences update failed"**
  *> app_err code=`ecode` message=`emsg`*
**pref = > json.get value=`out` key="preference"**
*> app_ok data=`pref`*

## app_ok
    + `data`=None
    + `schema_version`=2

`out` =

| ok | schema_version | data |
|----|----------------|------|
| True | `schema_version` | `data` |

*out*

## app_err
    + `code`="error"
    + `message`="error"
    + `retryable`=False
    + `details`=None

`error` =

| code | message | retryable | details |
|------|---------|-----------|---------|
| `code` | `message` | `retryable` | `details` |

`out` =

| ok | schema_version | error |
|----|----------------|-------|
| False | 2 | `error` |

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

## workspaces_tree
    + `payload`=None

*> workspace.list_tree payload=`payload`*

## documents_read
    + `payload`=None

Read-only preview (Q-R4 / Q-A5). `.mq.md` → `view.document`; ordinary
files (json/csv/md/txt/code/…) → `resource.view`. Never executes. Unique
per-request temp files — never fixed /tmp names (R06).

**workspace_id = > json.get value=`payload` key="workspace_id"**
**document = > json.get value=`payload` key="document"**
**revision = > json.get value=`payload` key="revision"**
**generation = > json.get value=`payload` key="generation"**
**node_id = > json.get value=`payload` key="node_id"**
1. not `document`
  *> app_err code="resource.not_found" message="document required"*
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**

**is_mq = > text.ends_with text=`document` suffix=".mq.md"**
1. not `is_mq`
  *> resources_view payload=`payload` project=`project`*

`params` =

| project | document | mode | revision | generation | node_id |
|---------|----------|------|----------|------------|---------|
| `project` | `document` | read | `revision` | `generation` | `node_id` |

**params_s = > json.stringify value=`params`**
**mlsp_req = "{\"id\":1,\"method\":\"view.document\",\"params\":" + `params_s` + "}"**
*> mlsp_roundtrip req=`mlsp_req` fail_msg="view.document failed" soft_schema="DocumentViewV1" soft_caps_key="view.document"*

## resources_preview
    + `payload`=None

Designed unified read-only preview (design §11.1). Adapts to documents_read /
resources_view authority — does not invent a second state machine. Accepts
path/document/resource_id + revision + locator; `.mq.md` stays on DocumentView.
Never executes. Old `/documents/read` remains compatible.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**document = > json.get value=`payload` key="document"**
1. not `document`
  **document = > json.get value=`payload` key="path"**
1. not `document`
  **document = > json.get value=`payload` key="resource_id"**
1. not `document`
  *> app_err code="resource.not_found" message="document, path, or resource_id required"*
**revision = > json.get value=`payload` key="revision"**
**generation = > json.get value=`payload` key="generation"**
**node_id = > json.get value=`payload` key="node_id"**
**locator = > json.get value=`payload` key="locator"**
**renderer = > json.get value=`payload` key="renderer"**

`norm` =

| workspace_id | document | path | revision | generation | node_id | locator | renderer |
|--------------|----------|------|----------|------------|---------|---------|----------|
| `workspace_id` | `document` | `document` | `revision` | `generation` | `node_id` | `locator` | `renderer` |

*> documents_read payload=`norm`*

## resources_view
    + `payload`=None
    + `project`=""

ResourceViewV1 for ordinary files (json/csv/md/code/txt). `no_exec` always.

1. not `project`
  **workspace_id = > json.get value=`payload` key="workspace_id"**
  **store = > db.open**
  1. `workspace_id`
    **ws = > `store`.get table="workspaces" id=`workspace_id`**
    1. not `ws`
      *> app_err code="workspace.forbidden" message="unknown workspace"*
    **project = [project_root_ref](access(ws, "project_root_ref"))**
  2. *
    **project = "."**
1. not `project`
  **project = "."**
**document = > json.get value=`payload` key="document"**
1. not `document`
  **document = > json.get value=`payload` key="path"**
1. not `document`
  *> app_err code="resource.not_found" message="document or path required"*
**revision = > json.get value=`payload` key="revision"**
**locator = > json.get value=`payload` key="locator"**

`params` =

| project | path | mode | revision | locator |
|---------|------|------|----------|---------|
| `project` | `document` | read | `revision` | `locator` |

**params_s = > json.stringify value=`params`**
**mlsp_req = "{\"id\":1,\"method\":\"resource.view\",\"params\":" + `params_s` + "}"**
*> mlsp_roundtrip req=`mlsp_req` fail_msg="resource.view failed" soft_schema="ResourceViewV1" soft_caps_key="resource.view"*

## mlsp_roundtrip
    + `req`
    + `fail_msg`="mlsp failed"
    + `soft_schema`="ResourceViewV1"
    + `soft_caps_key`="resource.view"

Shared temp-file mlsp invoke. Soft-fail to capability-unavailable envelope.

**root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**req_path = `root` + "/tmp/qd-view-" + `u` + "-" + `nonce` + "-req.json"**
**out_path = `root` + "/tmp/qd-view-" + `u` + "-" + `nonce` + "-out.json"**
> fs.write_text path=`req_path` text=`req`
> sys.env_set name="QDAGENT_VIEW_REQ" value=`req_path`
> sys.env_set name="QDAGENT_VIEW_OUT" value=`out_path`
`args` =

| a |
|---|
| "-c" |
| marqdo mlsp < "$QDAGENT_VIEW_REQ" > "$QDAGENT_VIEW_OUT" 2>/dev/null; echo $? |

**proc = > sys.exec cmd="sh" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`req_path`
> fs.remove path=`out_path`
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
      **msg = `fail_msg`**
    **ecode = > json.get value=`err` key="code"**
    1. `ecode` == "version_unavailable"
      *> app_err code="reference.stale" message=`msg` retryable=True*
    *> app_err code="runtime.unavailable" message=`msg` retryable=True*
**caps_obj = > json.parse text="{\"" + `soft_caps_key` + "\":false,\"read_only\":true}"**
**diag_msg = "Marqdo " + `soft_caps_key` + " unavailable — install matching CLI/ext/native"**
`unavailable` =

| schema | schema_version | completeness | capabilities | diagnostics | render | no_exec |
|--------|----------------|--------------|--------------|-------------|--------|---------|
| `soft_schema` | 1 | partial | `caps_obj` | [`diag_msg`] | {"format":"plain_text","fragment":"","renderer_version":"0"} | True |

*> app_ok data=`unavailable`*

## resources_blob
    + `payload`=None

Authorized workspace blob for client visual preview (PDF.js / ImagePreview).
Never executes. Path must stay under project_root; optional digest check.
Returns base64 payload (Marqdo has no binary HTTP body yet) — FE decodes.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**path = > json.get value=`payload` key="path"**
1. not `path`
  **path = > json.get value=`payload` key="document"**
1. not `path`
  *> app_err code="resource.not_found" message="path required"*
**trav = > text.contains text=`path` sub=".."**
**abs_hint = > text.starts_with text=`path` prefix="/"**
1. `trav`
  *> app_err code="workspace.forbidden" message="path escape rejected"*
1. `abs_hint`
  *> app_err code="workspace.forbidden" message="absolute path rejected"*
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**
**abs = `project` + "/" + `path`**
**expected = > json.get value=`payload` key="digest"**
**max_bytes = > json.get value=`payload` key="max_bytes"**
1. not `max_bytes`
  **max_bytes = 20971520**
**root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `root` + "/tmp/qd-blob-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/blob_encode.py"**
> sys.env_set name="QDAGENT_BLOB_ABS" value=`abs`
> sys.env_set name="QDAGENT_BLOB_OUT" value=`out_path`
> sys.env_set name="QDAGENT_BLOB_REL" value=`path`
> sys.env_set name="QDAGENT_BLOB_MAX" value=`max_bytes`
1. `expected`
  > sys.env_set name="QDAGENT_BLOB_DIGEST" value=`expected`
2. *
  > sys.env_set name="QDAGENT_BLOB_DIGEST" value=""
`args` =

| a |
|---|
| `script` |

**proc = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  *> app_err code="runtime.unavailable" message="blob encode failed" retryable=True*
**resp = > json.parse text=`raw`**
**ok = > json.get value=`resp` key="ok"**
1. `ok`
  **data = > json.get value=`resp` key="result"**
  *> app_ok data=`data`*
**err = > json.get value=`resp` key="error"**
**msg = > json.get value=`err` key="message"**
**ecode = > json.get value=`err` key="code"**
1. not `msg`
  **msg = "blob read failed"**
1. not `ecode`
  **ecode = "runtime.unavailable"**
*> app_err code=`ecode` message=`msg` retryable=False*

## resources_read
    + `payload`=None

Designed range read (design §11.1): line/page/cell + max_bytes + next_cursor.
Never executes. PDF/image/office return extract.unavailable (F16) — use
resources/preview for visual pages; do not invent OCR text.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**path = > json.get value=`payload` key="path"**
1. not `path`
  **path = > json.get value=`payload` key="document"**
1. not `path`
  **path = > json.get value=`payload` key="resource_id"**
1. not `path`
  *> app_err code="resource.not_found" message="path, document, or resource_id required"*
**trav = > text.contains text=`path` sub=".."**
**abs_hint = > text.starts_with text=`path` prefix="/"**
1. `trav`
  *> app_err code="workspace.forbidden" message="path escape rejected"*
1. `abs_hint`
  *> app_err code="workspace.forbidden" message="absolute path rejected"*
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**
**abs = `project` + "/" + `path`**
**digest = > json.get value=`payload` key="digest"**
1. not `digest`
  **digest = > json.get value=`payload` key="revision"**
**max_bytes = > json.get value=`payload` key="max_bytes"**
1. not `max_bytes`
  **max_bytes = 65536**
**line_start = > json.get value=`payload` key="line_start"**
1. not `line_start`
  **locator = > json.get value=`payload` key="locator"**
  1. `locator`
    **line_start = > json.get value=`locator` key="line"**
1. not `line_start`
  **line_start = 0**
**line_end = > json.get value=`payload` key="line_end"**
1. not `line_end`
  **line_end = 0**
**cursor = > json.get value=`payload` key="next_cursor"**
1. not `cursor`
  **cursor = > json.get value=`payload` key="cursor"**
1. not `cursor`
  **cursor = ""**
**cell_col = > json.get value=`payload` key="cell_col"**
1. not `cell_col`
  **locator2 = > json.get value=`payload` key="locator"**
  1. `locator2`
    **cell_col = > json.get value=`locator2` key="col"**
1. not `cell_col`
  **cell_col = 0**
**root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `root` + "/tmp/qd-read-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/resource_read.py"**
> sys.env_set name="QDAGENT_READ_ABS" value=`abs`
> sys.env_set name="QDAGENT_READ_OUT" value=`out_path`
> sys.env_set name="QDAGENT_READ_REL" value=`path`
> sys.env_set name="QDAGENT_READ_MAX_BYTES" value=`max_bytes`
> sys.env_set name="QDAGENT_READ_LINE_START" value=`line_start`
> sys.env_set name="QDAGENT_READ_LINE_END" value=`line_end`
> sys.env_set name="QDAGENT_READ_CURSOR" value=`cursor`
> sys.env_set name="QDAGENT_READ_CELL_COL" value=`cell_col`
1. `digest`
  > sys.env_set name="QDAGENT_READ_DIGEST" value=`digest`
2. *
  > sys.env_set name="QDAGENT_READ_DIGEST" value=""
`args` =

| a |
|---|
| `script` |

**proc = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  *> app_err code="runtime.unavailable" message="resource read failed" retryable=True*
**resp = > json.parse text=`raw`**
**ok = > json.get value=`resp` key="ok"**
1. `ok`
  **data = > json.get value=`resp` key="result"**
  *> app_ok data=`data`*
**err = > json.get value=`resp` key="error"**
**msg = > json.get value=`err` key="message"**
**ecode = > json.get value=`err` key="code"**
1. not `msg`
  **msg = "resource read failed"**
1. not `ecode`
  **ecode = "runtime.unavailable"**
*> app_err code=`ecode` message=`msg` retryable=False*

## resources_resolve
    + `payload`=None

Map path/slug/resource_id → ResourceRefV1 (design §11.1). Opaque IDs
(`rf.*` / `rn.*`); workspace re-auth on every resolve. Historical digest
mismatch → reference.version_unavailable (no silent fallback). Never executes.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**path = > json.get value=`payload` key="path"**
1. not `path`
  **path = > json.get value=`payload` key="document"**
**slug = > json.get value=`payload` key="slug"**
**resource_id = > json.get value=`payload` key="resource_id"**
**digest = > json.get value=`payload` key="digest"**
1. not `digest`
  **digest = > json.get value=`payload` key="revision"**
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**
**data_root = > run.确保目录**
**root_tmp = `data_root`**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `root_tmp` + "/tmp/qd-res-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/resource_index.py"**
> sys.env_set name="QDAGENT_RES_OP" value="resolve"
> sys.env_set name="QDAGENT_RES_OUT" value=`out_path`
> sys.env_set name="QDAGENT_RES_WS" value=`workspace_id`
> sys.env_set name="QDAGENT_RES_ROOT" value=`project`
> sys.env_set name="QDAGENT_RES_DATA" value=`data_root`
> sys.env_set name="QDAGENT_RES_PATH" value=`path`
> sys.env_set name="QDAGENT_RES_SLUG" value=`slug`
> sys.env_set name="QDAGENT_RES_ID" value=`resource_id`
1. `digest`
  > sys.env_set name="QDAGENT_RES_DIGEST" value=`digest`
2. *
  > sys.env_set name="QDAGENT_RES_DIGEST" value=""
`args` =

| a |
|---|
| `script` |

**proc = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  *> app_err code="runtime.unavailable" message="resource resolve failed" retryable=True*
**resp = > json.parse text=`raw`**
**ok = > json.get value=`resp` key="ok"**
1. `ok`
  **data = > json.get value=`resp` key="result"**
  *> app_ok data=`data`*
**err = > json.get value=`resp` key="error"**
**msg = > json.get value=`err` key="message"**
**ecode = > json.get value=`err` key="code"**
1. not `msg`
  **msg = "resource resolve failed"**
1. not `ecode`
  **ecode = "runtime.unavailable"**
*> app_err code=`ecode` message=`msg` retryable=False*

## resources_list
    + `payload`=None

List ResourceRefV1 items under workspace (files) and/or run notes.
Cursor pagination; never executes.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**path = > json.get value=`payload` key="path"**
**kind = > json.get value=`payload` key="kind"**
1. not `kind`
  **kind = "file"**
**cursor = > json.get value=`payload` key="cursor"**
1. not `cursor`
  **cursor = > json.get value=`payload` key="next_cursor"**
1. not `cursor`
  **cursor = 0**
**limit = > json.get value=`payload` key="limit"**
1. not `limit`
  **limit = 50**
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**
**data_root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-reslist-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/resource_index.py"**
> sys.env_set name="QDAGENT_RES_OP" value="list"
> sys.env_set name="QDAGENT_RES_OUT" value=`out_path`
> sys.env_set name="QDAGENT_RES_WS" value=`workspace_id`
> sys.env_set name="QDAGENT_RES_ROOT" value=`project`
> sys.env_set name="QDAGENT_RES_DATA" value=`data_root`
> sys.env_set name="QDAGENT_RES_PATH" value=`path`
> sys.env_set name="QDAGENT_RES_KIND" value=`kind`
> sys.env_set name="QDAGENT_RES_CURSOR" value=`cursor`
> sys.env_set name="QDAGENT_RES_LIMIT" value=`limit`
`args` =

| a |
|---|
| `script` |

**proc = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  *> app_err code="runtime.unavailable" message="resource list failed" retryable=True*
**resp = > json.parse text=`raw`**
**ok = > json.get value=`resp` key="ok"**
1. `ok`
  **data = > json.get value=`resp` key="result"**
  *> app_ok data=`data`*
**err = > json.get value=`resp` key="error"**
**msg = > json.get value=`err` key="message"**
**ecode = > json.get value=`err` key="code"**
1. not `msg`
  **msg = "resource list failed"**
1. not `ecode`
  **ecode = "runtime.unavailable"**
*> app_err code=`ecode` message=`msg` retryable=False*

## resources_verify_attachments
    + `payload`=None

Verify ContextAttachment pins against live digests (QA-16).
Stale pins keep frozen revision — never silent-refresh.

**workspace_id = > json.get value=`payload` key="workspace_id"**
**attachments = > json.get value=`payload` key="attachments"**
1. not `attachments`
  **attachments = > json.get value=`payload` key="context_attachments"**
1. not `attachments`
  **attachments = > json.parse text="[]"**
1. not `workspace_id`
  1. `attachments`
    **_first = > json.get value=`attachments` key=0**
    1. `_first`
      **workspace_id = > json.get value=`_first` key="workspace_id"**
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `project`
  **project = "."**
**data_root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-att-" + `u` + "-" + `nonce` + ".json"**
**att_path = `data_root` + "/tmp/qd-att-in-" + `u` + "-" + `nonce` + ".json"**
**att_json = > json.stringify value=`attachments`**
> fs.write_text path=`att_path` text=`att_json`
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/context_attachments.py"**
> sys.env_set name="QDAGENT_RES_OUT" value=`out_path`
> sys.env_set name="QDAGENT_RES_WS" value=`workspace_id`
> sys.env_set name="QDAGENT_RES_ROOT" value=`project`
> sys.env_set name="QDAGENT_RES_DATA" value=`data_root`
> sys.env_set name="QDAGENT_RES_ATTACHMENTS" value=`att_path`
`args` =

| a |
|---|
| `script` |

**proc = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
> fs.remove path=`att_path`
1. not `raw`
  *> app_err code="runtime.unavailable" message="attachment verify failed" retryable=True*
**resp = > json.parse text=`raw`**
**ok = > json.get value=`resp` key="ok"**
1. `ok`
  **data = > json.get value=`resp` key="result"**
  *> app_ok data=`data`*
**err = > json.get value=`resp` key="error"**
**msg = > json.get value=`err` key="message"**
**ecode = > json.get value=`err` key="code"**
1. not `msg`
  **msg = "attachment verify failed"**
1. not `ecode`
  **ecode = "runtime.unavailable"**
*> app_err code=`ecode` message=`msg` retryable=False*

## citations_resolve
    + `payload`=None

Resolve citation with authorized project injected (Q-R4). Unique temp files.

**locator = > json.get value=`payload` key="locator"**
**workspace_id = > json.get value=`payload` key="workspace_id"**
**store = > db.open**
1. `workspace_id`
  **ws = > `store`.get table="workspaces" id=`workspace_id`**
  1. not `ws`
    *> app_err code="workspace.forbidden" message="unknown workspace"*
  **project = [project_root_ref](access(ws, "project_root_ref"))**
2. *
  **project = "."**
1. not `locator`
  **artifact_id = > json.get value=`payload` key="artifact_id"**
  **document_id = > json.get value=`payload` key="document_id"**
  **revision = > json.get value=`payload` key="revision"**
  **generation = > json.get value=`payload` key="generation"**
  **node_id = > json.get value=`payload` key="node_id"**
  `locator` =

  | project_id | document_id | artifact_id | revision | generation | node_id | relation |
  |------------|-------------|-------------|----------|------------|---------|----------|
  | `project` | `document_id` | `artifact_id` | `revision` | `generation` | `node_id` | cites |

2. *
  **locator = > table.put in=`locator` at="project_id" value=`project`**
  **locator = > table.put in=`locator` at="project" value=`project`**

**loc_s = > json.stringify value=`locator`**
**mlsp_req = "{\"id\":1,\"method\":\"view.reference_resolve\",\"params\":" + `loc_s` + "}"**
**root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**req_path = `root` + "/tmp/qd-cite-" + `u` + "-" + `nonce` + "-req.json"**
**out_path = `root` + "/tmp/qd-cite-" + `u` + "-" + `nonce` + "-out.json"**
> fs.write_text path=`req_path` text=`mlsp_req`
> sys.env_set name="QDAGENT_CITE_REQ" value=`req_path`
> sys.env_set name="QDAGENT_CITE_OUT" value=`out_path`
`cargs` =

| a |
|---|
| "-c" |
| marqdo mlsp < "$QDAGENT_CITE_REQ" > "$QDAGENT_CITE_OUT" 2>/dev/null |

> sys.exec cmd="sh" args=cargs capture=True
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`req_path`
> fs.remove path=`out_path`
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

Q-R8: (call_id, attempt_id) unique; higher revision replaces; unknown ≠ 0.

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
**total_tokens = > json.get value=`payload` key="total_tokens"**
1. `usage_state` == "unknown"
  **total_tokens = None**
**rev = 1**
**exist = > `store`.get table="model_calls" id=`id`**
1. `exist`
  **prev = [revision](access(exist, "revision"))**
  1. `prev`
    **rev = `prev` + 1**
`row` =

| id | call_id | attempt_id | run_id | turn_id | session_id | workspace_id | purpose | model_id | model_snapshot | status | input_tokens | output_tokens | total_tokens | cached_input_tokens | reasoning_output_tokens | usage_state | measurement_source | revision | started_at | created_at | updated_at |
|----|---------|------------|--------|---------|------------|--------------|---------|----------|----------------|--------|--------------|---------------|--------------|---------------------|-------------------------|-------------|--------------------|----------|------------|------------|------------|
| `id` | `call_id` | `attempt_id` | [run_id](access(payload, "run_id")) | [turn_id](access(payload, "turn_id")) | [session_id](access(payload, "session_id")) | [workspace_id](access(payload, "workspace_id")) | [purpose](access(payload, "purpose")) | [model_id](access(payload, "model_id")) | [model_snapshot](access(payload, "model_snapshot")) | [status](access(payload, "status")) | [input_tokens](access(payload, "input_tokens")) | [output_tokens](access(payload, "output_tokens")) | `total_tokens` | [cached_input_tokens](access(payload, "cached_input_tokens")) | [reasoning_output_tokens](access(payload, "reasoning_output_tokens")) | `usage_state` | [measurement_source](access(payload, "measurement_source")) | `rev` | `u` | `u` | `u` |

1. `exist`
  > `store`.update table="model_calls" id=`id` row=`row`
2. *
  > `store`.insert table=model_calls rows=`row`
*> app_ok data=`row`*

## uploads_create
    + `payload`=None

Q-R5: server-generated upload path; request_id is index only; filename display-only.
Does not execute uploaded `.mq.md`. Hard suffix check (not contains).

**filename = > json.get value=`payload` key="filename"**
**content = > json.get value=`payload` key="content_text"**
1. not `content`
  **content = > json.get value=`payload` key="content"**
**workspace_id = > json.get value=`payload` key="workspace_id"**
**request_id = > json.get value=`payload` key="request_id"**
1. not `filename`
  *> app_err code="document.unsupported_format" message="filename required"*
1. not `content`
  *> app_err code="document.unsupported_format" message="content_text required"*
**trav = > text.contains text=`filename` sub=".."**
**abs_hint = > text.starts_with text=`filename` prefix="/"**
1. `trav`
  *> app_err code="workspace.forbidden" message="bad filename"*
1. `abs_hint`
  *> app_err code="workspace.forbidden" message="absolute filename rejected"*
**ok_fmt = False**
**is_md = > text.ends_with text=`filename` suffix=".md"**
**is_txt = > text.ends_with text=`filename` suffix=".txt"**
**is_mq = > text.ends_with text=`filename` suffix=".mq.md"**
1. `is_md`
  **ok_fmt = True**
1. `is_txt`
  **ok_fmt = True**
1. `is_mq`
  **ok_fmt = True**
1. not `ok_fmt`
  *> app_err code="document.unsupported_format" message="only .md/.txt/.mq.md in first slice"*
**is_pdf = > text.ends_with text=`filename` suffix=".pdf"**
1. `is_pdf`
  *> app_err code="document.unsupported_format" message="PDF/OCR needs plugin — not available"*

**root = > run.确保目录**
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
1. not `request_id`
  **request_id = "up-" + `u` + "-" + `nonce`**
1. not `workspace_id`
  **workspace_id = "ws-default"**

**store = > db.open**
**exist = > `store`.get table="import_jobs" id=`request_id`**
1. `exist`
  **prev_hash = > json.get value=`exist` key="payload_hash"**
  **ph = > len value=`content`**
  **ph_s = "len:" + `ph` + ":" + `filename`**
  1. `prev_hash`
    1. not `prev_hash` == `ph_s`
      *> app_err code="request_id.conflict" message="same request_id different payload" retryable=False*
  *> app_ok data=`exist`*

**upload_id = "upload-" + `u` + "-" + `nonce`**
**dir = `root` + "/uploads/" + `workspace_id` + "/" + `upload_id`**
> fs.make_dir path=`dir`
**path = `dir` + "/blob"**
> fs.write_text path=`path` text=`content`
**content_len = > len value=`content`**
**payload_hash = "len:" + `content_len` + ":" + `filename`**
`job` =

| id | upload_id | workspace_id | owner_id | request_id | status | original_name | stored_path | draft_path | evidence_path | title | error | original_digest | payload_hash | stage_revision | revision | created_at | updated_at |
|----|-----------|--------------|----------|------------|--------|---------------|-------------|------------|---------------|-------|-------|-----------------|--------------|----------------|----------|------------|------------|
| `request_id` | `upload_id` | `workspace_id` | local | `request_id` | uploaded | `filename` | `path` |  |  | `filename` |  |  | `payload_hash` | 1 | 1 | `u` | `u` |

> `store`.insert table=import_jobs rows=`job`
*> app_ok data=`job`*

## imports_start
    + `payload`=None

Q-R5/R6: extract → real draft; store draft_path from eng_imp (not raw upload).

**store = > db.open**
**upload_id = > json.get value=`payload` key="upload_id"**
1. not `upload_id`
  **upload_id = > json.get value=`payload` key="request_id"**
**job = > `store`.get table="import_jobs" id=`upload_id`**
1. not `job`
  *> app_err code="resource.not_found" message="upload not found"*
**path = [stored_path](access(job, "stored_path"))**
**ws = [workspace_id](access(job, "workspace_id"))**
**title = [original_name](access(job, "original_name"))**
**u = > time.now_unix**
`stage` =

| status | updated_at |
|--------|------------|
| extracting | `u` |

> `store`.update table="import_jobs" id=`upload_id` row=`stage`

**kb = > eng_imp.resolve_kb_root**
**imp = > eng_imp.import_txt path=`path` kb_root=`kb` title=`title`**
**status = "draft_ready"**
**err = ""**
**draft = ""**
**evidence = ""**
**cand = ""**
**orig_d = ""**
**ext_d = ""**
**ext_v = ""**
**iok = > json.get value=`imp` key="ok"**
1. not `iok`
  **status = "failed"**
  **err = > json.get value=`imp` key="error"**
  1. not `err`
    **err = "import failed"**
2. *
  **draft = > json.get value=`imp` key="draft"**
  1. not `draft`
    **draft = [draft](access(imp, "draft"))**
  **evidence = > json.get value=`imp` key="evidence"**
  **chk = > json.get value=`imp` key="check"**
  **cok = > json.get value=`chk` key="ok"**
  1. not `cok`
    **status = "needs_input"**
    **err = "check_failed"**
  **orig_d = > json.get value=`imp` key="original_digest"**
  **ext_d = > json.get value=`imp` key="extracted_text_digest"**
  **ext_v = > json.get value=`imp` key="extractor_version"**
  **cand = > json.get value=`imp` key="candidate_digest"**
1. not `draft`
  1. `status` == "draft_ready"
    **status = "failed"**
    **err = "missing_draft_path"**
`patch` =

| status | draft_path | evidence_path | error | original_digest | extracted_text_digest | extractor_version | candidate_digest | stage_revision | updated_at |
|--------|------------|---------------|-------|-----------------|----------------------|-------------------|------------------|----------------|------------|
| `status` | `draft` | `evidence` | `err` | `orig_d` | `ext_d` | `ext_v` | `cand` | 2 | `u` |

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

## imports_publish
    + `payload`=None

Q-R7: real publication via knowledge/publication — manifest/CURRENT required.
DB status is projection only after manifest exists (R07).

**store = > db.open**
**id = > json.get value=`payload` key="id"**
1. not `id`
  **id = > json.get value=`payload` key="upload_id"**
1. not `id`
  *> app_err code="resource.not_found" message="upload id required"*
**job = > `store`.get table="import_jobs" id=`id`**
1. not `job`
  *> app_err code="resource.not_found" message="import job not found"*
**st = > json.get value=`job` key="status"**
1. `st` == "failed"
  *> app_err code="publication.gate_failed" message="cannot publish failed import — draft retained"*
1. `st` == "needs_input"
  *> app_err code="publication.gate_failed" message="import needs_input — fix draft before publish"*
1. `st` == "legacy_unverified"
  *> app_err code="publication.gate_failed" message="legacy_unverified — re-import required"*
1. `st` == "published"
  **man = > json.get value=`job` key="publication_manifest"**
  1. `man`
    *> app_ok data=`job`*
  *> app_err code="publication.gate_failed" message="published without manifest — re-publish required"*
1. not `st` == "draft_ready"
  1. not `st` == "ready_to_publish"
    *> app_err code="resource.not_found" message="import not draft_ready"*

**draft = > json.get value=`job` key="draft_path"**
1. not `draft`
  *> app_err code="publication.gate_failed" message="missing draft_path"*
**cand = > json.get value=`job` key="candidate_digest"**
**expected = > json.get value=`payload` key="expected_generation"**
**u = > time.now_unix**
`publishing` =

| status | updated_at |
|--------|------------|
| publishing | `u` |

> `store`.update table="import_jobs" id=`id` row=`publishing`

**pub = > publication.publish draft=`draft` candidate_digest=`cand` expected_generation=`expected` import_job_id=`id`**
**pok = > json.get value=`pub` key="ok"**
1. not `pok`
  **perr = > json.get value=`pub` key="error"**
  1. not `perr`
    **perr = "publish failed"**
  `failp` =

  | status | error | updated_at |
  |--------|-------|------------|
  | draft_ready | `perr` | `u` |

  > `store`.update table="import_jobs" id=`id` row=`failp`
  *> app_err code="publication.gate_failed" message=`perr`*
**manifest = > json.get value=`pub` key="manifest"**
**generation = > json.get value=`pub` key="generation"**
**published_path = > json.get value=`pub` key="published"**
`okp` =

| status | publication_manifest | publication_generation | draft_path | error | updated_at |
|--------|----------------------|------------------------|------------|-------|------------|
| published | `manifest` | `generation` | `published_path` |  | `u` |

> `store`.update table="import_jobs" id=`id` row=`okp`
**job2 = > `store`.get table="import_jobs" id=`id`**
*> app_ok data=`job2`*

## profile_items_get
    + `payload`=None

Q-R8: default returns confirmed items only for injection; status=all for admin list.

**store = > db.open**
**status_f = > json.get value=`payload` key="status"**
**rows = > `store`.select table="profile_items" limit=200 order="-updated_at"**
1. `status_f` == "all"
  *> app_ok data=`rows`*
1. not `status_f`
  **status_f = "confirmed"**
**out_rows = > table.empty_list**
1. `rows`
  - [r](遍历 rows 为 r)
    **st = [status](access(r, "status"))**
    1. `st` == `status_f`
      **out_rows = > table.append list=`out_rows` item=`r`**
*> app_ok data=`out_rows`*

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

Allowed status: proposed | confirmed | rejected | forgotten.
`forgotten` is memory.forget — item stays auditable, never injectable.

**store = > db.open**
**id = > json.get value=`payload` key="id"**
**status = > json.get value=`payload` key="status"**
1. not `id`
  *> app_err code="resource.not_found" message="id required"*
1. not `status`
  *> app_err code="resource.not_found" message="status required"*
1. `status` == "proposed"
  **_ = 1**
2. `status` == "confirmed"
  **_ = 1**
3. `status` == "rejected"
  **_ = 1**
4. `status` == "forgotten"
  **_ = 1**
5. *
  *> app_err code="invalid_arguments" message="status must be proposed|confirmed|rejected|forgotten"*
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

## profile_items_get_one
    + `payload`=None

Read one profile item for ResourcePreview (profile_item target).

**id = > json.get value=`payload` key="id"**
1. not `id`
  *> app_err code="resource.not_found" message="id required"*
**store = > db.open**
**row = > `store`.get table="profile_items" id=`id`**
1. not `row`
  *> app_err code="resource.not_found" message="profile item not found"*
*> app_ok data=`row`*

## turns_cancel
    + `payload`=None

Q-R2 facade → execution/turns.cancel. Unknown turn → 404; never create placeholder (R03).
Bridges `/_runtime` cancel (control lane; no parent INVOKE_LOCK).

**ret = > turns.cancel payload=`payload`**
**ok = > json.get value=`ret` key="ok"**
1. not `ok`
  **code = > json.get value=`ret` key="code"**
  **msg = > json.get value=`ret` key="error"**
  1. not `msg`
    **msg = "turn cancel failed"**
  1. not `code`
    **code = "resource.not_found"**
  *> app_err code=`code` message=`msg`*
*> app_ok data=`ret`*

## turns_get
    + `turn_id`=""
    + `id`=""
    + `payload`=None

1. not `turn_id`
  1. `id`
    **turn_id = `id`**
1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    1. not `turn_id`
      **turn_id = `pid`**
**ret = > turns.get turn_id=`turn_id`**
**ok = > json.get value=`ret` key="ok"**
1. not `ok`
  **code = > json.get value=`ret` key="code"**
  **msg = > json.get value=`ret` key="error"**
  1. not `msg`
    **msg = "turn not found"**
  1. not `code`
    **code = "resource.not_found"**
  *> app_err code=`code` message=`msg`*
*> app_ok data=`ret`*

## turns_recover
    + `payload`=None

Q-A3 recover gate — reconnect is events-only; continue creates a linked attempt
under CAS without silent tool replay.

**ret = > turns.recover payload=`payload`**
**ok = > json.get value=`ret` key="ok"**
1. not `ok`
  **code = > json.get value=`ret` key="code"**
  **msg = > json.get value=`ret` key="error"**
  1. not `msg`
    **msg = "turn recover failed"**
  1. not `code`
    **code = "resource.not_found"**
  *> app_err code=`code` message=`msg`*
*> app_ok data=`ret`*

## turns_events
    + `turn_id`=""
    + `id`=""
    + `after_seq`=0
    + `last_event_id`=""
    + `payload`=None

Replay turn_events (Last-Event-ID). Control class; does not re-run the model.

1. not `turn_id`
  1. `id`
    **turn_id = `id`**
1. `payload`
  **pt = > json.get value=`payload` key="turn_id"**
  1. `pt`
    **turn_id = `pt`**
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    1. not `turn_id`
      **turn_id = `pid`**
  **pa = > json.get value=`payload` key="after_seq"**
  1. `pa`
    **after_seq = `pa`**
  **pl = > json.get value=`payload` key="last_event_id"**
  1. `pl`
    **last_event_id = `pl`**
**ret = > turns.events turn_id=`turn_id` after_seq=`after_seq` last_event_id=`last_event_id` payload=`payload`**
**ok = > json.get value=`ret` key="ok"**
1. not `ok`
  **code = > json.get value=`ret` key="code"**
  **msg = > json.get value=`ret` key="error"**
  1. not `msg`
    **msg = "turn events failed"**
  1. not `code`
    **code = "resource.not_found"**
  *> app_err code=`code` message=`msg`*
*> app_ok data=`ret`*

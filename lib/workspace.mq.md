---
markup: occlusion
title: lib/workspace
description: Workspace registry + document read bridge (Q04). Reading never executes.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  run: lib/run.mq.md
---

## list

**store = > db.open**
**rows = > `store`.select table="workspaces" limit=100 order="-updated_at"**
**out = > table.empty_list**
1. `rows`
  - [w](遍历 rows 为 w)
    **arch = [archived](access(w, "archived"))**
    1. not `arch`
      **out = > table.append list=`out` item=`w`**
`ret` =

| ok | workspaces |
|----|------------|
| True | `out` |

*ret*

## save
    + `payload`=None

1. not `payload`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | payload required | resource.not_found |

  *need*

**store = > db.open**
**u = > time.now_unix**
**wid = > json.get value=`payload` key="id"**
**name = > json.get value=`payload` key="name"**
**root = > json.get value=`payload` key="project_root_ref"**
**kb = > json.get value=`payload` key="kb_root_ref"**
**sel = > json.get value=`payload` key="default_selection"**
**expected = > json.get value=`payload` key="expected_revision"**
1. not `name`
  1. not `wid`
    `nn` =

    | ok | error | code |
    |----|-------|------|
    | False | name required | resource.not_found |

    *nn*

1. `wid`
  **cur = > `store`.get table="workspaces" id=`wid`**
  1. not `cur`
    `nf` =

    | ok | error | code |
    |----|-------|------|
    | False | workspace not found | resource.not_found |

    *nf*
  **crev = [revision](access(cur, "revision"))**
  1. `expected`
    1. not `expected` == `crev`
      `conflict` =

      | ok | error | code |
      |----|-------|------|
      | False | revision conflict | revision.conflict |

      *conflict*
  **row = > table.empty_map**
  1. `name`
    **row = > table.put in=`row` at="name" value=`name`**
  1. `root`
    **row = > table.put in=`row` at="project_root_ref" value=`root`**
  1. `kb`
    **row = > table.put in=`row` at="kb_root_ref" value=`kb`**
  1. `sel`
    **row = > table.put in=`row` at="default_selection" value=`sel`**
  **nrev = `crev` + 1**
  **row = > table.put in=`row` at="revision" value=`nrev`**
  **row = > table.put in=`row` at="updated_at" value=`u`**
  > `store`.update table="workspaces" id=`wid` row=`row`
  `ok` =

  | ok | id | revision |
  |----|----|----------|
  | True | `wid` | `nrev` |

  *ok*

1. not `wid`
  **wid = "ws-" + `u`**
1. not `root`
  **root = "."**
1. not `sel`
  **sel = "{\"mode\":\"manual\",\"model_id\":\"mdl-legacy-default\",\"revision\":1}"**
`ins` =

| id | owner_id | name | project_root_ref | kb_root_ref | data_namespace | default_selection | permissions | index_status | revision | archived | created_at | updated_at |
|----|----------|------|------------------|-------------|----------------|-------------------|-------------|--------------|----------|----------|------------|------------|
| `wid` | local | `name` | `root` | `kb` | data | `sel` | read,run,edit,publish,configure | ready | 1 | 0 | `u` | `u` |

> `store`.insert table=workspaces rows=`ins`
`okins` =

| ok | id | revision |
|----|----|----------|
| True | `wid` | 1 |

*okins*

## get
    + `id`=""
    + `payload`=None

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**
1. not `id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | id required | resource.not_found |

  *need*
**store = > db.open**
**row = > `store`.get table="workspaces" id=`id`**
1. not `row`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | workspace not found | workspace.forbidden |

  *nf*
`ret` =

| ok | workspace |
|----|-----------|
| True | `row` |

*ret*

## resolve_path
    + `workspace_id`
    + `document_id`=""
    + `path`=""

Map workspace + document id to a filesystem path under the authorized root.
Rejects path traversal.

**store = > db.open**
**ws = > `store`.get table="workspaces" id=`workspace_id`**
1. not `ws`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | workspace not found | workspace.forbidden |

  *nf*
**root = [project_root_ref](access(ws, "project_root_ref"))**
1. not `root`
  **root = "."**
**data_root = > run.确保目录**
1. `root` == "."
  **root = `data_root`**
1. not `path`
  **path = `document_id`**
1. not `path`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | document path required | resource.not_found |

  *need*

**bad = > text.contains text=`path` sub=".."**
1. `bad`
  `trav` =

  | ok | error | code |
  |----|-------|------|
  | False | path traversal denied | workspace.forbidden |

  *trav*

**full = `root` + "/" + `path`**
**exists = > fs.exists path=`full`**
1. not `exists`
  **full2 = `data_root` + "/kb/" + `path`**
  **exists2 = > fs.exists path=`full2`**
  1. `exists2`
    **full = `full2`**
  2. *
    **full3 = `data_root` + "/runs/" + `path`**
    **exists3 = > fs.exists path=`full3`**
    1. `exists3`
      **full = `full3`**
`ret` =

| ok | path | workspace_id | root |
|----|------|--------------|------|
| True | `full` | `workspace_id` | `root` |

*ret*

## read_document
    + `workspace_id`=""
    + `document_id`=""
    + `revision`=""
    + `node_id`=""
    + `payload`=None

Bridge to Marqdo view.document when available; else static no-exec fallback with honest capability unavailable.

1. `payload`
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **pd = > json.get value=`payload` key="document_id"**
  1. `pd`
    **document_id = `pd`**
  **pr = > json.get value=`payload` key="revision"**
  1. `pr`
    **revision = `pr`**
  **pn = > json.get value=`payload` key="node_id"**
  1. `pn`
    **node_id = `pn`**
  **pp = > json.get value=`payload` key="path"**
  1. `pp`
    1. not `document_id`
      **document_id = `pp`**

1. not `workspace_id`
  **workspace_id = "ws-default"**

**resolved = > resolve_path workspace_id=`workspace_id` document_id=`document_id`**
**rok = [ok](access(resolved, "ok"))**
1. not `rok`
  *resolved*

**path = [path](access(resolved, "path"))**
**exists = > fs.exists path=`path`**
1. not `exists`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | document not found | resource.not_found |

  *nf*

**text_body = > fs.read_text path=`path`**
**title = `document_id`**
**bridge = > try_view_document path=`path` node_id=`node_id`**
**bok = [ok](access(bridge, "ok"))**
**capability = "unavailable"**
**renderer = "static-fallback"**
**html = None**
**outline = > table.empty_list**
**honest = "view.document_bridge_missing"**
1. `bok`
  **capability = "available"**
  **renderer = "marqdo-view-document"**
  **html = [html_fragment](access(bridge, "html_fragment"))**
  **outline = [outline](access(bridge, "outline"))**
  **honest = ""**
  **bt = [title](access(bridge, "title"))**
  1. `bt`
    **title = `bt`**

**excerpt = `text_body`**
**parts = > split value=`text_body` sep="\n"**
**n = > len value=`parts`**
1. `n` > 80
  **excerpt = ""**
  **i = 0**
  - [line](遍历 parts 为 line)
    1. `i` < 80
      **excerpt = `excerpt` + `line` + "\n"**
    **i = `i` + 1**
  **excerpt = `excerpt` + "\n…（已截断）"**

`data` =

| document_id | workspace_id | title | revision | renderer | capability | html_fragment | text | outline | highlight_node_id | no_exec | honest_reason | path |
|-------------|--------------|-------|----------|----------|------------|---------------|------|---------|-------------------|---------|---------------|------|
| `document_id` | `workspace_id` | `title` | `revision` | `renderer` | `capability` | `html` | `excerpt` | `outline` | `node_id` | True | `honest` | `path` |

`ret` =

| ok | schema_version | data |
|----|----------------|------|
| True | 1 | `data` |

*ret*

## try_view_document
    + `path`
    + `node_id`=""

Attempt `marqdo mlsp` view.document. Soft-fail to capability unavailable.

**req = "{\"method\":\"view.document\",\"params\":{\"path\":\"" + `path` + "\",\"no_exec\":true}}"**
1. `node_id`
  **req = "{\"method\":\"view.document\",\"params\":{\"path\":\"" + `path` + "\",\"no_exec\":true,\"node_id\":\"" + `node_id` + "\"}}"**
> sys.env_set name="QDAGENT_VIEW_REQ" value=`req`
`args` =

| a |
|---|
| "-c" |
| MQ="${MARQDO_BIN:-marqdo}"; f="${TMPDIR:-/tmp}/qd-mlsp-view-$$.json"; printf '%s\n' "$QDAGENT_VIEW_REQ" > "$f"; "$MQ" mlsp < "$f"; rm -f "$f" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**stdout = access(proc, "stdout")**
1. not `stdout`
  `fail` =

  | ok | error |
  |----|-------|
  | False | no_stdout |

  *fail*
**resp = > json.parse text=`stdout`**
**rok = > json.get value=`resp` key="ok"**
1. not `rok`
  `fail2` =

  | ok | error | response |
  |----|-------|----------|
  | False | view_document_failed | `resp` |

  *fail2*
**result = > json.get value=`resp` key="result"**
1. not `result`
  **result = `resp`**
**html = > json.get value=`result` key="html_fragment"**
1. not `html`
  **html = > json.get value=`result` key="html"**
**title = > json.get value=`result` key="title"**
**outline = > json.get value=`result` key="outline"**
1. not `outline`
  **outline = > table.empty_list**
1. not `html`
  `fail3` =

  | ok | error |
  |----|-------|
  | False | no_html_fragment |

  *fail3*
`ok` =

| ok | html_fragment | title | outline |
|----|---------------|-------|---------|
| True | `html` | `title` | `outline` |

*ok*

## list_tree
    + `workspace_id`=""
    + `path`=""
    + `payload`=None

Authorized shallow file listing under workspace root. Rejects `..`. Read-only.

1. `payload`
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **pp = > json.get value=`payload` key="path"**
  1. `pp`
    **path = `pp`**
1. not `workspace_id`
  **workspace_id = "ws-default"**
**store = > db.open**
**ws = > `store`.get table="workspaces" id=`workspace_id`**
1. not `ws`
  **rows = > `store`.select table="workspaces" limit=1**
  **ws = [1](access(rows, "1"))**
  1. `ws`
    **workspace_id = [id](access(ws, "id"))**
1. not `ws`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | workspace not found | workspace.forbidden |

  *nf*
**root = [project_root_ref](access(ws, "project_root_ref"))**
1. not `root`
  **root = "."**
**data_root = > run.确保目录**
1. `root` == "."
  **root = `data_root`**
**rel = `path`**
1. not `rel`
  **rel = ""**
**bad = > text.contains text=`rel` sub=".."**
1. `bad`
  `trav` =

  | ok | error | code |
  |----|-------|------|
  | False | path traversal denied | workspace.forbidden |

  *trav*
**full = `root`**
1. `rel`
  **full = `root` + "/" + `rel`**
**exists = > fs.exists path=`full`**
1. not `exists`
  `miss` =

  | ok | error | code |
  |----|-------|------|
  | False | path not found | resource.not_found |

  *miss*
**entries = > fs.list_dir path=`full`**
**out = > table.empty_list**
1. `entries`
  - [name](遍历 entries 为 name)
    **child = `full` + "/" + `name`**
    **rel_child = `name`**
    1. `rel`
      **rel_child = `rel` + "/" + `name`**
    **is_dir = False**
    **st = > fs.stat path=`child`**
    1. `st`
      **kind = [kind](access(st, "kind"))**
      1. `kind` == "dir"
        **is_dir = True**
      2. `kind` == "directory"
        **is_dir = True**
    `item` =

    | name | path | is_dir | workspace_id |
    |------|------|--------|--------------|
    | `name` | `rel_child` | `is_dir` | `workspace_id` |

    **out = > table.append list=`out` item=`item`**
`ret` =

| ok | workspace_id | root | path | entries |
|----|--------------|------|------|---------|
| True | `workspace_id` | `root` | `rel` | `out` |

*ret*

## resolve_citation
    + `citation_id`=""
    + `message_id`=""
    + `workspace_id`="ws-default"
    + `document_id`=""
    + `node_id`=""
    + `payload`=None

1. `payload`
  **pc = > json.get value=`payload` key="citation_id"**
  1. `pc`
    **citation_id = `pc`**
  **pm = > json.get value=`payload` key="message_id"**
  1. `pm`
    **message_id = `pm`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **pd = > json.get value=`payload` key="document_id"**
  1. `pd`
    **document_id = `pd`**
  **pn = > json.get value=`payload` key="node_id"**
  1. `pn`
    **node_id = `pn`**
  **pl = > json.get value=`payload` key="locator"**
  1. `pl`
    **lv = > json.get value=`pl` key="value"**
    1. `lv`
      1. not `node_id`
        **node_id = `lv`**

1. not `citation_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | citation_id required | resource.not_found |

  *need*

**resolution = "unresolved"**
1. `document_id`
  **resolved = > resolve_path workspace_id=`workspace_id` document_id=`document_id`**
  **rok = [ok](access(resolved, "ok"))**
  1. `rok`
    **path = [path](access(resolved, "path"))**
    **exists = > fs.exists path=`path`**
    1. `exists`
      **resolution = "resolved"**
    2. *
      **resolution = "version_unavailable"**
  2. *
    **resolution = "forbidden"**

`locator` =

| kind | value |
|------|-------|
| node | `node_id` |

`cite` =

| citation_id | message_id | workspace_id | document_id | node_id | locator | relation | resolution | label |
|-------------|------------|--------------|-------------|--------|---------|----------|------------|-------|
| `citation_id` | `message_id` | `workspace_id` | `document_id` | `node_id` | `locator` | cites | `resolution` | `citation_id` |

`ret` =

| ok | schema_version | data |
|----|----------------|------|
| True | 1 | `cite` |

*ret*

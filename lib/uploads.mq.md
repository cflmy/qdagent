---
markup: occlusion
title: lib/uploads
description: >-
  Browser upload → import job → draft → publish (Q07). Uses knowledge/import;
  jobs are isolated (no shared fixed tmp path across concurrent imports).
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  run: lib/run.mq.md
  eng_imp: ../knowledge/import.mq.md
---

## create_upload
    + `filename`=""
    + `content`=""
    + `workspace_id`="ws-default"
    + `request_id`=""
    + `payload`=None

Accept text body (SPA base64/text). Multipart binary bridge may arrive as content string.

1. `payload`
  **pf = > json.get value=`payload` key="filename"**
  1. `pf`
    **filename = `pf`**
  **pc = > json.get value=`payload` key="content"**
  1. `pc`
    **content = `pc`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **pr = > json.get value=`payload` key="request_id"**
  1. `pr`
    **request_id = `pr`**

1. not `filename`
  **filename = "upload.txt"**
1. not `content`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | content required | document.unsupported_format |

  *need*

**lower = `filename`**
**is_pdf = > text.contains text=`lower` sub=".pdf"**
1. `is_pdf`
  `pdf` =

  | ok | error | code | hint |
  |----|-------|------|------|
  | False | pdf_extract_needs_plugin | document.unsupported_format | "PDF/OCR 需外挂；首批仅 TXT/Markdown" |

  *pdf*

**root = > run.确保目录**
**udir = `root` + "/uploads"**
> fs.make_dir path=`udir`
**u = > time.now_unix**
1. not `request_id`
  **request_id = "up-" + `u`**
**upload_id = "upload-" + `u`**
**safe = `upload_id` + "-" + `filename`**
**bad = > text.contains text=`filename` sub=".."**
1. `bad`
  `trav` =

  | ok | error | code |
  |----|-------|------|
  | False | bad filename | workspace.forbidden |

  *trav*
**stored = `udir` + "/" + `safe`**
> fs.write_text path=`stored` text=`content`

**store = > db.open**
`job` =

| id | upload_id | workspace_id | owner_id | request_id | status | original_name | stored_path | draft_path | evidence_path | title | error | revision | created_at | updated_at |
|----|-----------|--------------|----------|------------|--------|---------------|-------------|------------|---------------|-------|-------|----------|------------|------------|
| `upload_id` | `upload_id` | `workspace_id` | local | `request_id` | uploaded | `filename` | `stored` |  |  | `filename` |  | 1 | `u` | `u` |

> `store`.insert table=import_jobs rows=`job`
`ret` =

| ok | upload_id | request_id | status | stored_path | original_name |
|----|-----------|------------|--------|-------------|---------------|
| True | `upload_id` | `request_id` | uploaded | `stored` | `filename` |

*ret*

## start_import
    + `upload_id`=""
    + `publish`=False
    + `title`=""
    + `payload`=None

1. `payload`
  **pu = > json.get value=`payload` key="upload_id"**
  1. `pu`
    **upload_id = `pu`**
  **pt = > json.get value=`payload` key="title"**
  1. `pt`
    **title = `pt`**
  **pb = > json.get value=`payload` key="publish"**
  1. `pb`
    **publish = `pb`**

1. not `upload_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | upload_id required | resource.not_found |

  *need*

**store = > db.open**
**job = > `store`.get table="import_jobs" id=`upload_id`**
1. not `job`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | upload not found | resource.not_found |

  *nf*

**path = [stored_path](access(job, "stored_path"))**
**u = > time.now_unix**
`extracting` =

| status | updated_at |
|--------|------------|
| extracting | `u` |

> `store`.update table="import_jobs" id=`upload_id` row=`extracting`

1. not `title`
  **title = [original_name](access(job, "original_name"))**

**out = > eng_imp.import_txt path=`path` title=`title` publish=`publish` product_gate_ok=True**
**ook = access(out, "ok")**
1. not `ook`
  **err = access(out, "error")**
  `failed` =

  | status | error | updated_at |
  |--------|-------|------------|
  | failed | `err` | `u` |

  > `store`.update table="import_jobs" id=`upload_id` row=`failed`
  *out*

**draft = access(out, "draft")**
1. not `draft`
  **draft = > json.get value=`out` key="draft"**
**evidence = > json.get value=`out` key="evidence"**
**status = "draft_ready"**
1. `publish`
  **status = "published"**
`ready` =

| status | draft_path | evidence_path | title | updated_at | revision |
|--------|------------|---------------|-------|------------|----------|
| `status` | `draft` | `evidence` | `title` | `u` | 2 |

> `store`.update table="import_jobs" id=`upload_id` row=`ready`
`ret` =

| ok | upload_id | status | draft | evidence | import |
|----|-----------|--------|-------|----------|--------|
| True | `upload_id` | `status` | `draft` | `evidence` | `out` |

*ret*

## get_import
    + `upload_id`=""
    + `payload`=None

1. `payload`
  **pu = > json.get value=`payload` key="upload_id"**
  1. `pu`
    **upload_id = `pu`**
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    1. not `upload_id`
      **upload_id = `pid`**
1. not `upload_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | upload_id required | resource.not_found |

  *need*
**store = > db.open**
**job = > `store`.get table="import_jobs" id=`upload_id`**
1. not `job`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | import not found | resource.not_found |

  *nf*
`ret` =

| ok | job |
|----|-----|
| True | `job` |

*ret*

---
markup: occlusion
title: lib/profile_items
description: >-
  Structured profile items with proposed/confirmed status (Q08).
  Only confirmed + scoped items are injectable into context.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  profile: lib/profile.mq.md
---

## get
    + `scope`=""
    + `status`=""
    + `workspace_id`=""
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="scope"**
  1. `ps`
    **scope = `ps`**
  **pst = > json.get value=`payload` key="status"**
  1. `pst`
    **status = `pst`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**

**store = > db.open**
**rows = > `store`.select table="profile_items" limit=500 order="-updated_at"**
**items = > table.empty_list**
**proposed = > table.empty_list**
**confirmed = > table.empty_list**
**history = > table.empty_list**
1. `rows`
  - [r](遍历 rows 为 r)
    **keep = True**
    1. `scope`
      **rs = [scope](access(r, "scope"))**
      1. not `rs` == `scope`
        **keep = False**
    1. `status`
      **rst = [status](access(r, "status"))**
      1. not `rst` == `status`
        **keep = False**
    1. `workspace_id`
      **rw = [workspace_id](access(r, "workspace_id"))**
      1. `rw`
        1. not `rw` == `workspace_id`
          **keep = False**
    1. `keep`
      **items = > table.append list=`items` item=`r`**
      **st = [status](access(r, "status"))**
      1. `st` == "proposed"
        **proposed = > table.append list=`proposed` item=`r`**
      2. `st` == "confirmed"
        **confirmed = > table.append list=`confirmed` item=`r`**
      3. *
        **history = > table.append list=`history` item=`r`**

**body = > profile.读取**
**path = > profile.路径**
`ret` =

| ok | schema_version | items | proposed | confirmed | history | document_ref | body | revision |
|----|----------------|-------|----------|-----------|---------|--------------|------|----------|
| True | 1 | `items` | `proposed` | `confirmed` | `history` | `path` | `body` | 1 |

*ret*

## propose
    + `text`=""
    + `category`="preference"
    + `scope`="user"
    + `workspace_id`=""
    + `session_id`=""
    + `source_refs`=""
    + `payload`=None

Creates a proposed item — never auto-confirmed.

1. `payload`
  **pt = > json.get value=`payload` key="text"**
  1. `pt`
    **text = `pt`**
  **pc = > json.get value=`payload` key="category"**
  1. `pc`
    **category = `pc`**
  **ps = > json.get value=`payload` key="scope"**
  1. `ps`
    **scope = `ps`**
  **pw = > json.get value=`payload` key="workspace_id"**
  1. `pw`
    **workspace_id = `pw`**
  **ssid = > json.get value=`payload` key="session_id"**
  1. `ssid`
    **session_id = `ssid`**
  **sr = > json.get value=`payload` key="source_refs"**
  1. `sr`
    **source_refs = `sr`**

1. not `text`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | text required | resource.not_found |

  *need*

**store = > db.open**
**u = > time.now_unix**
**iid = "pi-" + `u`**
1. not `source_refs`
  **source_refs = "[]"**
`ins` =

| id | category | text | scope | status | source_refs | workspace_id | session_id | revision | created_at | confirmed_at | expires_at | updated_at |
|----|----------|------|-------|--------|-------------|--------------|------------|----------|------------|--------------|------------|------------|
| `iid` | `category` | `text` | `scope` | proposed | `source_refs` | `workspace_id` | `session_id` | 1 | `u` |  |  | `u` |

> `store`.insert table=profile_items rows=`ins`
`ret` =

| ok | id | status | scope |
|----|----|--------|-------|
| True | `iid` | proposed | `scope` |

*ret*

## set_status
    + `id`=""
    + `status`=""
    + `payload`=None

1. `payload`
  **pid = > json.get value=`payload` key="id"**
  1. `pid`
    **id = `pid`**
  **ps = > json.get value=`payload` key="status"**
  1. `ps`
    **status = `ps`**

1. not `id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | id required | resource.not_found |

  *need*
1. not `status`
  `needs` =

  | ok | error | code |
  |----|-------|------|
  | False | status required | resource.not_found |

  *needs*

**store = > db.open**
**cur = > `store`.get table="profile_items" id=`id`**
1. not `cur`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | item not found | resource.not_found |

  *nf*

**u = > time.now_unix**
**crev = [revision](access(cur, "revision"))**
**nrev = `crev` + 1**
**confirmed_at = [confirmed_at](access(cur, "confirmed_at"))**
1. `status` == "confirmed"
  **confirmed_at = `u`**
`patch` =

| status | confirmed_at | revision | updated_at |
|--------|--------------|----------|------------|
| `status` | `confirmed_at` | `nrev` | `u` |

> `store`.update table="profile_items" id=`id` row=`patch`
`ret` =

| ok | id | status | revision |
|----|----|--------|----------|
| True | `id` | `status` | `nrev` |

*ret*

## injectable
    + `workspace_id`=""
    + `session_id`=""

Only confirmed items whose scope matches. Used for context injection — never proposed.

**store = > db.open**
**rows = > `store`.select table="profile_items" limit=500**
**out = > table.empty_list**
1. `rows`
  - [r](遍历 rows 为 r)
    **st = [status](access(r, "status"))**
    1. `st` == "confirmed"
      **sc = [scope](access(r, "scope"))**
      **keep = False**
      1. `sc` == "user"
        **keep = True**
      2. `sc` == "workspace"
        **rw = [workspace_id](access(r, "workspace_id"))**
        1. `workspace_id`
          1. `rw` == `workspace_id`
            **keep = True**
        2. *
          1. not `rw`
            **keep = True**
      3. `sc` == "session"
        **rs = [session_id](access(r, "session_id"))**
        1. `session_id`
          1. `rs` == `session_id`
            **keep = True**
      1. `keep`
        **out = > table.append list=`out` item=`r`**
`ret` =

| ok | items | injection_policy |
|----|-------|-------------------|
| True | `out` | "confirmed+scoped only" |

*ret*

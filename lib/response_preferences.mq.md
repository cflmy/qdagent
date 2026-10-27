---
markup: occlusion
title: lib/response_preferences
description: >-
  ResponsePreference persistence — detail/scope/revision with CAS.
  Current user turn overrides prefs; prefs override defaults. Never secrets.
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  hash: lib/hash.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
---

## _path
    + `root`="data"

*`root` + "/prefs/response_preferences.json"*

## _default

`row` =

| schema | schema_version | principal | session_id | detail | max_chars | scope | revision | updated_at |
|--------|----------------|-----------|------------|--------|-----------|-------|----------|------------|
| ResponsePreferenceV1 | 1 | user |  | concise | 0 | user | sha256:0 |  |

*row*

## get
    + `root`="data"
    + `session_id`=""

Load principal (user) prefs; session overlay applied when session_id matches stored session row.
Missing file → defaults with revision sha256:0 (first put must use expected_revision=sha256:0).

**path = > _path root=`root`**
**exists = > fs.exists path=`path`**
1. not `exists`
  **d = > _default**
  *d*
**raw = > fs.read_text path=`path`**
1. not `raw`
  **d = > _default**
  *d*
**row = > json.parse text=`raw`**
1. not `row`
  **d = > _default**
  *d*
**rev = > json.get value=`row` key="revision"**
1. not `rev`
  **hex = > hash.sha256 text=`raw`**
  **rev = "sha256:" + `hex`**
  **row = > table.put in=`row` at="revision" value=`rev`**
*row*

## put
    + `detail`="concise"
    + `max_chars`=0
    + `scope`="user"
    + `principal`="user"
    + `session_id`=""
    + `expected_revision`=""
    + `root`="data"

CAS write. expected_revision required (use sha256:0 for first create).

1. not `expected_revision`
  `err` =

  | code | message |
  |------|---------|
  | invalid_arguments | expected_revision required |

  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*
1. `detail` != "concise"
  1. `detail` != "standard"
    1. `detail` != "detailed"
      `err` =

      | code | message |
      |------|---------|
      | invalid_arguments | detail must be concise|standard|detailed |

      `fail` =

      | ok | error |
      |----|-------|
      | False | `err` |

      *fail*
**cur = > get root=`root` session_id=`session_id`**
**crev = > json.get value=`cur` key="revision"**
1. `expected_revision` != `crev`
  **msg = "expected " + `expected_revision` + " but prefs are " + `crev`**
  `err` =

  | code | message |
  |------|---------|
  | revision.conflict | `msg` |

  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*
**u = > time.now_unix**
**path = > _path root=`root`**
> fs.make_dir path=`root`+"/prefs"
`draft` =

| schema | schema_version | principal | session_id | detail | max_chars | scope | updated_at |
|--------|----------------|-----------|------------|--------|-----------|-------|------------|
| ResponsePreferenceV1 | 1 | `principal` | `session_id` | `detail` | `max_chars` | `scope` | `u` |

**body0 = > json.stringify value=`draft`**
**hex = > hash.sha256 text=`body0`**
**rev = "sha256:" + `hex`**
**final = > table.put in=`draft` at="revision" value=`rev`**
**body = > json.stringify value=`final`**
> fs.write_text path=`path` text=`body`
`ok` =

| ok | preference |
|----|------------|
| True | `final` |

*ok*

## resolve_detail
    + `override`=""
    + `root`="data"
    + `session_id`=""

Priority: explicit override > stored preference > concise.

1. `override`
  1. `override` == "concise"
    *`override`*
  1. `override` == "standard"
    *`override`*
  1. `override` == "detailed"
    *`override`*
**row = > get root=`root` session_id=`session_id`**
**d = > json.get value=`row` key="detail"**
1. `d`
  *`d`*
*"concise"*

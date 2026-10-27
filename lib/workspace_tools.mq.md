---
markup: occlusion
title: lib/workspace_tools
description: >-
  Q-A4 workspace.list / search / read — per-call unique out paths.
  Read-only; path escape rejected. Search hits carry locators for workspace_read.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## _run
    + `op`="list"
    + `path`=""
    + `query`=""
    + `root`="."
    + `cursor`=0
    + `limit`=50
    + `digest`=""
    + `line_start`=0
    + `line_end`=0
    + `max_bytes`=65536

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-ws-" + `op` + "-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/workspace_tools.py"**
**cur_s = "" + `cursor`**
**lim_s = "" + `limit`**
**ls_s = "" + `line_start`**
**le_s = "" + `line_end`**
**mb_s = "" + `max_bytes`**
> sys.env_set name="QDAGENT_WS_OUT" value=`out_path`
> sys.env_set name="QDAGENT_WS_OP" value=`op`
> sys.env_set name="QDAGENT_WS_ROOT" value=`root`
> sys.env_set name="QDAGENT_WS_PATH" value=`path`
> sys.env_set name="QDAGENT_WS_QUERY" value=`query`
> sys.env_set name="QDAGENT_WS_CURSOR" value=`cur_s`
> sys.env_set name="QDAGENT_WS_LIMIT" value=`lim_s`
> sys.env_set name="QDAGENT_WS_DIGEST" value=`digest`
> sys.env_set name="QDAGENT_WS_LINE_START" value=`ls_s`
> sys.env_set name="QDAGENT_WS_LINE_END" value=`le_s`
> sys.env_set name="QDAGENT_WS_MAX_BYTES" value=`mb_s`
`args` =

| a |
|---|
| `script` |

**code = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  `fail` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | workspace tool produced no output |

  *fail*
**out = > json.parse text=`raw`**
*out*

## list
    + `path`=""
    + `root`="."
    + `cursor`=0
    + `limit`=50

*> _run op="list" path=`path` root=`root` cursor=`cursor` limit=`limit`*

## search
    + `query`=""
    + `path`=""
    + `root`="."
    + `cursor`=0
    + `limit`=20

*> _run op="search" query=`query` path=`path` root=`root` cursor=`cursor` limit=`limit`*

## read
    + `path`=""
    + `root`="."
    + `digest`=""
    + `line_start`=0
    + `line_end`=0
    + `max_bytes`=65536
    + `cursor`=""

*> _run op="read" path=`path` root=`root` digest=`digest` line_start=`line_start` line_end=`line_end` max_bytes=`max_bytes` cursor=`cursor`*

---
markup: occlusion
title: lib/web_search
description: >-
  Q-A5 web.search — per-call unique out path (no shared last_web_search.json).
  Hits are clues only (trust=unverified); answer-critical facts require web.fetch.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## search
    + `query`=""
    + `limit`=5

1. not `query`
  **hits0 = > json.parse text="[]"**
  `empty` =

  | ok | status | provider | hits | trust | hint |
  |----|--------|----------|------|-------|------|
  | True | succeeded | none | `hits0` | unverified | empty query |

  *empty*

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-websearch-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/legacy/web_search.py"**
**lim_s = "" + `limit`**
> sys.env_set name="QDAGENT_WEB_QUERY" value=`query`
> sys.env_set name="QDAGENT_WEB_LIMIT" value=`lim_s`
> sys.env_set name="QDAGENT_WEB_OUT" value=`out_path`
`args` =

| a |
|---|
| `script` |

**code = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  **hits1 = > json.parse text="[]"**
  `fail` =

  | ok | status | provider | hits | trust | error |
  |----|--------|----------|------|-------|-------|
  | False | failed | none | `hits1` | unverified | web_search produced no output |

  *fail*

**out = > json.parse text=`raw`**
*out*

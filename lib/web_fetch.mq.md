---
markup: occlusion
title: lib/web_fetch
description: >-
  Q-A5 web.fetch — per-call unique out path, SSRF guards, size/redirect caps.
  Results are evidence with trust=unverified (design §9.2).
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## fetch
    + `url`=""
    + `max_bytes`=524288
    + `timeout_s`=20

1. not `url`
  `empty` =

  | ok | status | error | trust |
  |----|--------|-------|-------|
  | False | failed | empty url | unverified |

  *empty*

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-webfetch-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/web_fetch.py"**
**max_s = "" + `max_bytes`**
**to_s = "" + `timeout_s`**
> sys.env_set name="QDAGENT_WEB_URL" value=`url`
> sys.env_set name="QDAGENT_WEB_OUT" value=`out_path`
> sys.env_set name="QDAGENT_WEB_MAX_BYTES" value=`max_s`
> sys.env_set name="QDAGENT_WEB_TIMEOUT" value=`to_s`
`args` =

| a |
|---|
| `script` |

**code = > sys.exec cmd="python3" args=args capture=True**
**raw = > fs.read_text path=`out_path`**
> fs.remove path=`out_path`
1. not `raw`
  `fail` =

  | ok | status | error | trust | exit_code |
  |----|--------|-------|-------|-----------|
  | False | failed | web_fetch produced no output | unverified | `code` |

  *fail*

**out = > json.parse text=`raw`**
*out*

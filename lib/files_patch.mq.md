---
markup: occlusion
title: lib/files_patch
description: >-
  files.patch — CAS content replace under workspace root. Absolute / .. rejected.
  Never executes Marqdo. Conflict → revision.conflict.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## patch
    + `path`=""
    + `root`="."
    + `content`=""
    + `expected_digest`=""

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-file-patch-" + `u` + "-" + `nonce` + ".json"**
**content_path = `data_root` + "/tmp/qd-file-body-" + `u` + "-" + `nonce` + ".txt"**
> fs.write_text path=`content_path` text=`content`
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/files_patch.py"**
> sys.env_set name="QDAGENT_FILE_OUT" value=`out_path`
> sys.env_set name="QDAGENT_FILE_ROOT" value=`root`
> sys.env_set name="QDAGENT_FILE_PATH" value=`path`
> sys.env_set name="QDAGENT_FILE_CONTENT_PATH" value=`content_path`
> sys.env_set name="QDAGENT_FILE_DIGEST" value=`expected_digest`
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
  | False | failed | files.patch produced no output |

  *fail*
**out = > json.parse text=`raw`**
*out*

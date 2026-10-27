---
markup: occlusion
title: lib/artifacts_write
description: >-
  artifacts.create / update under data/artifacts with digest CAS.
  Never executes Marqdo.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## _run
    + `op`="create"
    + `path`=""
    + `root`="data/artifacts"
    + `content`=""
    + `media_type`="text/plain"
    + `expected_digest`=""

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
> fs.make_dir path=`root`
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-art-" + `op` + "-" + `u` + "-" + `nonce` + ".json"**
**content_path = `data_root` + "/tmp/qd-art-body-" + `u` + "-" + `nonce` + ".txt"**
> fs.write_text path=`content_path` text=`content`
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/artifacts_write.py"**
> sys.env_set name="QDAGENT_ART_OUT" value=`out_path`
> sys.env_set name="QDAGENT_ART_OP" value=`op`
> sys.env_set name="QDAGENT_ART_ROOT" value=`root`
> sys.env_set name="QDAGENT_ART_PATH" value=`path`
> sys.env_set name="QDAGENT_ART_MEDIA" value=`media_type`
> sys.env_set name="QDAGENT_ART_CONTENT_PATH" value=`content_path`
> sys.env_set name="QDAGENT_ART_DIGEST" value=`expected_digest`
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
  | False | failed | artifacts write produced no output |

  *fail*
**out = > json.parse text=`raw`**
*out*

## create
    + `path`=""
    + `root`="data/artifacts"
    + `content`=""
    + `media_type`="text/plain"

*> _run op="create" path=`path` root=`root` content=`content` media_type=`media_type`*

## update
    + `path`=""
    + `root`="data/artifacts"
    + `content`=""
    + `media_type`="text/plain"
    + `expected_digest`=""

*> _run op="update" path=`path` root=`root` content=`content` media_type=`media_type` expected_digest=`expected_digest`*

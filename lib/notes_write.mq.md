---
markup: occlusion
title: lib/notes_write
description: >-
  notes.create / notes.update with digest CAS. Writes under allowed root only;
  never executes Marqdo. Conflict → revision.conflict.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## _run
    + `op`="create"
    + `path`=""
    + `root`="data"
    + `content`=""
    + `expected_digest`=""

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-note-" + `op` + "-" + `u` + "-" + `nonce` + ".json"**
**content_path = `data_root` + "/tmp/qd-note-body-" + `u` + "-" + `nonce` + ".txt"**
> fs.write_text path=`content_path` text=`content`
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/notes_write.py"**
> sys.env_set name="QDAGENT_NOTE_OUT" value=`out_path`
> sys.env_set name="QDAGENT_NOTE_OP" value=`op`
> sys.env_set name="QDAGENT_NOTE_ROOT" value=`root`
> sys.env_set name="QDAGENT_NOTE_PATH" value=`path`
> sys.env_set name="QDAGENT_NOTE_CONTENT_PATH" value=`content_path`
> sys.env_set name="QDAGENT_NOTE_DIGEST" value=`expected_digest`
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
  | False | failed | notes write produced no output |

  *fail*
**out = > json.parse text=`raw`**
*out*

## create
    + `path`=""
    + `root`="data"
    + `content`=""

*> _run op="create" path=`path` root=`root` content=`content`*

## update
    + `path`=""
    + `root`="data"
    + `content`=""
    + `expected_digest`=""

*> _run op="update" path=`path` root=`root` content=`content` expected_digest=`expected_digest`*

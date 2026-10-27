---
markup: occlusion
title: lib/code_run
description: >-
  code.run / tests.run — restricted sandbox with timeout and receipt.
  Network credentials scrubbed. Never executes Marqdo.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
---

## _run
    + `op`="run"
    + `entry`=""
    + `root`="."
    + `timeout_s`=30

**data_root = "data"**
> fs.make_dir path=`data_root`
> fs.make_dir path=`data_root`+"/tmp"
**u = > time.now_unix**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**out_path = `data_root` + "/tmp/qd-code-" + `op` + "-" + `u` + "-" + `nonce` + ".json"**
**repo = > sys.env_get name="QDAGENT_ROOT"**
1. not `repo`
  **repo = > sys.cwd**
**script = `repo` + "/scripts/code_run.py"**
**to_s = "" + `timeout_s`**
> sys.env_set name="QDAGENT_CODE_OUT" value=`out_path`
> sys.env_set name="QDAGENT_CODE_OP" value=`op`
> sys.env_set name="QDAGENT_CODE_ROOT" value=`root`
> sys.env_set name="QDAGENT_CODE_ENTRY" value=`entry`
> sys.env_set name="QDAGENT_CODE_TIMEOUT" value=`to_s`
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
  | False | failed | code_run produced no output |

  *fail*
**out = > json.parse text=`raw`**
*out*

## run
    + `entry`=""
    + `root`="."
    + `timeout_s`=30

*> _run op="run" entry=`entry` root=`root` timeout_s=`timeout_s`*

## tests
    + `entry`="."
    + `root`="."
    + `timeout_s`=60

*> _run op="tests" entry=`entry` root=`root` timeout_s=`timeout_s`*

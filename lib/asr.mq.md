---
title: lib/asr
description: Cloud ASR via scripts/legacy/asr_transcribe.py (optional proxy.cflmy.top).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import run:lib/run.mq.md
---

## 转写
    + `payload`=None

1. not `payload`
  **bad = > json.parse text={"ok":false,"error":"missing payload"}**
  *bad*

**root = > run.确保目录**
> fs.make_dir path=`root` + "/tmp"
**in_path = `root` + "/tmp/asr_in.json"**
**out_path = `root` + "/tmp/asr_out.json"**
**raw = > json.stringify value=`payload`**
> fs.write_text path=`in_path` text=`raw`
> sys.env_set name="QDAGENT_ASR_IN" value=`in_path`
> sys.env_set name="QDAGENT_ASR_OUT" value=`out_path`
**script = "scripts" + "/legacy" + "/asr_transcribe.py"**
**args = > json.parse text=[]**
**args = > json.append list=`args` item=`script`**
**code = > sys.exec cmd="python3" args=args**
**txt = > fs.read_text path=`out_path`**
**out = > json.parse text=`txt`**
**out = > json.set map=`out` key="exit_code" value=`code`**
*out*

---
title: lib/web_search
description: Web search via scripts/legacy/web_search.py (DDG then Bing CN). Evidence only.
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
---

## search
    + `query`=""
    + `limit`=5

1. not `query`
  *empty = > json.parse text={"ok":true,"provider":"none","hits":[],"hint":"empty query"}*
  **empty**

*out_path = "data" + "/tmp" + "/last_web_search.json"*
> fs.make_dir path="data"
> fs.make_dir path="data/tmp"
*lim_s = "" + `limit`*
> sys.env_set name="QDAGENT_WEB_QUERY" value=`query`
> sys.env_set name="QDAGENT_WEB_LIMIT" value=`lim_s`
> sys.env_set name="QDAGENT_WEB_OUT" value=`out_path`
*script = "scripts" + "/legacy" + "/web_search.py"*
*args = > json.parse text=[]*
*args = > json.append list=`args` item=`script`*
*code = > sys.exec cmd="python3" args=args*
*raw = > fs.read_text path=out_path*
*out = > json.parse text=raw*
*out = > json.set map=out key="exit_code" value=code*
**out**

---
title: lib/kb_git
description: Nested git under data/ via scripts/legacy/kb_git.py (stdout via temp JSON).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import run:lib/run.mq.md
---

## 跑
    + `op`="ensure"
    + `message`=""
    + `rev`=""
    + `limit`="20"

*root = > run.确保目录*
*out_path = `root` + "/tmp/last_kb_git.json"*
> fs.make_dir path=`root` + "/tmp"
> sys.env_set name="QDAGENT_DATA" value=`root`
> sys.env_set name="QDAGENT_KB_GIT_OUT" value=`out_path`
> sys.env_set name="QDAGENT_KB_GIT_MSG" value=`message`
> sys.env_set name="QDAGENT_KB_GIT_REV" value=`rev`
> sys.env_set name="QDAGENT_KB_GIT_LIMIT" value=`limit`
*script = "scripts" + "/legacy" + "/kb_git.py"*
*args = > json.parse text=[]*
*args = > json.append list=`args` item=`script`*
*args = > json.append list=`args` item=`op`*
*code = > sys.exec cmd="python3" args=args*
*raw = > fs.read_text path=out_path*
*out = > json.parse text=raw*
*out = > json.set map=out key="exit_code" value=code*
**out**

## 确保

*out = > 跑 op="ensure"*
**out**

## 提交
    + `message`="chore: knowledge update"

*out = > 跑 op="commit" message=`message`*
**out**

## 日志
    + `limit`="20"

*lim = "" + `limit`*
*out = > 跑 op="log" limit=`lim`*
**out**

## 查看
    + `rev`="HEAD"

*out = > 跑 op="show" rev=`rev`*
**out**

## 回滚
    + `rev`=""

*out = > 跑 op="revert" rev=`rev`*
**out**

## 状态

*out = > 跑 op="status"*
**out**

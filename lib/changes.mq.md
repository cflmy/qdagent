---
title: lib/changes
description: Reviewable change proposals under data/kb/changes (apply via git).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import run:lib/run.mq.md
---

## 跑
    + `op`="list"
    + `id`=""
    + `status`=""
    + `payload_path`=""

*root = > run.确保目录*
*out_path = `root` + "/tmp/last_changes.json"*
> fs.make_dir path=`root` + "/tmp"
> fs.make_dir path=`root` + "/kb/changes"
> sys.env_set name="QDAGENT_DATA" value=`root`
> sys.env_set name="QDAGENT_CHANGES_OUT" value=`out_path`
> sys.env_set name="QDAGENT_CHANGES_ID" value=`id`
> sys.env_set name="QDAGENT_CHANGES_STATUS" value=`status`
> sys.env_set name="QDAGENT_CHANGES_PAYLOAD_FILE" value=`payload_path`
*script = "scripts" + "/legacy" + "/kb_changes.py"*
*args = > json.parse text=[]*
*args = > json.append list=`args` item=`script`*
*args = > json.append list=`args` item=`op`*
*code = > sys.exec cmd="python3" args=args*
*raw = > fs.read_text path=out_path*
*out = > json.parse text=raw*
*out = > json.set map=out key="exit_code" value=code*
**out**

## 提案
    + `payload_path`=""

*out = > 跑 op="propose" payload_path=`payload_path`*
**out**

## 列表
    + `status`=""

*out = > 跑 op="list" status=`status`*
**out**

## 详情
    + `id`=""

*out = > 跑 op="get" id=`id`*
**out**

## 应用
    + `id`=""

*out = > 跑 op="apply" id=`id`*
**out**

## 拒绝
    + `id`=""

*out = > 跑 op="reject" id=`id`*
**out**

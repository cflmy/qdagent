---
title: lib/organize
description: OKF 智能整理 — corpus + settings → scripts/legacy/organize_okf.py → concepts/notes。
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import run:lib/run.mq.md
---

## 确保包
    + `root`=""

1. not `root`
  **root = > run.确保目录**
> fs.make_dir path=`root` + "/kb"
> fs.make_dir path=`root` + "/kb/concepts"
> fs.make_dir path=`root` + "/kb/concepts/notes"
> fs.make_dir path=`root` + "/kb/concepts/areas"
> fs.make_dir path=`root` + "/kb/resources"
> fs.make_dir path=`root` + "/tmp"
*root*

## 跑
    + `op`="organize"
    + `payload`=None

**root = > 确保包**
**in_path = `root` + "/tmp/okf_in.json"**
**out_path = `root` + "/tmp/okf_out.json"**
1. `payload`
  **raw = > json.stringify value=`payload`**
  > fs.write_text path=`in_path` text=`raw`
2. *
  > fs.write_text path=`in_path` text="{}"
> sys.env_set name="QDAGENT_DATA" value=`root`
> sys.env_set name="QDAGENT_OKF_IN" value=`in_path`
> sys.env_set name="QDAGENT_OKF_OUT" value=`out_path`
> sys.env_set name="QDAGENT_OKF_OP" value=`op`
**script = "scripts" + "/legacy" + "/organize_okf.py"**
**args = > json.parse text=[]**
**args = > json.append list=`args` item=`script`**
**args = > json.append list=`args` item=`op`**
**code = > sys.exec cmd="python3" args=args**
**txt = > fs.read_text path=`out_path`**
**out = > json.parse text=`txt`**
**out = > json.set map=`out` key="exit_code" value=`code`**
*out*

## 整理
    + `payload`=None

**out = > 跑 op="organize" payload=`payload`**
*out*

## 列表

**out = > 跑 op="list"**
*out*

## 读取
    + `slug`=""
    + `payload`=None

1. `payload`
  **ps = > json.get value=`payload` key="slug"**
  1. `ps`
    **slug = `ps`**
**req = > json.parse text={}**
**req = > json.set map=`req` key="slug" value=`slug`**
**out = > 跑 op="get" payload=`req`**
*out*

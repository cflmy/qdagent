---
markup: occlusion
title: T14 proposed profile items never injectable
import:
  profile_items: lib/profile_items.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**p = > profile_items.propose text="prefer dark theme" category="preference" scope="user"**
**pok = > json.get value=`p` key="ok"**
1. not `pok`
  > print text=propose-fail
  > print text=`p`
  > sys.exit code=1
**pid = > json.get value=`p` key="id"**

**inj0 = > profile_items.injectable**
**items0 = > json.get value=`inj0` key="items"**
1. `items0`
  - [it](遍历 items0 为 it)
    **iid = > json.get value=`it` key="id"**
    1. `iid` == `pid`
      > print text=proposed-was-injectable
      > sys.exit code=1

**c = > profile_items.set_status id=`pid` status="confirmed"**
**cok = > json.get value=`c` key="ok"**
1. not `cok`
  > print text=confirm-fail
  > print text=`c`
  > sys.exit code=1

**inj1 = > profile_items.injectable**
**found = False**
**items1 = > json.get value=`inj1` key="items"**
1. `items1`
  - [it](遍历 items1 为 it)
    **iid = > json.get value=`it` key="id"**
    1. `iid` == `pid`
      **found = True**
1. not `found`
  > print text=confirmed-not-injectable
  > print text=`inj1`
  > sys.exit code=1

> print text=t14-profile-injectable-ok

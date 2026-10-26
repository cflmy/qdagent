---
markup: occlusion
title: T12 concurrent upload jobs use isolated paths
import:
  workbench: lib/workbench.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**ain = > json.parse text="{\"filename\":\"a.md\",\"content_text\":\"# A\\n\",\"request_id\":\"up-t12-a\",\"workspace_id\":\"ws-default\"}"**
**bin = > json.parse text="{\"filename\":\"b.md\",\"content_text\":\"# B\\n\",\"request_id\":\"up-t12-b\",\"workspace_id\":\"ws-default\"}"**
**a = > workbench.uploads_create payload=`ain`**
**b = > workbench.uploads_create payload=`bin`**
**aok = > json.get value=`a` key="ok"**
**bok = > json.get value=`b` key="ok"**
1. not `aok`
  > print text=upload-a-fail
  > print text=`a`
  > sys.exit code=1
1. not `bok`
  > print text=upload-b-fail
  > print text=`b`
  > sys.exit code=1

**da = > json.get value=`a` key="data"**
**db = > json.get value=`b` key="data"**
**pa = > json.get value=`da` key="stored_path"**
**pb = > json.get value=`db` key="stored_path"**
1. not `pa`
  > print text=path-a-missing
  > sys.exit code=1
1. not `pb`
  > print text=path-b-missing
  > sys.exit code=1
1. `pa` == `pb`
  > print text=paths-not-isolated
  > sys.exit code=1

**iin = > json.parse text="{\"upload_id\":\"up-t12-a\"}"**
**ia = > workbench.imports_start payload=`iin`**
**ida = > json.get value=`ia` key="data"**
**st = > json.get value=`ida` key="status"**
1. `st` == "published"
  > print text=import-auto-published
  > sys.exit code=1

> print text=t12-upload-isolation-ok
> print text=`st`

---
markup: occlusion
title: T13 generation/draft success does not imply published
import:
  workbench: lib/workbench.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**ain = > json.parse text="{\"filename\":\"t13.md\",\"content_text\":\"# draft\\n\",\"request_id\":\"up-t13-fixed\",\"workspace_id\":\"ws-default\"}"**
**a = > workbench.uploads_create payload=`ain`**
**aok = > json.get value=`a` key="ok"**
1. not `aok`
  > print text=upload-fail
  > print text=`a`
  > sys.exit code=1

**iin = > json.parse text="{\"upload_id\":\"up-t13-fixed\"}"**
**ia = > workbench.imports_start payload=`iin`**
**ida = > json.get value=`ia` key="data"**
**st = > json.get value=`ida` key="status"**
1. `st` == "published"
  > print text=auto-published-on-start
  > sys.exit code=1
1. not `st` == "draft_ready"
  1. not `st` == "failed"
    > print text=unexpected-status
    > print text=`st`
    > sys.exit code=1

1. `st` == "draft_ready"
  **pub = > workbench.imports_publish payload=`iin`**
  **pok = > json.get value=`pub` key="ok"**
  1. not `pok`
    > print text=publish-fail
    > print text=`pub`
    > sys.exit code=1
  **pdata = > json.get value=`pub` key="data"**
  **pst = > json.get value=`pdata` key="status"**
  1. not `pst` == "published"
    > print text=publish-status-wrong
    > print text=`pst`
    > sys.exit code=1

> print text=t13-draft-not-published-ok
> print text=`st`

---
markup: occlusion
title: T15 path normalize rejects traversal under workspace root
import:
  workspace: lib/workspace.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**a = > workspace.resolve_path workspace_id="ws-default" path="../../secret"**
**ok = > json.get value=`a` key="ok"**
1. `ok`
  > print text=traversal-ok
  > print text=`a`
  > sys.exit code=1
**code = > json.get value=`a` key="code"**
1. not `code` == "workspace.forbidden"
  > print text=wrong-code
  > print text=`a`
  > sys.exit code=1

> print text=t15-path-normalize-ok

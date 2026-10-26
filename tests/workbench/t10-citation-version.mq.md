---
markup: occlusion
title: T10 missing/renamed knowledge yields version_unavailable not wrong resolve
import:
  workspace: lib/workspace.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**cite = > workspace.resolve_citation citation_id="old-cite" workspace_id="ws-default" document_id="renamed-or-deleted.md" node_id="n-old"**
**ok = > json.get value=`cite` key="ok"**
1. not `ok`
  > print text=envelope-fail
  > sys.exit code=1
**data = > json.get value=`cite` key="data"**
**res = > json.get value=`data` key="resolution"**
1. `res` == "resolved"
  > print text=should-not-resolve-missing
  > sys.exit code=1
1. not `res` == "version_unavailable"
  1. not `res` == "unresolved"
    1. not `res` == "forbidden"
      > print text=unexpected-resolution
      > print text=`res`
      > sys.exit code=1

> print text=t10-citation-version-ok
> print text=`res`

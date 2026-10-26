---
markup: occlusion
title: T09 citation resolve + path authorize
import:
  workspace: lib/workspace.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**trav = > workspace.resolve_path workspace_id="ws-default" path="../etc/passwd"**
**tok = > json.get value=`trav` key="ok"**
1. `tok`
  > print text=traversal-allowed
  > print text=`trav`
  > sys.exit code=1

**cite = > workspace.resolve_citation citation_id="c1" workspace_id="ws-default" document_id="missing-doc.md" node_id="n1"**
**cok = > json.get value=`cite` key="ok"**
1. not `cok`
  > print text=cite-envelope-fail
  > print text=`cite`
  > sys.exit code=1
**data = > json.get value=`cite` key="data"**
**res = > json.get value=`data` key="resolution"**
1. `res` == "resolved"
  > print text=missing-should-not-resolve
  > sys.exit code=1

> print text=t09-citation-resolve-ok
> print text=`res`

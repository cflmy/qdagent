---
markup: occlusion
title: T20 publish creates manifest/CURRENT — not DB-only (R07 / Q-R7)
import:
  workbench: ../../lib/workbench.mq.md
  publication: ../../knowledge/publication.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
  time: lib/time.mq.md
---

# main

**u = > time.now_unix**
**rid = "up-t20-" + `u`**
**body = "# Rule\\n\\nWhen X then Y.\\n\\nReuse existing session store.\\n"**
**ain = > json.parse text="{\"filename\":\"t20-rule.txt\",\"content_text\":\"" + `body` + "\",\"request_id\":\"" + `rid` + "\",\"workspace_id\":\"ws-default\"}"**
**a = > workbench.uploads_create payload=`ain`**
**aok = > json.get value=`a` key="ok"**
1. not `aok`
  > print text=upload-fail
  > print text=`a`
  > sys.exit code=1

**iin = > json.parse text="{\"upload_id\":\"" + `rid` + "\"}"**
**ia = > workbench.imports_start payload=`iin`**
**ida = > json.get value=`ia` key="data"**
**st = > json.get value=`ida` key="status"**
1. `st` == "failed"
  > print text=import-failed-ok-skip-publish
  > print text=`ida`
  > print text=t20-publication-manifest-ok
  > sys.exit code=0
1. not `st` == "draft_ready"
  1. not `st` == "needs_input"
    > print text=unexpected-status
    > print text=`st`
    > sys.exit code=1

1. `st` == "needs_input"
  > print text=needs-input-blocks-fake-publish
  **bad = > workbench.imports_publish payload=`iin`**
  **bok = > json.get value=`bad` key="ok"**
  1. `bok`
    > print text=publish-should-fail-on-needs-input
    > sys.exit code=1
  > print text=t20-publication-manifest-ok
  > sys.exit code=0

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
**man = > json.get value=`pdata` key="publication_manifest"**
1. not `man`
  > print text=missing-manifest
  > print text=`pdata`
  > sys.exit code=1
**exists = > fs.exists path=`man`**
1. not `exists`
  > print text=manifest-file-missing
  > print text=`man`
  > sys.exit code=1
**gen = > json.get value=`pdata` key="publication_generation"**
1. not `gen`
  > print text=missing-generation
  > sys.exit code=1
**cur = > publication.read_generation**
1. not `cur` == `gen`
  > print text=current-mismatch
  > print text=`cur`
  > print text=`gen`
  > sys.exit code=1

> print text=t20-publication-manifest-ok

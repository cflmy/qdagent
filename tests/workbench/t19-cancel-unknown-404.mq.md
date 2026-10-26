---
markup: occlusion
title: T19 unknown turn cancel returns 404 — never creates placeholder (R03 / Q-R2)
import:
  workbench: ../../lib/workbench.mq.md
  turns: ../../execution/turns.mq.md
  db: ../../db/index.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**payload = > json.parse text="{\"turn_id\":\"turn-does-not-exist-t19\"}"**
**ret = > workbench.turns_cancel payload=`payload`**
**ok = > json.get value=`ret` key="ok"**
1. `ok`
  > print text=cancel-should-fail
  > print text=`ret`
  > sys.exit code=1
**err = > json.get value=`ret` key="error"**
**code = > json.get value=`err` key="code"**
1. not `code` == "resource.not_found"
  > print text=wrong-error-code
  > print text=`ret`
  > sys.exit code=1

**store = > db.open**
**row = > `store`.get table="turn_state" id="turn-does-not-exist-t19"**
1. `row`
  > print text=placeholder-created
  > print text=`row`
  > sys.exit code=1

**direct = > turns.cancel turn_id="turn-does-not-exist-t19"**
**dok = > json.get value=`direct` key="ok"**
1. `dok`
  > print text=direct-cancel-should-fail
  > sys.exit code=1

> print text=t19-cancel-unknown-404-ok

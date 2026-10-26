---
markup: occlusion
title: T08 cancel marks turn; interrupted is not completed
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
  time: lib/time.mq.md
---

# main

**u = > time.now_unix**
**rid = "req-t08-" + `u`**
**created = > turns.create request_id=`rid` session_id="sess-t08" model_id="mdl-legacy-default"**
**cok = > json.get value=`created` key="ok"**
1. not `cok`
  > print text=create-fail
  > print text=`created`
  > sys.exit code=1
**tid = > json.get value=`created` key="turn_id"**

**c = > turns.cancel turn_id=`tid`**
**cflag = > json.get value=`c` key="cancel_requested"**
1. not `cflag`
  > print text=cancel-flag-missing
  > print text=`c`
  > sys.exit code=1

**flag = > turns.is_cancelled turn_id=`tid`**
1. not `flag`
  > print text=is-cancelled-false
  > sys.exit code=1

**again = > turns.cancel turn_id=`tid`**
**aok = > json.get value=`again` key="ok"**
1. not `aok`
  > print text=cancel-not-idempotent
  > print text=`again`
  > sys.exit code=1

> print text=t08-cancel-no-retry-ok

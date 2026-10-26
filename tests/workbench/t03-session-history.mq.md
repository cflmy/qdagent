---
markup: occlusion
title: T03 turn create is idempotent on request_id
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  sys: lib/sys.mq.md
---

# main

**u = > time.now_unix**
**rid = "req-t03-" + `u`**
**a = > turns.create request_id=`rid` session_id="sess-t03" model_id="mdl-legacy-default"**
**b = > turns.create request_id=`rid` session_id="sess-t03" model_id="mdl-legacy-default"**
**aok = > json.get value=`a` key="ok"**
**bok = > json.get value=`b` key="ok"**
1. not `aok`
  > print text=a-fail
  > sys.exit code=1
1. not `bok`
  > print text=b-fail
  > sys.exit code=1
**ta = > json.get value=`a` key="turn_id"**
**tb = > json.get value=`b` key="turn_id"**
**reused = > json.get value=`b` key="reused"**
1. not `ta` == `tb`
  > print text=ids-diverged
  > print text=`ta`
  > print text=`tb`
  > sys.exit code=1
1. not `reused`
  > print text=not-reused
  > print text=`b`
  > sys.exit code=1

> print text=t03-session-history-ok

---
markup: occlusion
title: T21 turn snapshot + recover (Q-A3)
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**created = > turns.create session_id="s-smoke" workspace_id="ws-default" model_id="m1" request_id="req-smoke-recover-t21"**
**tid = > json.get value=`created` key="turn_id"**
1. not `tid`
  > print text=create-failed
  > print text=`created`
  > sys.exit code=1
**pl1 = > json.parse text="{\"delta\":\"hello \"}"**
**pl2 = > json.parse text="{\"delta\":\"world\"}"**
> turns.append_event turn_id=`tid` type="message.delta" payload=`pl1`
> turns.append_event turn_id=`tid` type="message.delta" payload=`pl2`
> turns.complete turn_id=`tid` state="interrupted"
**got = > turns.get turn_id=`tid`**
**snap = > json.get value=`got` key="message_snapshot"**
1. not `snap` == "hello world"
  > print text=bad-snapshot
  > print text=`got`
  > sys.exit code=1
**turn = > json.get value=`got` key="turn"**
**revision = > json.get value=`turn` key="revision"**
**rec = > turns.recover turn_id=`tid` action="reconnect" expected_revision=`revision`**
**rok = > json.get value=`rec` key="ok"**
**allow = > json.get value=`rec` key="allow_run"**
1. not `rok`
  > print text=reconnect-failed
  > print text=`rec`
  > sys.exit code=1
1. `allow`
  > print text=reconnect-must-not-allow-run
  > print text=`rec`
  > sys.exit code=1
**cont = > turns.recover turn_id=`tid` action="continue" expected_revision=`revision` idempotency_key="idem-smoke-t21"**
**cok = > json.get value=`cont` key="ok"**
**child = > json.get value=`cont` key="turn_id"**
1. not `cok`
  > print text=continue-failed
  > print text=`cont`
  > sys.exit code=1
1. not `child`
  > print text=missing-child
  > print text=`cont`
  > sys.exit code=1
**deny = > turns.recover turn_id=`tid` action="continue" expected_revision=999999**
**dok = > json.get value=`deny` key="ok"**
**dcode = > json.get value=`deny` key="code"**
1. `dok`
  > print text=cas-should-fail
  > print text=`deny`
  > sys.exit code=1
1. not `dcode` == "revision.conflict"
  > print text=wrong-cas-code
  > print text=`deny`
  > sys.exit code=1
> print text=t21-ok
> print text=`snap`
> print text=`child`

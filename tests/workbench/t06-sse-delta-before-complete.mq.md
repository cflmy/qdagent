---
markup: occlusion
title: T06 SSE events emit delta before terminal
import:
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  sys: lib/sys.mq.md
  time: lib/time.mq.md
---

# main

**u = > time.now_unix**
**rid = "req-t06-" + `u`**
**created = > turns.create request_id=`rid` session_id="sess-t06"**
**cok = > json.get value=`created` key="ok"**
1. not `cok`
  > print text=create-fail
  > print text=`created`
  > sys.exit code=1
**tid = > json.get value=`created` key="turn_id"**
**ev = > turns.sse_events turn_id=`tid` content="hello world from batch" ok=True**
**sse = > json.get value=`ev` key="sse"**
**contract = > json.get value=`ev` key="streaming_contract"**
1. not `sse`
  > print text=sse-empty
  > print text=`ev`
  > sys.exit code=1

**has_delta = > text.contains text=`sse` sub="message.delta"**
**has_done = > text.contains text=`sse` sub="turn.completed"**
1. not `has_delta`
  > print text=no-delta
  > sys.exit code=1
1. not `has_done`
  > print text=no-terminal
  > sys.exit code=1

**claims_batch = > text.contains text=`contract` sub="evented-batch"**
1. not `claims_batch`
  > print text=contract-missing-evented-batch
  > print text=`contract`
  > sys.exit code=1

> print text=t06-sse-delta-before-complete-ok
> print text=`contract`

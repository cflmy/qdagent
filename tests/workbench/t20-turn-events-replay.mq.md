---
markup: occlusion
title: t20 turn events append + replay
description: T-E1 — append_event persists; events after_seq matches; cancel unknown 404.
import:
  db: ../../db/index.mq.md
  turns: ../../execution/turns.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
---

# main

**store = > db.initialize**
**created = > turns.create session_id="s-t20" workspace_id="ws-default" model_id="m" payload=None**
**tid = > json.get value=`created` key="turn_id"**
**okc = > json.get value=`created` key="ok"**
1. not `okc`
  > print text="FAIL create"
  *False*

**a1 = > turns.append_event turn_id=`tid` type="turn.started" publish=False**
**a2 = > turns.append_event turn_id=`tid` type="message.delta" payload=None publish=False**
**seq2 = > json.get value=`a2` key="seq"**
1. not `seq2` == 2
  > print text="FAIL seq"
  *False*

**got = > turns.get turn_id=`tid`**
**turn = > json.get value=`got` key="turn"**
**les = > json.get value=`turn` key="last_event_seq"**
1. not `les` == 2
  > print text="FAIL last_event_seq"
  *False*

**ev = > turns.events turn_id=`tid` after_seq=1 stream=False**
**sse = > json.get value=`ev` key="sse"**
**has = > text.contains text=`sse` sub="message.delta"**
1. not `has`
  > print text="FAIL replay"
  *False*

**nf = > turns.cancel turn_id="turn-does-not-exist-t20"**
**nok = > json.get value=`nf` key="ok"**
1. `nok`
  > print text="FAIL cancel unknown"
  *False*

> print text="PASS t20-turn-events-replay"
*True*

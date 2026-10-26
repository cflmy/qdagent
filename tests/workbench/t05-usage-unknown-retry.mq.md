---
markup: occlusion
title: T05 usage unknown / retry attempts / never fake zero
import:
  usage: ../../execution/usage.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**u1 = > usage.record call_id="call-t05" attempt_id="1" run_id="run-t05" session_id="sess-t05" purpose="answer" status="failed" usage_state="unknown" measurement_source="provider_omitted" revision=1**
**ok1 = > json.get value=`u1` key="ok"**
1. not `ok1`
  > print text=record1-fail
  > print text=`u1`
  > sys.exit code=1

**u2 = > usage.record call_id="call-t05" attempt_id="2" run_id="run-t05" session_id="sess-t05" purpose="answer" status="completed" input_tokens=10 output_tokens=5 total_tokens=15 usage_state="final" measurement_source="provider_usage" revision=1**
**ok2 = > json.get value=`u2` key="ok"**
1. not `ok2`
  > print text=record2-fail
  > print text=`u2`
  > sys.exit code=1

**q = > usage.query session_id="sess-t05" limit=10**
**qok = > json.get value=`q` key="ok"**
1. not `qok`
  > print text=query-fail
  > print text=`q`
  > sys.exit code=1

**summary = > json.get value=`q` key="summary"**
**unknown_n = > json.get value=`summary` key="unknown_calls"**
**known = > json.get value=`summary` key="known_total_tokens"**
1. `known` == 0
  1. `unknown_n` > 0
    > print text=ok-partial
2. *
  1. not `known` == 15
    > print text=known-tokens-wrong
    > print text=`known`
    > sys.exit code=1

**row_u = > json.parse text="{\"usage_state\":\"unknown\",\"total_tokens\":null}"**
**disp = > usage.format_row row=`row_u`**
**sum = > json.get value=`disp` key="summary"**
**forbid = > json.get value=`disp` key="forbid_zero"**
1. not `forbid`
  > print text=forbid-zero-missing
  > sys.exit code=1
1. `sum` == "0 tokens"
  > print text=unknown-rendered-as-zero
  > sys.exit code=1

**ao = > json.parse text="{\"status\":\"ok\",\"token_cost\":0.012}"**
**noprice = > usage.record_from_agent agent_out=`ao` run_id="run-t05-price" session_id="sess-t05" purpose="answer"**
**st = > json.get value=`noprice` key="usage_state"**
**tt = > json.get value=`noprice` key="total_tokens"**
1. `st` == "final"
  1. `tt` == 0
    > print text=token-cost-coerced-to-zero
    > sys.exit code=1

> print text=t05-usage-unknown-retry-ok

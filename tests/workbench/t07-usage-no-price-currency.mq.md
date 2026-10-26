---
markup: occlusion
title: T07 token_cost is not currency and not fake zero tokens
import:
  usage: ../../execution/usage.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**ao = > json.parse text="{\"status\":\"ok\",\"token_cost\":1.25}"**
**r = > usage.record_from_agent agent_out=`ao` run_id="run-t07" session_id="sess-t07" purpose="answer"**
**st = > json.get value=`r` key="usage_state"**
**tt = > json.get value=`r` key="total_tokens"**
**src = > json.get value=`r` key="measurement_source"**
1. `st` == "final"
  1. `tt` == 0
    > print text=cost-became-zero-tokens
    > sys.exit code=1
1. `tt` == 0
  > print text=null-coerced-to-zero
  > sys.exit code=1
1. `tt` == 1
  > print text=cost-misread-as-tokens
  > sys.exit code=1

**disp = > usage.format_row row=`r`**
**sum = > json.get value=`disp` key="summary"**
**forbid = > json.get value=`disp` key="forbid_zero"**
1. `sum` == "0 tokens"
  > print text=display-zero
  > sys.exit code=1
1. not `forbid`
  1. `st` == "unknown"
    > print text=ok

> print text=t07-usage-no-price-currency-ok
> print text=`st`
> print text=`src`

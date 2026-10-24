---
markup: occlusion
title: S0 promote-negative — dry/gated must not auto-promote
description: >-
  Product rule: promote_allowed requires live mode + docgate ok + verify.
  This offline fixture exercises verify.run with l1_ok=False (dry/error path)
  and asserts promote_allowed is false.
import:
  verify: ../../execution/verify.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
---

# main

**v = > verify.run root="." out=".marqdo" l1_ok=False**
**pa = access(v, "promote_allowed")**
1. `pa` == False
  > print text=l1-false-blocks-promote
2. *
  > print text=l1-false-FAIL
  > print text=`v`
  > sys.exit code=1

> print text=s0-promote-negative-ok
*"s0-promote-negative-ok"*

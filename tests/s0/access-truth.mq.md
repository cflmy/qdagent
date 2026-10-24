---
markup: occlusion
title: S0 access-truth — ok=false must not be masked by map truthiness
description: >-
  Under Occlusion, reading a gate map via classic [ok](map) yields the whole
  map (truthy). Product code must use access(map, "ok"). This fixture proves
  the negative branch fires when ok=False.
import:
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

`gate` =

| ok | status | error |
|----|--------|-------|
| False | denied | proof |

**field = access(gate, "ok")**
1. `field` == False
  > print text=access-ok-is-false
2. *
  > print text=access-ok-FAIL
  > print text=`field`
  > sys.exit code=1

1. not `field`
  > print text=not-field-branch-ok
2. *
  > print text=not-field-branch-FAIL
  > sys.exit code=1

Whole map remains truthy — product must never branch on the map itself.

1. `gate`
  > print text=map-is-truthy-as-expected
2. *
  > print text=map-truthy-FAIL
  > sys.exit code=1

> print text=s0-access-truth-ok
*"s0-access-truth-ok"*

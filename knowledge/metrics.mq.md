---
title: knowledge/metrics
description: >-
  Engineering KPI surface — reads Marqdo reuse_metrics.json (no second metrics store).
import fs:lib/fs.mq.md
import json:lib/json.mq.md
import sys:lib/sys.mq.md
---

## path
    + `out`=".marqdo"

*`out` + "/agent/episodes/reuse_metrics.json"*

## read
    + `out`=".marqdo"

**p = > path out=`out`**
**exists = > fs.exists path=`p`**
1. not `exists`
  `empty` =

  | ok | reuse_ratio | adapt_ratio | novel_ratio | duplication_rate | note |
  |----|-------------|-------------|-------------|------------------|------|
  | True | 0 | 0 | 0 | 0 | missing_metrics |

  *empty*
**raw = > fs.read_text path=`p`**
**m = > json.parse text=`raw`**
**reuse = > json.get value=`m` key="reuse_ratio"**
**adapt = > json.get value=`m` key="adapt_ratio"**
**novel = > json.get value=`m` key="novel_ratio"**
**dup = > json.get value=`m` key="duplication_rate"**
`out` =

| ok | reuse_ratio | adapt_ratio | novel_ratio | duplication_rate | raw |
|----|-------------|-------------|-------------|------------------|-----|
| True | `reuse` | `adapt` | `novel` | `dup` | `m` |

*out*

---
title: knowledge/metrics
description: >-
  Engineering KPI surface — reads Marqdo reuse_metrics.json (no second metrics store).
import fs:lib/fs.mq.md
import json:lib/json.mq.md
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
**reused = > json.get value=`m` key="reused"**
**adapted = > json.get value=`m` key="adapted"**
**created = > json.get value=`m` key="created"**
`out` =

| ok | reuse_ratio | adapt_ratio | novel_ratio | duplication_rate | reused | adapted | created | raw |
|----|-------------|-------------|-------------|------------------|--------|---------|---------|-----|
| True | `reuse` | `adapt` | `novel` | `dup` | `reused` | `adapted` | `created` | `m` |

*out*

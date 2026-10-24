---
markup: occlusion
title: knowledge/metrics
description: >-
  Engineering KPI surface — reads Marqdo reuse_metrics.json (no second metrics store).
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  ctx: context.mq.md
  amort: ./amortization.mq.md
---

## path
    + `out`=".marqdo"
    + `root`="."

**out = > ctx.resolve_out out=`out` root=`root`**
*`out` + "/agent/episodes/reuse_metrics.json"*

## read
    + `out`=".marqdo"
    + `root`="."

Reasoning Amortization is computed from `data/amortization.json` (Execution
truth), independent of whether `.marqdo/.../reuse_metrics.json` exists yet — so
it is fetched once up front and surfaced in both the missing-metrics and the
populated branches.

**ra = > amort.read root=`root`**
**ra_val = > json.get value=`ra` key="ra"**
**ra_amortized = > json.get value=`ra` key="amortized_kinds"**
**ra_measured = > json.get value=`ra` key="measured_kinds"**
**ra_total = > json.get value=`ra` key="total_kinds"**
**ra_baseline = > json.get value=`ra` key="baseline_weight"**
**ra_recent = > json.get value=`ra` key="recent_weight"**
**p = > path out=`out` root=`root`**
**exists = > fs.exists path=`p`**
1. not `exists`
  `empty` =

  | ok | reuse_ratio | adapt_ratio | novel_ratio | duplication_rate | note | ra | ra_amortized | ra_measured | ra_total | ra_baseline | ra_recent |
  |----|-------------|-------------|-------------|------------------|------|-----|--------------|-------------|----------|-------------|-----------|
  | True | 0 | 0 | 0 | 0 | missing_metrics | `ra_val` | `ra_amortized` | `ra_measured` | `ra_total` | `ra_baseline` | `ra_recent` |

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
**token_cost = > json.get value=`m` key="token_cost"**
**llm_calls = > json.get value=`m` key="llm_calls"**
1. not `token_cost`
  **token_cost = 0**
1. not `llm_calls`
  **llm_calls = 0**
`ret` =

| ok | reuse_ratio | adapt_ratio | novel_ratio | duplication_rate | reused | adapted | created | token_cost | llm_calls | ra | ra_amortized | ra_measured | ra_total | ra_baseline | ra_recent | raw |
|----|-------------|-------------|-------------|------------------|--------|---------|---------|------------|-----------|-----|--------------|-------------|----------|-------------|-----------|-----|
| True | `reuse` | `adapt` | `novel` | `dup` | `reused` | `adapted` | `created` | `token_cost` | `llm_calls` | `ra_val` | `ra_amortized` | `ra_measured` | `ra_total` | `ra_baseline` | `ra_recent` | `m` |

*ret*

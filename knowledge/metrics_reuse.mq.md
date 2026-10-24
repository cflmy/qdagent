---
markup: occlusion
title: knowledge/metrics_reuse
description: >-
  S4: real reuse metrics — actual_reuse hits, mis-promote proxies, never
  estimate zero-cost from REUSE decision scores alone.
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  ctx: context.mq.md
---

## path
    + `root`="."

**out = > ctx.resolve_out out=".marqdo" root=`root`**
*`out` + "/reuse-metrics.json"*

## read
    + `root`="."

**p = > path root=`root`**
**exists = > fs.exists path=`p`**
1. not `exists`
  `empty` =

  | actual_reuse_hits | bind_attempts | mispromote_blocks | token_rounds | stale_invalidations |
  |-------------------|---------------|-------------------|--------------|---------------------|
  | 0 | 0 | 0 | 0 | 0 |

  *empty*
**raw = > fs.read_text path=`p`**
**m = > json.parse text=`raw`**
*m*

## record_bind
    + `root`="."
    + `actual_reuse`=False

**m = > read root=`root`**
**hits = > json.get value=`m` key="actual_reuse_hits"**
**attempts = > json.get value=`m` key="bind_attempts"**
1. not `hits`
  **hits = 0**
1. not `attempts`
  **attempts = 0**
**attempts = `attempts` + 1**
1. `actual_reuse`
  **hits = `hits` + 1**
**m = > table.put in=`m` at="actual_reuse_hits" value=`hits`**
**m = > table.put in=`m` at="bind_attempts" value=`attempts`**
**p = > path root=`root`**
**raw = > json.stringify value=`m`**
> fs.write_text path=`p` text=`raw`
*m*

## record_mispromote_block
    + `root`="."

**m = > read root=`root`**
**n = > json.get value=`m` key="mispromote_blocks"**
1. not `n`
  **n = 0**
**n = `n` + 1**
**m = > table.put in=`m` at="mispromote_blocks" value=`n`**
**p = > path root=`root`**
**raw = > json.stringify value=`m`**
> fs.write_text path=`p` text=`raw`
*m*

## gate_report
    + `root`="."
    + `min_hit_rate`=0.0

CI-friendly gate: hit_rate = actual_reuse_hits / max(bind_attempts,1).
Does not treat EFI REUSE decision as a hit.

**m = > read root=`root`**
**hits = > json.get value=`m` key="actual_reuse_hits"**
**attempts = > json.get value=`m` key="bind_attempts"**
1. not `hits`
  **hits = 0**
1. not `attempts`
  **attempts = 0**
**rate = 0**
1. `attempts` > 0
  **rate = `hits` / `attempts`**
**ok = True**
1. `rate` < `min_hit_rate`
  **ok = False**
`out` =

| ok | hit_rate | actual_reuse_hits | bind_attempts | metrics |
|----|----------|-------------------|---------------|---------|
| `ok` | `rate` | `hits` | `attempts` | `m` |

*out*

---
markup: occlusion
title: knowledge/amortization
description: >-
  Reasoning Amortization (RA) — the cross-run KPI proving compiled engineering
  knowledge lets the agent reason cheaper on repeat task-kinds (design §85:
  "qdagent 最重要的性能指标不是 Token，而是 Reasoning Amortization"). Marqdo owns
  the agent runtime + per-run reuse_metrics; qdagent owns Learning, so the
  PER-KIND temporal amortization lives here. No second metrics store: it reads
  Marqdo's decision signal — REUSE hits compiled knowledge (router emits
  llm_free ≈ 0 cost), ADAPT ≈ 0.5, CREATE needs full LLM reasoning ≈ 1 — and
  tracks first-vs-subsequent cost per task-kind in data/amortization.json.
  Forward-compatible: if a run outcome ever carries real llm_calls/token_cost,
  prefer those over the decision proxy.
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  math: lib/math.mq.md
  time: lib/time.mq.md
  ctx: ./context.mq.md
---

## resolve_root
    + `root`="."

**r = > ctx.resolve_root root=`root`**
*r*

## store_path
    + `root`="."

Runtime-observed baseline store — cross-run accumulation, so it lives under
`data/` (Execution truth), NOT the GENERATED `.marqdo/` projection. Gitignored.

**root = > resolve_root root=`root`**
*`root` + "/data/amortization.json"*

## classify
    + `task`

Stable task-kind key: lowercase, trim, collapse internal whitespace to a single
space. Exact normalized match = same kind ("doing THIS task again should be
cheaper"). Deterministic; works for CJK (no internal spaces) and Latin alike.

**lower = > text.to_lower text=`task`**
**parts = > text.str_split s=`lower` sep=" "**
**acc = > table.empty_list**
- [p](遍历 parts 为 p)
  1. `p`
    **acc = > table.append list=`acc` item=`p`**
*> text.str_join xs=`acc` sep=" "*

## weight
    + `decision`

Reasoning weight of a decision — matches the adaptive router's own needs_llm
semantics (the router emits llm_free on a REUSE policy/OKF hit): REUSE ≈ 0
(compiled knowledge hit, no LLM reasoning), ADAPT ≈ 0.5 (partial), CREATE ≈ 1
(full exploration).

1. `decision` == "REUSE"
  *0*
2. `decision` == "CREATE"
  *1*
*0.5*

## load
    + `root`="."

Load the kind store (a JSON list of flat records); empty list if absent.

**p = > store_path root=`root`**
**has = > fs.exists path=`p`**
1. not `has`
  **empty = > table.empty_list**
  *empty*
**raw = > fs.read_text path=`p`**
*> json.parse text=`raw`*

## save
    + `root`="."
    + `store`

**p = > store_path root=`root`**
**s = > json.stringify value=`store`**
> fs.write_text path=`p` text=`s`
*"ok"*

## find_kind
    + `store`
    + `kind`

Index of the record whose kind matches, else -1. Kinds are unique, so the last
match wins (there is at most one).

**n = > table.len xs=`store`**
**found = -1**
**i = 0**
- `i` < `n`
  **rec = > table.at xs=`store` i=`i`**
  **k = > json.get value=`rec` key="kind"**
  1. `k` == `kind`
    **found = `i`**
  **i = `i` + 1**
*found*

## record
    + `task`
    + `decision`
    + `root`="."

Observe one task-kind outcome. First occurrence fixes the baseline weight;
later occurrences accumulate into subsequent_sum so the recent average can be
compared against it. Idempotent-safe: calling twice with the same decision just
adds two observations.

**kind = > classify task=`task`**
**w = > weight decision=`decision`**
**store = > load root=`root`**
**idx = > find_kind store=`store` kind=`kind`**
**now = > time.now_unix**
1. `idx` >= 0
  **rec = > table.at xs=`store` i=`idx`**
  **sub_count = > json.get value=`rec` key="subsequent_count"**
  **sub_sum = > json.get value=`rec` key="subsequent_sum"**
  **count = > json.get value=`rec` key="count"**
  **sub_count = `sub_count` + 1**
  **sub_sum = `sub_sum` + `w`**
  **count = `count` + 1**
  **rec = > table.put in=`rec` at="subsequent_count" value=`sub_count`**
  **rec = > table.put in=`rec` at="subsequent_sum" value=`sub_sum`**
  **rec = > table.put in=`rec` at="count" value=`count`**
  **rec = > table.put in=`rec` at="last_decision" value=`decision`**
  **rec = > table.put in=`rec` at="last_at" value=`now`**
  **store = > table.set_at list=`store` index=`idx` item=`rec`**
2. *
  **rec = > table.empty_map**
  **rec = > table.put in=`rec` at="kind" value=`kind`**
  **rec = > table.put in=`rec` at="first_weight" value=`w`**
  **rec = > table.put in=`rec` at="first_at" value=`now`**
  **rec = > table.put in=`rec` at="subsequent_count" value=0**
  **rec = > table.put in=`rec` at="subsequent_sum" value=0**
  **rec = > table.put in=`rec` at="count" value=1**
  **rec = > table.put in=`rec` at="last_decision" value=`decision`**
  **rec = > table.put in=`rec` at="last_at" value=`now`**
  **store = > table.append list=`store` item=`rec`**
> save root=`root` store=`store`
`out` =

| ok | kind | decision | weight | store_size |
|----|------|----------|-------:|-----------:|
| True | `kind` | `decision` | `w` | > table.len xs=`store` |

*out*

## read
    + `root`="."

Compute Reasoning Amortization. Per kind: ra = first_weight / recent_avg, where
recent_avg = subsequent_sum / subsequent_count (mean cost of all later tasks of
that kind). Aggregate over kinds seen ≥ 2 times (a single occurrence cannot show
amortization): ra = baseline_weight / recent_weight. recent_weight == 0 means
fully amortized (every later task hit compiled knowledge) — the goal state; ra
is then null (ratio undefined) and the components carry the meaning.

**store = > load root=`root`**
**total = > table.len xs=`store`**
**baseline_weight = 0**
**recent_weight = 0**
**measured_kinds = 0**
**amortized_kinds = 0**
**learning_kinds = 0**
**per_kind = > table.empty_list**
- [rec](遍历 store 为 rec)
  **kind = > json.get value=`rec` key="kind"**
  **first_w = > json.get value=`rec` key="first_weight"**
  **sub_count = > json.get value=`rec` key="subsequent_count"**
  **sub_sum = > json.get value=`rec` key="subsequent_sum"**
  **count = > json.get value=`rec` key="count"**
  **last_dec = > json.get value=`rec` key="last_decision"**
  **recent_avg = 0**
  **ra_kind = None**
  1. `sub_count` > 0
    **recent_avg = > math.div a=`sub_sum` b=`sub_count`**
    **measured_kinds = `measured_kinds` + 1**
    **baseline_weight = `baseline_weight` + `first_w`**
    1. `recent_avg` > 0
      **ra_kind = > math.div a=`first_w` b=`recent_avg`**
      **recent_weight = `recent_weight` + `recent_avg`**
    2. *
      **amortized_kinds = `amortized_kinds` + 1**
  2. *
    **learning_kinds = `learning_kinds` + 1**
  `row` =

  | kind | first_weight | recent_avg | count | ra | last_decision |
  |------|-------------:|-----------:|------:|----|---------------|
  | `kind` | `first_w` | `recent_avg` | `count` | `ra_kind` | `last_dec` |

  **per_kind = > table.append list=`per_kind` item=`row`**
**ra = None**
1. `recent_weight` > 0
  **ra = > math.div a=`baseline_weight` b=`recent_weight`**
`out` =

| ok | ra | baseline_weight | recent_weight | measured_kinds | amortized_kinds | learning_kinds | total_kinds |
|----|----|----------------:|--------------:|---------------:|----------------:|---------------:|------------:|
| True | `ra` | `baseline_weight` | `recent_weight` | `measured_kinds` | `amortized_kinds` | `learning_kinds` | `total` |

*out*

---
markup: occlusion
title: knowledge/debt
description: >-
  Engineering debt surface — the M8 debt ratchet (CI/local gate) and the M9
  pending-label list. Marqdo owns `labels`; this module only shells out and
  shapes the result (no second word list, no second gate).
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  ctx: ./context.mq.md
---

## resolve_root
    + `root`="."

**r = > ctx.resolve_root root=`root`**
*r*

## resolve_baseline
    + `root`="."
    + `baseline`=None

Default baseline lives under the GENERATED `.marqdo/` projection
(`labels-baseline.json`) — CI seeds it on first run; local `qdagent labels`
reuses the same ledger so the floor stays consistent across machines.

1. `baseline`
  *baseline*
**root = > resolve_root root=`root`**
*`root` + "/.marqdo/labels-baseline.json"*

## ratchet
    + `root`="."
    + `baseline`=None

M8 debt ratchet — debt may shrink, never grow. Wraps
`marqdo labels <root> --baseline <file> --fail-on-increase` and returns the
exit code + last line so the CLI can propagate failure without parsing prose.

**root = > resolve_root root=`root`**
**ledger = > resolve_baseline root=`root` baseline=`baseline`**
> sys.env_set name="QDAGENT_DEBT_ROOT" value=`root`
> sys.env_set name="QDAGENT_DEBT_LEDGER" value=`ledger`
`args` =

| a |
|---|
| "-c" |
| marqdo labels "$QDAGENT_DEBT_ROOT" --baseline "$QDAGENT_DEBT_LEDGER" --fail-on-increase |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
**lines = > text.str_split s=`stdout` sep="\n"**
**n = > len value=`lines`**
**last = ""**
1. `n` > 0
  **idx = `n` - 1**
  **last = > at value=`lines` index=`idx`**
`out` =

| ok | exit_code | baseline | message |
|----|----------:|---------|---------|
| (`code` == 0) | `code` | `ledger` | `last` |

*out*

## pending
    + `root`="."

M9 pending-label rows (built-in 待开发 words + explicit `[描述]()` stubs).
Delegates to the same `marqdo labels --json` scan the Preflight Context Pack
uses — one source of truth.

**root = > resolve_root root=`root`**
> sys.env_set name="QDAGENT_LABELS_ROOT" value=`root`
**mq = > sys.env_get name="MARQDO_BIN"**
1. not `mq`
  **mq = "marqdo"**
**cmd = "\"" + `mq` + "\" labels \"$QDAGENT_LABELS_ROOT\" --json"**
`args` =

| a |
|---|
| "-c" |
| `cmd` |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
**rows = > table.empty_list**
1. `code` == 0
  1. `stdout`
    **rows = > json.parse text=`stdout`**
  2. *
    **_ = 1**
2. *
  **_ = 1**
**n = > len value=`rows`**
`out` =

| ok | count | rows |
|----|------:|------|
| True | `n` | `rows` |

*out*

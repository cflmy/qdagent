---
title: knowledge/resolver
description: >-
  Resolve engineering candidates via Marqdo find/reuse — no second EKC.
  Capability detail + thin graph CLI (impact/conflicts/stale/duplicate).
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import fs:lib/fs.mq.md
import text:lib/text.mq.md
import re:lib/re.mq.md
import table:lib/table.mq.md
import ctx:context.mq.md
---

## find
    + `query`
    + `root`="."
    + `out`=".marqdo"
    + `limit`=20

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*

> sys.env_set name="QDAGENT_QUERY" value=`query`
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
**limit_s = "" + `limit`**
> sys.env_set name="QDAGENT_FIND_LIMIT" value=`limit_s`
`args` =

| a |
|---|
| "-c" |
| marqdo find "$QDAGENT_QUERY" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --limit "$QDAGENT_FIND_LIMIT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*

**hits = > json.parse text=`stdout`**
`result` =

| ok | hits |
|----|------|
| True | `hits` |

*result*

## reuse
    + `task`
    + `root`="."
    + `out`=".marqdo"

REUSE / ADAPT / CREATE via Marqdo reuse (+ context pack).

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*

> sys.env_set name="QDAGENT_TASK" value=`task`
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
`args` =

| a |
|---|
| "-c" |
| marqdo reuse --preflight --json "$QDAGENT_TASK" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*

**body = > json.parse text=`stdout`**
**decision = > json.get value=`body` key="decision"**
**allowed = > json.get value=`body` key="create_allowed"**
`result` =

| ok | decision | create_allowed | reuse |
|----|----------|----------------|-------|
| True | `decision` | `allowed` | `body` |

*result*

## normalize_id
    + `id`

Strip `capability:` prefix from find-hit ids.

**has = > text.starts_with text=`id` prefix="capability:"**
1. `has`
  **parts = > split value=`id` sep="capability:"**
  **rest = > at value=`parts` index=1**
  *rest*
*id*

## section_bullets
    + `body`
    + `heading`

Extract markdown bullets under a `## heading` until the next `##`.
Symbol path via regex (avoids backtick literals in source).

**marker = "## " + `heading`**
**parts = > text.str_split s=`body` sep=`marker`**
**n = > len value=`parts`**
1. `n` < 2
  **empty = > table.empty_list**
  *empty*
**tail = > at value=`parts` index=1**
**chunks = > text.str_split s=`tail` sep="## "**
**sec = > at value=`chunks` index=0**
**lines = > text.str_split s=`sec` sep="\n"**
**acc = > table.empty_list**
- [line](lines)
  **trim = > text.str_trim s=`line`**
  **bullet = > text.starts_with text=`trim` prefix="- "**
  1. `bullet`
    **none = > text.contains text=`trim` sub="_None"**
    1. not `none`
      **item = > re.find text=`trim` pattern="[A-Za-z_][A-Za-z0-9_./:\-]*"**
      1. `item`
        **acc = > table.append list=`acc` item=`item`**
*acc*

## knowledge_for
    + `kind`
    + `id`
    + `out`=".marqdo"

List projected knowledge files under `.marqdo/knowledge/<kind>` whose frontmatter
`capability:` matches (exact or substring) the capability id.

**dir = `out` + "/knowledge/" + `kind`**
**exists = > fs.exists path=`dir`**
1. not `exists`
  **none = > table.empty_list**
  *none*
**names = > fs.list_dir path=`dir`**
**acc = > table.empty_list**
**needle = "capability: " + `id`**
- [name](names)
  **parts = > split value=`name` sep=".md"**
  **n = > len value=`parts`**
  1. `n` == 2
    **path = `dir` + "/" + `name`**
    **raw = > fs.read_text path=`path`**
    **hit = > text.contains text=`raw` sub=`needle`**
    1. `hit`
      **slug_parts = > split value=`name` sep=".md"**
      **slug = > at value=`slug_parts` index=0**
      `row` =

      | slug | path | kind |
      |------|------|------|
      | `slug` | `path` | `kind` |

      **acc = > table.append list=`acc` item=`row`**
*acc*

## capability
    + `id`
    + `root`="."
    + `out`=".marqdo"

Read-only Capability detail from EKC catalog (+ linked constraints / failures).

1. not `id`
  `fail` =

  | ok | error |
  |----|-------|
  | False | id_required |

  *fail*
**id = > normalize_id id=`id`**
**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*
**out = > ctx.resolve_out out=`out` root=`root`**
**path = `out` + "/catalog/capabilities/" + `id` + ".md"**
**has = > fs.exists path=`path`**
1. not `has`
  `miss` =

  | ok | error | id |
  |----|-------|----|
  | False | not_found | `id` |

  *miss*
**body = > fs.read_text path=`path`**
**implemented = > section_bullets body=`body` heading="Implemented by"**
**duplicates = > section_bullets body=`body` heading="Possible duplicates"**
**constraints = > knowledge_for kind="constraints" id=`id` out=`out`**
**failures = > knowledge_for kind="failures" id=`id` out=`out`**
`ret` =

| ok | id | path | catalog | implemented_by | possible_duplicates | constraints | failures |
|----|----|------|---------|----------------|---------------------|-------------|----------|
| True | `id` | `path` | `body` | `implemented` | `duplicates` | `constraints` | `failures` |

*ret*

## impact
    + `paths`=""
    + `root`="."
    + `out`=".marqdo"

Thin wrap: `marqdo impact … --json`.

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_IMPACT_PATHS" value=`paths`
`args` =

| a |
|---|
| "-c" |
| marqdo impact $QDAGENT_IMPACT_PATHS --root "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error |
  |----|-------|
  | False | `err` |

  *fail*
**body = > json.parse text=`stdout`**
`result` =

| ok | impact |
|----|--------|
| True | `body` |

*result*

## conflicts
    + `root`="."
    + `out`=".marqdo"

*> _graph_cmd cmd="conflicts" root=`root` out=`out`*

## stale
    + `root`="."
    + `out`=".marqdo"

*> _graph_cmd cmd="stale" root=`root` out=`out`*

## duplicate
    + `root`="."
    + `out`=".marqdo"

*> _graph_cmd cmd="duplicate" root=`root` out=`out`*

## _graph_cmd
    + `cmd`
    + `root`="."
    + `out`=".marqdo"

Shared thin wrap for `marqdo conflicts|stale|duplicate --json`.

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_GRAPH_CMD" value=`cmd`
`args` =

| a |
|---|
| "-c" |
| marqdo "$QDAGENT_GRAPH_CMD" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
1. `code` != 0
  **err = [stderr](proc)**
  `fail` =

  | ok | error | cmd |
  |----|-------|-----|
  | False | `err` | `cmd` |

  *fail*
**body = > json.parse text=`stdout`**
`result` =

| ok | cmd | report |
|----|-----|--------|
| True | `cmd` | `body` |

*result*

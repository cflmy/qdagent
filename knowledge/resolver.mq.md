---
markup: occlusion
title: knowledge/resolver
description: >-
  Resolve engineering candidates via Marqdo find/reuse — no second EKC.
  Capability detail + thin graph CLI (impact/conflicts/stale/duplicate).
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  table: lib/table.mq.md
  ctx: context.mq.md
---

## find
    + `query`
    + `root`="."
    + `out`=".marqdo"
    + `limit`=20

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](access(gate, "ok"))**
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
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
1. `code` != 0
  **err = [stderr](access(proc, "stderr"))**
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
**ok = [ok](access(gate, "ok"))**
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
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
1. `code` != 0
  **err = [stderr](access(proc, "stderr"))**
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
- [line](遍历 lines 为 line)
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
- [name](遍历 names 为 name)
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
**ok = [ok](access(gate, "ok"))**
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
**used_by = > used_by id=`id` out=`out`**
`ret` =

| ok | id | path | catalog | implemented_by | possible_duplicates | constraints | failures | used_by |
|----|----|------|---------|----------------|---------------------|-------------|----------|---------|
| True | `id` | `path` | `body` | `implemented` | `duplicates` | `constraints` | `failures` | `used_by` |

*ret*

## used_by
    + `id`
    + `out`=".marqdo"

Reverse-read `.marqdo/graph/edges.json`: symbols that `uses` implementors of this capability.

**edges_path = `out` + "/graph/edges.json"**
**has = > fs.exists path=`edges_path`**
1. not `has`
  **empty = > table.empty_list**
  *empty*
**raw = > fs.read_text path=`edges_path`**
**doc = > json.parse text=`raw`**
**edges = > json.get value=`doc` key="edges"**
1. not `edges`
  **edges = `doc`**
**cap = "capability:" + `id`**
**impl = > table.empty_list**
1. `edges`
  - [e](遍历 edges 为 e)
    **kind = > json.get value=`e` key="kind"**
    **fr = > json.get value=`e` key="from"**
    **to = > json.get value=`e` key="to"**
    1. `kind` == "implements"
      1. `fr` == `cap`
        **impl = > table.append list=`impl` item=`to`**
**users = > table.empty_list**
1. `edges`
  - [e2](遍历 edges 为 e2)
    **kind2 = > json.get value=`e2` key="kind"**
    **fr2 = > json.get value=`e2` key="from"**
    **to2 = > json.get value=`e2` key="to"**
    1. `kind2` == "uses"
      **hit = False**
      - [sym](遍历 impl 为 sym)
        1. `to2` == `sym`
          **hit = True**
      1. `hit`
        **users = > table.append list=`users` item=`fr2`**
*users*

## impact
    + `paths`=""
    + `root`="."
    + `out`=".marqdo"

Thin wrap: `marqdo impact … --json`.

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](access(gate, "ok"))**
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
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
1. `code` != 0
  **err = [stderr](access(proc, "stderr"))**
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
**ok = [ok](access(gate, "ok"))**
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
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
1. `code` != 0
  **err = [stderr](access(proc, "stderr"))**
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

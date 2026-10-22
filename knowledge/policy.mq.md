---
markup: occlusion
title: knowledge/policy
description: >-
  L6 Policy product surface — list authored policies/, match task keywords into
  Preflight Context Pack, compile reuse decisions via Marqdo knowledge policy.
  Does not invent a second Policy Compiler (Marqdo owns compilation).
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
import text:lib/text.mq.md
---

## resolve_root
    + `root`="."

1. `root` != "."
  1. `root` != ""
    *root*
**env = > sys.env_get name="QDAGENT_ROOT"**
1. `env`
  *env*
**cwd = > sys.cwd**
*cwd*

## list
    + `root`="."

List authored Engineering Policies (`policies/*.mq.md`) and L4 constraints.

**root = > resolve_root root=`root`**
**proot = `root` + "/policies"**
**croot = `root` + "/knowledge/constraints"**
**policies = > table.empty_list**
**has_p = > fs.exists path=`proot`**
1. `has_p`
  **names = > fs.list_dir path=`proot`**
  - [name](遍历 names 为 name)
    **parts = > text.str_split s=`name` sep=".mq.md"**
    **n = > len value=`parts`**
    1. `n` == 2
      **base = > at value=`parts` index=0**
      **body = > fs.read_text path=`proot` + "/" + `name`**
      `row` =

      | kind | id | path | excerpt |
      |------|----|------|---------|
      | policy | `base` | `proot` + "/" + `name` | `body` |

      **policies = > table.append list=`policies` item=`row`**
**constraints = > table.empty_list**
**has_c = > fs.exists path=`croot`**
1. `has_c`
  **cnames = > fs.list_dir path=`croot`**
  - [cname](遍历 cnames 为 cname)
    **cparts = > text.str_split s=`cname` sep=".md"**
    **cn = > len value=`cparts`**
    1. `cn` == 2
      **cbase = > at value=`cparts` index=0**
      `crow` =

      | kind | id | path |
      |------|----|------|
      | constraint | `cbase` | `croot` + "/" + `cname` |

      **constraints = > table.append list=`constraints` item=`crow`**
`out` =

| ok | policies | constraints |
|----|----------|-------------|
| True | `policies` | `constraints` |

*out*

## match
    + `task`
    + `root`="."

Match authored L6 policies whose body / id keywords appear in `task`.
Returns hits for Preflight Context Pack (no LLM).

**root = > resolve_root root=`root`**
**listed = > list root=`root`**
**rows = [policies](access(listed, "policies"))**
**task_l = > text.to_lower text=`task`**
**hits = > table.empty_list**
1. `rows`
  - [row](遍历 rows 为 row)
    **id = > json.get value=`row` key="id"**
    **excerpt = > json.get value=`row` key="excerpt"**
    **path = > json.get value=`row` key="path"**
    **body_l = > text.to_lower text=`excerpt`**
    **score = 0**
    1. `id`
      **id_l = > text.to_lower text=`id`**
      **has_id = > text.contains text=`task_l` sub=`id_l`**
      1. `has_id`
        **score = `score` + 3**
    **has_openai = > text.contains text=`body_l` sub="openai"**
    **task_openai = > text.contains text=`task_l` sub="openai"**
    1. `has_openai`
      1. `task_openai`
        **score = `score` + 2**
    **has_v1 = > text.contains text=`body_l` sub="/v1"**
    **task_v1 = > text.contains text=`task_l` sub="/v1"**
    1. `has_v1`
      1. `task_v1`
        **score = `score` + 2**
    **has_efi = > text.contains text=`body_l` sub="preflight"**
    **task_efi = > text.contains text=`task_l` sub="预检"**
    **task_efi2 = > text.contains text=`task_l` sub="preflight"**
    1. `has_efi`
      1. `task_efi`
        **score = `score` + 1**
      2. `task_efi2`
        **score = `score` + 1**
    **has_gateway = > text.contains text=`body_l` sub="gateway"**
    **task_gateway = > text.contains text=`task_l` sub="网关"**
    **task_gw2 = > text.contains text=`task_l` sub="gateway"**
    1. `has_gateway`
      1. `task_gateway`
        **score = `score` + 2**
      2. `task_gw2`
        **score = `score` + 2**
    1. `score` > 0
      `hit` =

      | id | path | score | kind |
      |----|------|------:|------|
      | `id` | `path` | `score` | policy |

      **hits = > table.append list=`hits` item=`hit`**
**n = > len value=`hits`**
`out` =

| ok | task | matches | count |
|----|------|---------|------:|
| True | `task` | `hits` | `n` |

*out*

## attach_to_preflight
    + `task`
    + `pack`
    + `root`="."

Merge matched L6 policies into a Preflight result map (product Context Pack enrichment).

**m = > match task=`task` root=`root`**
**hits = [matches](access(m, "matches"))**
**n = [count](access(m, "count"))**
**enriched = > table.put in=`pack` at="policies" value=`hits`**
**enriched = > table.put in=`enriched` at="policy_count" value=`n`**
*enriched*

## pending_labels
    + `root`="."

M9 两级词表检索（product face）— run `marqdo labels <root> --json` and return
the pending-debt rows (built-in 待开发 words + explicit `[描述]()` stubs).
Zero LLM; Marqdo owns the search (no second word list here).

**root = > resolve_root root=`root`**
> sys.env_set name="QDAGENT_LABELS_ROOT" value=`root`
`args` =

| a |
|---|
| "-c" |
| marqdo labels "$QDAGENT_LABELS_ROOT" --json |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](access(proc, "code"))**
**stdout = [stdout](access(proc, "stdout"))**
**rows = > json.parse text=`stdout`**
1. `code` != 0
  **rows = > table.empty_list**
**n = > len value=`rows`**
`out` =

| ok | count | rows |
|----|------:|------|
| True | `n` | `rows` |

*out*

## compile_from_reuse
    + `task`
    + `root`="."

Surface matched L6 policies for a task (Marqdo owns `.marqdo/agent/policies`
compile via `marqdo knowledge` — no second Policy Compiler in qdagent).

**matched = > match task=`task` root=`root`**
**hits = [matches](access(matched, "matches"))**
**n = [count](access(matched, "count"))**
`ret` =

| ok | policies | count | compiled_hint |
|----|----------|------:|---------------|
| True | `hits` | `n` | `.marqdo/agent/policies` via marqdo knowledge |

*ret*

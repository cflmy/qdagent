---
title: execution/promote
description: >-
  Knowledge Candidate → Promote / Reject.
  Verify-before-Promote: L3 must pass; never promote without Evidence.
import fs:lib/fs.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import time:lib/time.mq.md
import verify:verify.mq.md
import ctx:../knowledge/context.mq.md
---

## data_root

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
2. *
  *"data"*

## candidates_dir

**root = > data_root**
*`root` + "/candidates"*

## knowledge_dir
    + `kind`="decisions"

1. `kind` == "constraint"
  *"knowledge/constraints"*
2. `kind` == "constraints"
  *"knowledge/constraints"*
3. `kind` == "failure"
  *"knowledge/failures"*
4. `kind` == "failures"
  *"knowledge/failures"*
5. `kind` == "capability"
  *"knowledge/capabilities"*
6. `kind` == "capabilities"
  *"knowledge/capabilities"*
7. *
  *"knowledge/decisions"*

## type_label
    + `kind`="decision"

1. `kind` == "constraint"
  *"Constraint"*
2. `kind` == "constraints"
  *"Constraint"*
3. `kind` == "failure"
  *"Failure"*
4. `kind` == "failures"
  *"Failure"*
5. `kind` == "capability"
  *"Capability"*
6. `kind` == "capabilities"
  *"Capability"*
7. *
  *"Decision"*

## cand_paths
    + `slug`

**dir = > candidates_dir**
`paths` =

| mq | meta |
|----|------|
| `dir` + "/" + `slug` + ".mq.md" | `dir` + "/" + `slug` + ".json" |

*paths*

## write_meta
    + `slug`
    + `capability`
    + `evidence`
    + `verification`
    + `status`="candidate"
    + `task`=""
    + `path`=""
    + `kind`="decision"

**paths = > cand_paths slug=`slug`**
**meta_path = [meta](paths)**
`meta` =

| slug | capability | evidence | verification | status | task | path | kind |
|------|------------|----------|--------------|--------|------|------|------|
| `slug` | `capability` | `evidence` | `verification` | `status` | `task` | `path` | `kind` |

**raw = > json.stringify value=`meta`**
> fs.write_text path=`meta_path` text=`raw`
*meta_path*

## list
    + `status`=""

List candidate slugs (optionally filter by status via sidecar json).

**dir = > candidates_dir**
**exists = > fs.exists path=`dir`**
1. not `exists`
  **none = > json.parse text=[]**
  `empty` =

  | ok | candidates |
  |----|------------|
  | True | `none` |

  *empty*

**names = > fs.list_dir path=`dir`**
**slugs = > json.parse text=[]**

- [`name`](`names`)
  **parts = > split value=`name` sep=".mq.md"**
  **n = > len value=`parts`**
  1. `n` == 2
    **slug = > at value=`parts` index=0**
    1. `status`
      **paths = > cand_paths slug=`slug`**
      **mp = [meta](paths)**
      **has = > fs.exists path=`mp`**
      1. `has`
        **raw = > fs.read_text path=`mp`**
        **m = > json.parse text=`raw`**
        **st = > json.get value=`m` key="status"**
        1. `st` == `status`
          **slugs = > json.append list=`slugs` item=`slug`**
      2. *
        **_ = 1**
    2. *
      **slugs = > json.append list=`slugs` item=`slug`**

`out` =

| ok | candidates |
|----|------------|
| True | `slugs` |

*out*

## read
    + `slug`

**paths = > cand_paths slug=`slug`**
**mq = [mq](paths)**
**mp = [meta](paths)**
**has = > fs.exists path=`mq`**
1. not `has`
  `fail` =

  | ok | error |
  |----|-------|
  | False | missing_candidate |

  *fail*

**body = > fs.read_text path=`mq`**
`meta` =

| slug |
|------|
| `slug` |

**has_meta = > fs.exists path=`mp`**
1. `has_meta`
  **raw = > fs.read_text path=`mp`**
  **meta = > json.parse text=`raw`**

`out` =

| ok | slug | body | meta | path |
|----|------|------|------|------|
| True | `slug` | `body` | `meta` | `mq` |

*out*

## knowledge_body
    + `title`
    + `kind`="decision"
    + `capability`
    + `evidence`
    + `verification`
    + `task`=""
    + `source_slug`=""

**ty = > type_label kind=`kind`**
**body = "---\ntitle: " + `title`**
**body = `body` + "\ntype: " + `ty`**
**body = `body` + "\nstatus: stable"**
**body = `body` + "\ncapability: " + `capability`**
**body = `body` + "\nsource_candidate: " + `source_slug`**
**body = `body` + "\n---\n\n"**
**body = `body` + "# " + `ty` + "\n\n" + `title` + "\n\n"**
**body = `body` + "## Capability\n\n" + `capability` + "\n\n"**
**body = `body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**body = `body` + "## Verification\n\n" + `verification` + "\n\n"**
**body = `body` + "## Task\n\n" + `task` + "\n\n"**
**body = `body` + "## Promotion\n\nPromoted from Knowledge Candidate "**
**body = `body` + `source_slug` + " after Verify-before-Promote.\n"**
*body*

## slugify
    + `text`

Fallback file stem from capability text (keep alnum / hyphen).

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
*"promoted-" + `s`*

## promote
    + `slug`
    + `kind`="decision"
    + `title`=""
    + `capability`=""
    + `evidence`=""
    + `verification`=""
    + `root`="."
    + `out`=".marqdo"
    + `force`=False

Promote one candidate into authored L4 under knowledge/. Re-runs L3 verify unless force=True.

**v = > verify.run root=`root` out=`out` l1_ok=True**
**passed = [passed](v)**
1. not `passed`
  1. not `force`
    `blocked` =

    | ok | error | verify |
    |----|-------|--------|
    | False | verify_before_promote | `v` |

    *blocked*

**cand = > read slug=`slug`**
**ok = [ok](cand)**
1. not `ok`
  *cand*

**meta = [meta](cand)**
**body = [body](cand)**
**st = > json.get value=`meta` key="status"**
1. `st` == "stable"
  `already` =

  | ok | error | slug |
  |----|-------|------|
  | False | already_stable | `slug` |

  *already*
1. `st` == "rejected"
  `rej` =

  | ok | error | slug |
  |----|-------|------|
  | False | already_rejected | `slug` |

  *rej*

1. not `capability`
  **capability = > json.get value=`meta` key="capability"**
1. not `evidence`
  **evidence = > json.get value=`meta` key="evidence"**
1. not `verification`
  **verification = > json.get value=`meta` key="verification"**
1. not `capability`
  **capability = `slug`**
1. not `evidence`
  **evidence = "see candidate " + `slug`**
1. not `verification`
  **verification = "L3 re-verified on promote"**
1. not `title`
  **title = `capability`**

**task = > json.get value=`meta` key="task"**
1. not `task`
  **task = ""**

**kdir = > knowledge_dir kind=`kind`**
> fs.make_dir path=`kdir`
**file_stem = > slugify text=`capability`**
**kpath = `kdir` + "/" + `file_stem` + ".md"**
**kbody = > knowledge_body title=`title` kind=`kind` capability=`capability` evidence=`evidence` verification=`verification` task=`task` source_slug=`slug`**
> fs.write_text path=`kpath` text=`kbody`

**cpath = [path](cand)**
**new_body = "---\ntype: Knowledge Candidate\nstatus: stable"**
**new_body = `new_body` + "\npromoted_to: " + `kpath` + "\n---\n\n"**
**new_body = `new_body` + "# Knowledge Candidate\n\n"**
**new_body = `new_body` + "## Capability\n\n" + `capability` + "\n\n"**
**new_body = `new_body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**new_body = `new_body` + "## Verification\n\n" + `verification` + "\n\n"**
**new_body = `new_body` + "## Task\n\n" + `task` + "\n\n"**
**new_body = `new_body` + "## Status\n\nstable\n\n"**
**new_body = `new_body` + "## Promoted To\n\n" + `kpath` + "\n"**
> fs.write_text path=`cpath` text=`new_body`
> write_meta slug=`slug` capability=`capability` evidence=`evidence` verification=`verification` status="stable" task=`task` path=`cpath` kind=`kind`

Always recompile EKC so promoted L4 enters the graph.

**root = > ctx.resolve_root root=`root`**
**out = > ctx.resolve_out out=`out` root=`root`**
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**compile_ok = False**
1. `code` == 0
  **compile_ok = True**

`ret` =

| ok | slug | status | knowledge_path | compile_ok | verify |
|----|------|--------|----------------|------------|--------|
| True | `slug` | stable | `kpath` | `compile_ok` | `v` |

*ret*

## reject
    + `slug`
    + `reason`="rejected"

**cand = > read slug=`slug`**
**ok = [ok](cand)**
1. not `ok`
  *cand*

**meta = [meta](cand)**
**capability = > json.get value=`meta` key="capability"**
**evidence = > json.get value=`meta` key="evidence"**
**verification = > json.get value=`meta` key="verification"**
**task = > json.get value=`meta` key="task"**
1. not `capability`
  **capability = `slug`**
1. not `evidence`
  **evidence = ""**
1. not `verification`
  **verification = ""**
1. not `task`
  **task = ""**

**cpath = [path](cand)**
**new_body = "---\ntype: Knowledge Candidate\nstatus: rejected"**
**new_body = `new_body` + "\nreason: " + `reason` + "\n---\n\n"**
**new_body = `new_body` + "# Knowledge Candidate\n\n"**
**new_body = `new_body` + "## Capability\n\n" + `capability` + "\n\n"**
**new_body = `new_body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**new_body = `new_body` + "## Verification\n\n" + `verification` + "\n\n"**
**new_body = `new_body` + "## Task\n\n" + `task` + "\n\n"**
**new_body = `new_body` + "## Status\n\nrejected\n\n"**
**new_body = `new_body` + "## Reason\n\n" + `reason` + "\n"**
> fs.write_text path=`cpath` text=`new_body`
> write_meta slug=`slug` capability=`capability` evidence=`evidence` verification=`verification` status="rejected" task=`task` path=`cpath`

`ret` =

| ok | slug | status | reason |
|----|------|--------|--------|
| True | `slug` | rejected | `reason` |

*ret*

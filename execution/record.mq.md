---
title: execution/record
description: >-
  Record Knowledge Candidates after verification. Never promote without Evidence.
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import sys:lib/sys.mq.md
import run:run.mq.md
import table:lib/table.mq.md
import promote:promote.mq.md
---

## data_root

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
2. *
  *"data"*

## candidate_body
    + `capability`
    + `evidence`
    + `verification`
    + `status`="candidate"
    + `task`=""

**body = "---\ntype: Knowledge Candidate\nstatus: " + `status` + "\n---\n\n# Knowledge Candidate\n\n## Capability\n\n" + `capability` + "\n\n## Evidence\n\n" + `evidence` + "\n\n## Verification\n\n" + `verification` + "\n\n## Task\n\n" + `task` + "\n\n## Status\n\n" + `status` + "\n"**
*body*

## write_candidate
    + `capability`
    + `evidence`
    + `verification`
    + `status`="candidate"
    + `task`=""
    + `slug`=""
    + `promote_allowed`=False

Hard gate: refuse promote path when promote_allowed is false.

1. `status` == "stable"
  1. not `promote_allowed`
    `blocked` =

    | ok | error |
    |----|-------|
    | False | verify_before_promote |

    *blocked*

**root = > data_root**
> fs.make_dir path=`root` + "/candidates"
**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
1. `slug` == ""
  **slug = "cand-" + `s`**
**body = > candidate_body capability=`capability` evidence=`evidence` verification=`verification` status=`status` task=`task`**
**path = `root` + "/candidates/" + `slug` + ".mq.md"**
> fs.write_text path=`path` text=`body`
> promote.write_meta slug=`slug` capability=`capability` evidence=`evidence` verification=`verification` status=`status` task=`task` path=`path`
`out` =

| ok | slug | path | status |
|----|------|------|--------|
| True | `slug` | `path` | `status` |

*out*

## from_workbook
    + `workbook_slug`
    + `capability`
    + `evidence`
    + `verification`
    + `promote_allowed`=False

**cand = > write_candidate capability=`capability` evidence=`evidence` verification=`verification` task=`workbook_slug` promote_allowed=`promote_allowed`**
**ok = [ok](cand)**
1. not `ok`
  *cand*
**path = [path](cand)**
**summary = "candidate: " + `path`**
> run.append_section slug=`workbook_slug` section="Knowledge Candidate" content=`summary`
*cand*

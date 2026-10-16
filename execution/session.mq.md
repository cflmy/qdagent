---
title: execution/session
description: >-
  Server-side Session index (D10) — continuity handle linking surface ·
  workbook_slug · run_id. Not Personal Memory; not a second Run store.
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import sys:lib/sys.mq.md
import text:lib/text.mq.md
import table:lib/table.mq.md
---

## data_root

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
*"data"*

## ensure_dirs

**root = > data_root**
> fs.make_dir path=`root`
> fs.make_dir path=`root` + "/sessions"
*root*

## new_id

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
*"sess-" + `s`*

## path
    + `id`

**root = > ensure_dirs**
*`root` + "/sessions/" + `id` + ".mq.md"*

## render
    + `id`
    + `surface`=""
    + `workbook_slug`=""
    + `run_id`=""
    + `history`=""

Body for a Session file. `history` is optional markdown table rows
(`| at | surface | workbook_slug | run_id |`).

**u = > time.now_unix**
**at = > time.format unix=`u` pattern="%Y-%m-%dT%H:%M:%S"**
**rows = `history`**
1. not `rows`
  **rows = "| " + `at` + " | " + `surface` + " | " + `workbook_slug` + " | " + `run_id` + " |"**
**body = "---\ntitle: " + `id` + "\ntype: Session\nupdated: " + `at` + "\nsurface: " + `surface` + "\nworkbook_slug: " + `workbook_slug` + "\nrun_id: " + `run_id` + "\n---\n\n# Session\n\nContinuity handle (not Personal Memory). Latest link below; history append-only.\n\n# Latest\n\n| field | value |\n|-------|-------|\n| surface | " + `surface` + " |\n| workbook_slug | " + `workbook_slug` + " |\n| run_id | " + `run_id` + " |\n\n# Runs\n\n| at | surface | workbook_slug | run_id |\n|----|---------|---------------|--------|\n" + `rows` + "\n"**
*body*

## read
    + `id`

1. not `id`
  `fail` =

  | ok | error |
  |----|-------|
  | False | id_required |

  *fail*
**p = > path id=`id`**
**has = > fs.exists path=`p`**
1. not `has`
  `miss` =

  | ok | error | id |
  |----|-------|----|
  | False | not_found | `id` |

  *miss*
**body = > fs.read_text path=`p`**
`out` =

| ok | id | path | body |
|----|----|------|------|
| True | `id` | `p` | `body` |

*out*

## list
    + `limit`=10

List recent Session files (newest first by name).

**root = > ensure_dirs**
**dir = `root` + "/sessions"**
**entries = > fs.list_dir path=`dir`**
**acc = > table.empty_list**
1. `entries`
  - [name](entries)
    **parts = > split value=`name` sep=".mq.md"**
    **n = > len value=`parts`**
    1. `n` == 2
      **base = > at value=`parts` index=0**
      **p = `dir` + "/" + `name`**
      **body = > fs.read_text path=`p`**
      **surf = ""**
      **wb = ""**
      **rid = ""**
      **lines = > text.str_split s=`body` sep="\n"**
      - [line](lines)
        **is_surf = > text.starts_with text=`line` prefix="surface: "**
        1. `is_surf`
          **sp = > text.str_split s=`line` sep="surface: "**
          **surf = > at value=`sp` index=1**
        **is_wb = > text.starts_with text=`line` prefix="workbook_slug: "**
        1. `is_wb`
          **wp = > text.str_split s=`line` sep="workbook_slug: "**
          **wb = > at value=`wp` index=1**
        **is_rid = > text.starts_with text=`line` prefix="run_id: "**
        1. `is_rid`
          **rp = > text.str_split s=`line` sep="run_id: "**
          **rid = > at value=`rp` index=1**
      `row` =

      | id | surface | workbook_slug | run_id |
      |----|---------|---------------|--------|
      | `base` | `surf` | `wb` | `rid` |

      **acc = > table.append list=`acc` item=`row`**
**nacc = > len value=`acc`**
**out_rows = > table.empty_list**
**i = 0**
**take = `limit`**
1. `nacc` < `take`
  **take = `nacc`**
- `i` < `take`
  **idx = `nacc` - `i`**
  **row = [`idx`](acc)**
  **out_rows = > table.append list=`out_rows` item=`row`**
  **i = i + 1**
`out` =

| ok | count | sessions |
|----|-------|----------|
| True | `nacc` | `out_rows` |

*out*

## link
    + `session_id`=""
    + `surface`=""
    + `workbook_slug`=""
    + `run_id`=""

Create or update `data/sessions/<id>.mq.md` with latest surface / workbook / run.
If `session_id` empty → allocate `sess-YYYYMMDD-HHMMSS`.
Appends a Runs history row when the file already exists.

1. not `session_id`
  **session_id = > new_id**
**p = > path id=`session_id`**
**has = > fs.exists path=`p`**
**u = > time.now_unix**
**at = > time.format unix=`u` pattern="%Y-%m-%dT%H:%M:%S"**
**row = "| " + `at` + " | " + `surface` + " | " + `workbook_slug` + " | " + `run_id` + " |"**
**history = `row`**
1. `has`
  **prev = > fs.read_text path=`p`**
  **marker = "|----|---------|---------------|--------|"**
  **parts = > split value=`prev` sep=`marker`**
  **n = > len value=`parts`**
  1. `n` >= 2
    **old = > at value=`parts` index=1**
    **history = `row` + `old`**
**body = > render id=`session_id` surface=`surface` workbook_slug=`workbook_slug` run_id=`run_id` history=`history`**
> fs.write_text path=`p` text=`body`
`out` =

| ok | session_id | path | surface | workbook_slug | run_id |
|----|------------|------|---------|---------------|--------|
| True | `session_id` | `p` | `surface` | `workbook_slug` | `run_id` |

*out*

---
title: execution/run
description: >-
  Engineering Workbook — create / put_section / finalize.
  Section state lives in sibling `<slug>.sections.json`; body is always regenerated
  (no duplicate headings). Shared by CLI, Web, MCP, OpenAI.
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import text:lib/text.mq.md
import table:lib/table.mq.md
---

## data_root

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
2. *
  *"data"*

## ensure_dirs

**root = > data_root**
> fs.make_dir path=`root`
> fs.make_dir path=`root` + "/workbooks"
> fs.make_dir path=`root` + "/runs"
> fs.make_dir path=`root` + "/candidates"
> fs.make_dir path=`root` + "/sessions"
*root*

## new_id

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
*"wb-" + `s`*

## default_sections
    + `task`
    + `intent`=""

`sec` =

| Task | Intent | Preflight | Existing Capabilities | Decision | Plan | Execution | Tool Calls | Changes | Verification | Evidence | Result | Knowledge Candidate | Metrics | status |
|------|--------|-----------|----------------------|----------|------|-----------|------------|---------|--------------|----------|--------|---------------------|---------|--------|
| `task` | `intent` | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | (pending) | created |

*sec*

## render
    + `slug`
    + `sec`

**task = [Task](sec)**
**status = [status](sec)**
**intent = [Intent](sec)**
**pf = [Preflight](sec)**
**caps = [Existing Capabilities](sec)**
**dec = [Decision](sec)**
**plan = [Plan](sec)**
**ex = [Execution](sec)**
**tools = [Tool Calls](sec)**
**chg = [Changes](sec)**
**ver = [Verification](sec)**
**ev = [Evidence](sec)**
**res = [Result](sec)**
**kc = [Knowledge Candidate](sec)**
**met = [Metrics](sec)**

**body = "---\ntitle: " + `slug` + "\ntype: Engineering Workbook\nstatus: " + `status` + "\ntask: " + `task` + "\n---\n\n# Task\n\n" + `task` + "\n\n# Intent\n\n" + `intent` + "\n\n# Preflight\n\n" + `pf` + "\n\n# Existing Capabilities\n\n" + `caps` + "\n\n# Decision\n\n" + `dec` + "\n\n# Plan\n\n" + `plan` + "\n\n# Execution\n\n" + `ex` + "\n\n# Tool Calls\n\n" + `tools` + "\n\n# Changes\n\n" + `chg` + "\n\n# Verification\n\n" + `ver` + "\n\n# Evidence\n\n" + `ev` + "\n\n# Result\n\n" + `res` + "\n\n# Knowledge Candidate\n\n" + `kc` + "\n\n# Metrics\n\n" + `met` + "\n"**
*body*

## state_path
    + `slug`

**root = > ensure_dirs**
*`root` + "/workbooks/" + `slug` + ".sections.json"*

## body_path
    + `slug`

**root = > ensure_dirs**
*`root` + "/workbooks/" + `slug` + ".mq.md"*

## load_state
    + `slug`

**sp = > state_path slug=`slug`**
**exists = > fs.exists path=`sp`**
1. not `exists`
  `fail` =

  | ok | error |
  |----|-------|
  | False | missing_state |

  *fail*
**raw = > fs.read_text path=`sp`**
**sec = > json.parse text=`raw`**
`out` =

| ok | sections |
|----|----------|
| True | `sec` |

*out*

## save_state
    + `slug`
    + `sec`

**sp = > state_path slug=`slug`**
**bp = > body_path slug=`slug`**
**raw = > json.stringify value=`sec`**
> fs.write_text path=`sp` text=`raw`
**body = > render slug=`slug` sec=`sec`**
> fs.write_text path=`bp` text=`body`
`out` =

| ok | slug | path |
|----|------|------|
| True | `slug` | `bp` |

*out*

## create
    + `task`
    + `intent`=""
    + `slug`=""
    + `surface`="cli"

1. `slug` == ""
  **slug = > new_id**
**sec = > default_sections task=`task` intent=`intent`**
> save_state slug=`slug` sec=`sec`
**bp = > body_path slug=`slug`**
`out` =

| ok | slug | path | status | surface |
|----|------|------|--------|---------|
| True | `slug` | `bp` | created | `surface` |

*out*

## read
    + `slug`

**bp = > body_path slug=`slug`**
**exists = > fs.exists path=`bp`**
1. not `exists`
  `fail` =

  | ok | error |
  |----|-------|
  | False | missing_workbook |

  *fail*
**text = > fs.read_text path=`bp`**
`out` =

| ok | slug | path | body |
|----|------|------|------|
| True | `slug` | `bp` | `text` |

*out*

## put_section
    + `slug`
    + `section`
    + `content`

**st = > load_state slug=`slug`**
**ok = [ok](st)**
1. not `ok`
  *st*
**sec = [sections](st)**
**sec = > table.put in=`sec` at=`section` value=`content`**
*> save_state slug=`slug` sec=`sec`*

## append_section
    + `slug`
    + `section`
    + `content`

Compat alias — replaces in place via state.

*> put_section slug=`slug` section=`section` content=`content`*

## set_status
    + `slug`
    + `status`

**st = > load_state slug=`slug`**
**ok = [ok](st)**
1. not `ok`
  *st*
**sec = [sections](st)**
**sec = > table.put in=`sec` at="status" value=`status`**
*> save_state slug=`slug` sec=`sec`*

## attach_preflight
    + `slug`
    + `decision`
    + `create_allowed`
    + `context_path`
    + `summary`=""

**text = "decision: " + `decision` + "\ncreate_allowed: " + `create_allowed` + "\ncontext_path: " + `context_path` + "\n\n" + `summary`**
> put_section slug=`slug` section="Preflight" content=`text`
*> set_status slug=`slug` status="preflighted"*

## attach_decision
    + `slug`
    + `decision`

> put_section slug=`slug` section="Decision" content=`decision`
*> set_status slug=`slug` status="decided"*

## attach_result
    + `slug`
    + `result`

> put_section slug=`slug` section="Result" content=`result`
*> set_status slug=`slug` status="completed"*

## finalize
    + `slug`
    + `result`=""
    + `status`="completed"

1. `result`
  > put_section slug=`slug` section="Result" content=`result`
> set_status slug=`slug` status=`status`
*> read slug=`slug`*

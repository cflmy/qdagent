---
markup: occlusion
title: execution/run
description: >-
  Engineering Workbook — create / put_section / finalize.
  Section state lives in sibling `<slug>.sections.json`; body is always regenerated
  (no duplicate headings). Shared by CLI, Web, MCP, OpenAI.
  State keys are snake_case (no spaces) for safe table index.
import fs:lib/fs.mq.md
import time:lib/time.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
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

| task | intent | preflight | existing | decision | plan | execution | tools | changes | verification | evidence | result | candidate | metrics | status |
|------|--------|-----------|----------|----------|------|-----------|-------|---------|--------------|----------|--------|-----------|---------|--------|
| `task` | `intent` | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | created |

*sec*

## render
    + `slug`
    + `sec`

**task = [task](access(sec, "task"))**
**status = [status](access(sec, "status"))**
**intent = [intent](access(sec, "intent"))**
**pf = [preflight](access(sec, "preflight"))**
**caps = [existing](access(sec, "existing"))**
**dec = [decision](access(sec, "decision"))**
**plan = [plan](access(sec, "plan"))**
**ex = [execution](access(sec, "execution"))**
**tools = [tools](access(sec, "tools"))**
**chg = [changes](access(sec, "changes"))**
**ver = [verification](access(sec, "verification"))**
**ev = [evidence](access(sec, "evidence"))**
**res = [result](access(sec, "result"))**
**kc = [candidate](access(sec, "candidate"))**
**met = [metrics](access(sec, "metrics"))**

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

Map display names to snake_case state keys.

**key = `section`**
1. `section` == "Task"
  **key = "task"**
2. `section` == "Intent"
  **key = "intent"**
3. `section` == "Preflight"
  **key = "preflight"**
4. `section` == "Existing Capabilities"
  **key = "existing"**
5. `section` == "Decision"
  **key = "decision"**
6. `section` == "Plan"
  **key = "plan"**
7. `section` == "Execution"
  **key = "execution"**
8. `section` == "Tool Calls"
  **key = "tools"**
9. `section` == "Changes"
  **key = "changes"**
10. `section` == "Verification"
  **key = "verification"**
11. `section` == "Evidence"
  **key = "evidence"**
12. `section` == "Result"
  **key = "result"**
13. `section` == "Knowledge Candidate"
  **key = "candidate"**
14. `section` == "Metrics"
  **key = "metrics"**

**st = > load_state slug=`slug`**
**ok = [ok](access(st, "ok"))**
1. not `ok`
  *st*
**sec = [sections](access(st, "sections"))**
**sec = > table.put in=`sec` at=`key` value=`content`**
*> save_state slug=`slug` sec=`sec`*

## append_section
    + `slug`
    + `section`
    + `content`

*> put_section slug=`slug` section=`section` content=`content`*

## set_status
    + `slug`
    + `status`

**st = > load_state slug=`slug`**
**ok = [ok](access(st, "ok"))**
1. not `ok`
  *st*
**sec = [sections](access(st, "sections"))**
**sec = > table.put in=`sec` at="status" value=`status`**
*> save_state slug=`slug` sec=`sec`*

## attach_preflight
    + `slug`
    + `decision`
    + `create_allowed`
    + `context_path`
    + `summary`=""

**allowed_s = > json.stringify value=`create_allowed`**
**text = "decision: " + `decision` + "\ncreate_allowed: " + `allowed_s` + "\ncontext_path: " + `context_path` + "\n\n" + `summary`**
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

## attach_agent_metrics
    + `slug`
    + `agent_out`

Persist Marqdo 1.4.2 `usage` / `token_cost` / `execution` into Metrics (merge later with KPI read).

**usage = > json.get value=`agent_out` key="usage"**
**token_cost = > json.get value=`agent_out` key="token_cost"**
**execution = > json.get value=`agent_out` key="execution"**
**efi = > json.get value=`agent_out` key="efi"**
`met` =

| usage | token_cost | execution | efi |
|-------|------------|-----------|-----|
| `usage` | `token_cost` | `execution` | `efi` |

**met_s = > json.stringify value=`met`**
*> put_section slug=`slug` section="Metrics" content=`met_s`*

## finalize
    + `slug`
    + `result`=""
    + `status`="completed"

1. `result`
  > put_section slug=`slug` section="Result" content=`result`
> set_status slug=`slug` status=`status`
*> read slug=`slug`*

## list
    + `limit`=20

List recent Engineering Workbooks (newest first by slug / timestamp name).

**root = > ensure_dirs**
**dir = `root` + "/workbooks"**
**entries = > fs.list_dir path=`dir`**
**acc = > table.empty_list**
1. `entries`
  - [name](遍历 entries 为 name)
    **parts = > split value=`name` sep=".mq.md"**
    **n = > len value=`parts`**
    1. `n` == 2
      **base = > at value=`parts` index=0**
      **sec_p = `dir` + "/" + `base` + ".sections.json"**
      **has = > fs.exists path=`sec_p`**
      1. `has`
        **raw = > fs.read_text path=`sec_p`**
        **sec = > json.parse text=`raw`**
        **task = > json.get value=`sec` key="task"**
        **st = > json.get value=`sec` key="status"**
        **dec = > json.get value=`sec` key="decision"**
        `row` =

        | slug | task | status | decision |
        |------|------|--------|----------|
        | `base` | `task` | `st` | `dec` |

        **acc = > table.append list=`acc` item=`row`**
**nacc = > len value=`acc`**
**out_rows = > table.empty_list**
**i = 0**
**take = `limit`**
1. `nacc` < `take`
  **take = `nacc`**
- `i` < `take`
  **idx = `nacc` - `i`**
  **row = [idx](access(acc, `idx`))**
  **out_rows = > table.append list=`out_rows` item=`row`**
  **i = i + 1**
`out` =

| ok | count | workbooks |
|----|-------|-----------|
| True | `nacc` | `out_rows` |

*out*

## read_detail
    + `slug`

Workbook body + sections map (for Web detail pane).

**meta = > load_state slug=`slug`**
**mok = [ok](access(meta, "ok"))**
1. not `mok`
  *meta*
**body = > read slug=`slug`**
**bok = [ok](access(body, "ok"))**
1. not `bok`
  *body*
**sec = [sections](access(meta, "sections"))**
**text = [body](access(body, "body"))**
**path = [path](access(body, "path"))**
`out` =

| ok | slug | path | body | sections |
|----|------|------|------|----------|
| True | `slug` | `path` | `text` | `sec` |

*out*

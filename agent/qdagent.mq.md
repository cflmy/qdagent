---
title: agent/qdagent
description: >-
  求道 — Executable Engineering Knowledge Agent (CLI≥1.4.4 · Ext≥1.4.4).
  Modes: ASK / BUILD / LEARN. Single Agent Runtime: product Preflight +
  agent_eng_* latch; agent.run efi=True; CREATE uses sandbox=True.
  LLM transport failures return mode=error (Marqdo 1.4.4 soft status).
  Tools are ## in this file (code-as-documentation).
import pf:preflight.mq.md
import ctx:../knowledge/context.mq.md
import resolver:../knowledge/resolver.mq.md
import metrics:../knowledge/metrics.mq.md
import dec:../knowledge/decision.mq.md
import run:../execution/run.mq.md
import verify:../execution/verify.mq.md
import record:../execution/record.mq.md
import agent:ext/ai/agent.mq.md
import llm:ext/ai/llm.mq.md
import plugin:lib/plugin.mq.md
import db:../db/index.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
import fs:lib/fs.mq.md
---

## tool_find
    + `query`=""

Engineering find via Marqdo EKC (read-only). Prefer CALL:tool_find when locating symbols/capabilities.

1. not `query`
  **query = > sys.env_get name="QDAGENT_TOOL_QUERY"**
1. not `query`
  *"tool_find requires query"*
*> resolver.find query=`query`*

## tool_reuse
    + `task`=""

Engineering reuse / preflight payload (read-only). Prefer CALL:tool_reuse before CREATE.

1. not `task`
  **task = > sys.env_get name="QDAGENT_TASK"**
1. not `task`
  *"tool_reuse requires task"*
*> resolver.reuse task=`task`*

## tool_verify

Run L3 knowledge checks (verify / duplicate / conflicts / stale). Prefer CALL:tool_verify before promote.

*> verify.knowledge_checks*

## tool_summarize
    + `preflight`=None

Human-readable summary of a Context Pack map. Prefer CALL:tool_summarize for brief EFI readout.

1. not `preflight`
  *"tool_summarize requires preflight map"*
*> ctx.summarize preflight=`preflight`*

## eng_tools

Whitelist table for Marqdo agent CALL: (same-file ## tools).

`t` =

| 工具 |
|------|
| tool_find |
| tool_reuse |
| tool_verify |
| tool_summarize |

*t*

## ensure_llm

Load LLM credentials: process env → `.env` → `data/qdagent.db` settings.
Set `QDAGENT_DRY=1` to skip credentials (force dry-run / no upstream LLM).

**dry = > sys.env_get name="QDAGENT_DRY"**
1. `dry` == "1"
  *""*
1. `dry` == "true"
  *""*

> llm.load_env path=".env"
**key = > sys.env_get name="OPENAI_API_KEY"**
1. not `key`
  **key = > sys.env_get name="MARQDO_LLM_API_KEY"**
1. not `key`
  **store = > db.open**
  **rows = > `store`.select table="settings" limit=1**
  **cfg = [1](rows)**
  1. `cfg`
    **key = [llm_api_key](cfg)**
    **base = [llm_base_url](cfg)**
    **model = [llm_model](cfg)**
    1. `key`
      > sys.env_set name="OPENAI_API_KEY" value=`key`
    1. `base`
      > sys.env_set name="OPENAI_BASE_URL" value=`base`
      > sys.env_set name="MARQDO_LLM_BASE_URL" value=`base`
    1. `model`
      > sys.env_set name="OPENAI_MODEL" value=`model`
      > sys.env_set name="MARQDO_LLM_MODEL" value=`model`
*key*

## ensure_agent_plugin

Load Marqdo agent ABI plugin once (no LLM required).

**p = > plugin.native_path name="agent"**
1. `p`
  > plugin.load path=`p`
2. *
  > print text=qdagent: native agent plugin not found (build marqdo_plugin_agent)
  > sys.exit code=1
*True*

## make_agent
    + `standing`
    + `tools`=None

Construct Marqdo agent (loads agent plugin + LLM handle). Call only when API key present.

1. not `tools`
  **tools = > eng_tools**
**model = > llm.llm**
*> agent.agent model=`model` tools=`tools` standing=`standing`*

## latch_efi
    + `task`
    + `pack`
    + `root`="."
    + `out`=".marqdo"

Process-internal EFI latch on top of product Context Pack.
Calls agent_eng_preflight + agent_eng_record (plugin ABI, zero LLM).

> ensure_agent_plugin

**decision = [decision](pack)**
**allowed = [create_allowed](pack)**
**path = [context_path](pack)**
**pf_body = [preflight](pack)**

**latch = > agent_eng_preflight task=`task` root=`root` marqdo_dir=`out`**
**latch_status = > json.get value=`latch` key="status"**
**latch_decision = > json.get value=`latch` key="decision"**
**latch_allowed = > json.get value=`latch` key="create_allowed"**

1. `latch_status` == "ok"
  1. `latch_decision`
    **decision = `latch_decision`**
  1. `latch_allowed` == False
    **allowed = False**
2. `latch_status` == "ready"
  1. `latch_decision`
    **decision = `latch_decision`**
  1. `latch_allowed` == False
    **allowed = False**
3. *
  **_ = 1**

> agent_eng_record decision=`decision` root=`root` marqdo_dir=`out`

`ret` =

| ok | decision | create_allowed | context_path | preflight | latch |
|----|----------|----------------|--------------|-----------|-------|
| True | `decision` | `allowed` | `path` | `pf_body` | `latch` |

*ret*

## attach_pack
    + `slug`
    + `pack`
    + `root`="."
    + `out`=".marqdo"

Write Preflight fields into workbook (metrics via eng_record in latch_efi).

**decision = [decision](pack)**
**allowed = [create_allowed](pack)**
**path = [context_path](pack)**
**pf_body = [preflight](pack)**
> run.attach_preflight slug=`slug` decision=`decision` create_allowed=`allowed` context_path=`path`
**existing = > json.get value=`pf_body` key="existing"**
**existing_s = > json.stringify value=`existing`**
> run.put_section slug=`slug` section="Existing Capabilities" content=`existing_s`
**recommended = > json.get value=`pf_body` key="recommended"**
**recommended_s = > json.stringify value=`recommended`**
> run.put_section slug=`slug` section="Plan" content=`recommended_s`
**failures = > json.get value=`pf_body` key="failures"**
**failures_s = > json.stringify value=`failures`**
**forbidden = "Forbidden / failures:\n" + `failures_s`**
> run.put_section slug=`slug` section="Changes" content=`forbidden`
> run.attach_decision slug=`slug` decision=`decision`
> dec.record decision=`decision` root=`root` out=`out`
`out` =

| ok | decision | context_path |
|----|----------|--------------|
| True | `decision` | `path` |

*out*

## format_agent_outcome
    + `agent_out`

Prefer human-readable `error` / `result` from Marqdo 1.4.4 soft failures; else stringify.

**status = > json.get value=`agent_out` key="status"**
**err = > json.get value=`agent_out` key="error"**
**result = > json.get value=`agent_out` key="result"**
1. `status` == "ok"
  1. `result`
    *result*
  2. *
    *> json.stringify value=`agent_out`*
2. `err`
  *err*
3. `result`
  *result*
4. *
  *> json.stringify value=`agent_out`*

## attach_agent_evidence
    + `slug`
    + `agent_out`
    + `efi`=None

Write efi / usage / token_cost / route into workbook Evidence + Metrics.

**usage = > json.get value=`agent_out` key="usage"**
**token_cost = > json.get value=`agent_out` key="token_cost"**
**route = > json.get value=`agent_out` key="route"**
**err = > json.get value=`agent_out` key="error"**
**st = > json.get value=`agent_out` key="status"**
**efi_body = `efi`**
1. not `efi_body`
  **efi_body = > json.get value=`agent_out` key="efi"**

`ev` =

| efi | usage | token_cost | route | status | error |
|-----|-------|------------|-------|--------|-------|
| `efi_body` | `usage` | `token_cost` | `route` | `st` | `err` |

**ev_s = > json.stringify value=`ev`**
> run.put_section slug=`slug` section="Evidence" content=`ev_s`
> run.attach_agent_metrics slug=`slug` agent_out=`agent_out`
*ev_s*

## ask
    + `task`
    + `root`="."
    + `out`=".marqdo"

ASK — product Preflight + EFI latch + agent.run (efi=True, learn=False). No host mutation.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](pack)**
1. not `ok`
  *pack*

**gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
**decision = [decision](gated)**
**allowed = [create_allowed](gated)**
**path = [context_path](gated)**
**pf_body = [preflight](gated)**

`merged` =

| ok | decision | create_allowed | context_path | preflight |
|----|----------|----------------|--------------|-----------|
| True | `decision` | `allowed` | `path` | `pf_body` |

**wb = > run.create task=`task` intent="ask" surface="ask"**
**slug = [slug](wb)**
> attach_pack slug=`slug` pack=`merged` root=`root` out=`out`

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
**agent_out = None**
1. `key`
  **standing = "你是求道工程知识助手。优先引用 Preflight Context Pack 与 CALL:tool_find/tool_reuse。禁止再造第二套 Agent Runtime / EKC。"**
  **助手 = > make_agent standing=`standing`**
  **agent_out = > `助手`.run task=`task` efi=True learn=False verify=True writeback=True reuse=True router="auto" max_rounds=3 sandbox=False**
  **status = > json.get value=`agent_out` key="status"**
  **result = > format_agent_outcome agent_out=`agent_out`**
  1. `status` == "ok"
    **mode = "live"**
  2. *
    **mode = "error"**
  > attach_agent_evidence slug=`slug` agent_out=`agent_out` efi=`gated`
2. *
  **result = "（无 API Key）Preflight decision=" + `decision` + " context=" + `path`**
  **mode = "dry"**
  **status = "dry"**

> run.attach_result slug=`slug` result=`result`
**kpi = > metrics.read out=`out` root=`root`**
**kpi_s = > json.stringify value=`kpi`**
> run.put_section slug=`slug` section="Metrics" content=`kpi_s`
**err = None**
1. `agent_out`
  **err = > json.get value=`agent_out` key="error"**
2. *
  **_ = 1**
`ret` =

| ok | mode | slug | decision | context_path | status | error | result |
|----|------|------|----------|--------------|--------|-------|--------|
| True | `mode` | `slug` | `decision` | `path` | `status` | `err` | `result` |

*ret*

## build
    + `task`
    + `root`="."
    + `out`=".marqdo"
    + `force_create`=False
    + `sandbox`=True

BUILD — Preflight → EFI latch → Reuse Gate → agent.run (efi=True) → Verify → Record.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](pack)**
1. not `ok`
  *pack*

**gated = > latch_efi task=`task` pack=`pack` root=`root` out=`out`**
**decision = [decision](gated)**
**allowed = [create_allowed](gated)**
**path = [context_path](gated)**
**pf_body = [preflight](gated)**

1. `decision` == "CREATE"
  1. not `allowed`
    1. not `force_create`
      `blocked` =

      | ok | status | decision | create_allowed | context_path | error |
      |----|--------|----------|----------------|--------------|-------|
      | False | blocked | CREATE | False | `path` | reuse_gate_blocked |

      *blocked*

`merged` =

| ok | decision | create_allowed | context_path | preflight |
|----|----------|----------------|--------------|-----------|
| True | `decision` | `allowed` | `path` | `pf_body` |

**wb = > run.create task=`task` intent="build" surface="build"**
**slug = [slug](wb)**
> attach_pack slug=`slug` pack=`merged` root=`root` out=`out`
> run.set_status slug=`slug` status="executing"

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
**agent_out = None**
1. `key`
  **standing = "你是求道工程智能体。必须遵守 Context Pack 与 REUSE/ADAPT/CREATE。优先 CALL:tool_reuse / tool_find / tool_verify。禁止再造第二套 Agent Runtime 或 EKC。CREATE 前确认 create_allowed。"**
  **助手 = > make_agent standing=`standing`**
  **use_sandbox = False**
  1. `decision` == "CREATE"
    **use_sandbox = `sandbox`**
  **agent_out = > `助手`.run task=`task` efi=True learn=True verify=True writeback=True reuse=True router="auto" max_rounds=4 sandbox=`use_sandbox` sandbox_profile="default" promote=True**
  **status = > json.get value=`agent_out` key="status"**
  **result = > format_agent_outcome agent_out=`agent_out`**
  1. `status` == "ok"
    **mode = "live"**
  2. `status` == "blocked"
    **mode = "blocked"**
  3. *
    **mode = "error"**
    1. `decision` == "CREATE"
      **qslug = > agent_goal_slug goal=`task`**
      > agent_kb_quarantine kb_dir=".marqdo/agent-kb" slug=`qslug` reason="build_create_failed"
  > attach_agent_evidence slug=`slug` agent_out=`agent_out` efi=`gated`
2. *
  **result = "（无 API Key）BUILD dry-run decision=" + `decision` + " context=" + `path`**
  **mode = "dry"**
  **status = "dry"**

> run.attach_result slug=`slug` result=`result`
> run.put_section slug=`slug` section="Execution" content=`result`

**v = > verify.run slug=`slug` root=`root` out=`out` l1_ok=True**
**promote = [promote_allowed](v)**
**kpi = > metrics.read out=`out` root=`root`**
**kpi_s = > json.stringify value=`kpi`**
> run.put_section slug=`slug` section="Metrics" content=`kpi_s`
1. `promote`
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="L3 passed" promote_allowed=True
2. *
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="pending" promote_allowed=False

> run.set_status slug=`slug` status="completed"

**err = None**
1. `agent_out`
  **err = > json.get value=`agent_out` key="error"**
2. *
  **_ = 1**
`ret` =

| ok | mode | slug | decision | create_allowed | context_path | promote_allowed | status | error | result |
|----|------|------|----------|----------------|--------------|-----------------|--------|-------|--------|
| True | `mode` | `slug` | `decision` | `allowed` | `path` | `promote` | `status` | `err` | `result` |

*ret*

## learn
    + `task`=""
    + `root`="."
    + `out`=".marqdo"
    + `failure`=""
    + `decision`=""
    + `constraint`=""
    + `quarantine`=False

LEARN — feed Marqdo knowledge learn (official compiler). Optional quarantine on failed skill.

1. not `task`
  **task = "qdagent engineering knowledge refresh"**
1. not `failure`
  **failure = ""**
1. not `decision`
  **decision = ""**
1. not `constraint`
  **constraint = ""**

**gate = > ctx.ensure_graph root=`root` out=`out`**
**ok = [ok](gate)**
1. not `ok`
  *gate*

1. `quarantine`
  1. `failure`
    > ensure_agent_plugin
    **qslug = > agent_goal_slug goal=`task`**
    > agent_kb_quarantine kb_dir=".marqdo/agent-kb" slug=`qslug` reason=`failure`

> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
> sys.env_set name="QDAGENT_TASK" value=`task`
> sys.env_set name="QDAGENT_FAILURE" value=`failure`
> sys.env_set name="QDAGENT_DECISION" value=`decision`
> sys.env_set name="QDAGENT_CONSTRAINT" value=`constraint`

`args` =

| a |
|---|
| "-c" |
| if [ -n "$QDAGENT_FAILURE" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --failure "$QDAGENT_FAILURE" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; elif [ -n "$QDAGENT_DECISION" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --decision-title "$QDAGENT_DECISION" --decision-body "$QDAGENT_DECISION" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; elif [ -n "$QDAGENT_CONSTRAINT" ]; then marqdo knowledge learn --task "$QDAGENT_TASK" --constraint-title "$QDAGENT_CONSTRAINT" --constraint-body "$QDAGENT_CONSTRAINT" "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; else marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT"; fi |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = [code](proc)**
**stdout = [stdout](proc)**
**stderr = [stderr](proc)**
1. `code` != 0
  `fail` =

  | ok | error | stderr |
  |----|-------|--------|
  | False | learn_failed | `stderr` |

  *fail*

`ret` =

| ok | stdout |
|----|--------|
| True | `stdout` |

*ret*

## run
    + `task`
    + `mode`="build"
    + `root`="."
    + `out`=".marqdo"

Dispatch ASK / BUILD / LEARN.

1. `mode` == "ask"
  *> ask task=`task` root=`root` out=`out`*
2. `mode` == "learn"
  *> learn task=`task` root=`root` out=`out`*
3. *
  *> build task=`task` root=`root` out=`out`*

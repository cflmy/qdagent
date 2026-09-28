---
title: agent/qdagent
description: >-
  求道 — Executable Engineering Knowledge Agent.
  Modes: ASK / BUILD / LEARN. Marqdo Agent is the only runtime (eng_preflight=True).
import pf:preflight.mq.md
import ctx:../knowledge/context.mq.md
import resolver:../knowledge/resolver.mq.md
import metrics:../knowledge/metrics.mq.md
import run:../execution/run.mq.md
import verify:../execution/verify.mq.md
import record:../execution/record.mq.md
import agent:ext/ai/agent.mq.md
import llm:ext/ai/llm.mq.md
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
---

## ensure_llm

> llm.load_env path=".env"
**key = > sys.env_get name="OPENAI_API_KEY"**
1. not `key`
  **key = > sys.env_get name="MARQDO_LLM_API_KEY"**
*key*

## ask
    + `task`
    + `root`="."
    + `out`=".marqdo"

ASK — knowledge query. Preflight first; answer with engineering context. No code mutation required.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](pack)**
1. not `ok`
  *pack*

**wb = > run.create task=`task` intent="ask" surface="ask"**
**slug = [slug](wb)**
**decision = [decision](pack)**
**allowed = [create_allowed](pack)**
**path = [context_path](pack)**
> run.attach_preflight slug=`slug` decision=`decision` create_allowed=`allowed` context_path=`path`

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
1. `key`
  **model = > llm.llm**
  **standing = "你是求道工程知识助手。优先引用 Preflight / Capability / Constraint / Failure。不要发明第二套架构。Context pack: " + `path`**
  **助手 = > agent.agent model=`model` standing=`standing`**
  **out = > `助手`.step task=`task` writeback=True**
  **status = > json.get value=`out` key="status"**
  1. `status` == "ok"
    **result = > json.get value=`out` key="result"**
    **mode = "live"**
  2. *
    **result = > json.get value=`out` key="error"**
    **mode = "error"**
2. *
  **result = "（无 API Key）Preflight decision=" + `decision` + " context=" + `path`**
  **mode = "dry"**

> run.attach_result slug=`slug` result=`result`
`ret` =

| ok | mode | slug | decision | context_path | result |
|----|------|------|----------|--------------|--------|
| True | `mode` | `slug` | `decision` | `path` | `result` |

*ret*

## build
    + `task`
    + `root`="."
    + `out`=".marqdo"
    + `force_create`=False

BUILD — Preflight → Reuse Gate → Marqdo Agent (eng_preflight=True) → Workbook.

**pack = > pf.run task=`task` root=`root` out=`out`**
**ok = [ok](pack)**
1. not `ok`
  *pack*

**decision = [decision](pack)**
**allowed = [create_allowed](pack)**
**path = [context_path](pack)**

1. `decision` == "CREATE"
  1. not `allowed`
    1. not `force_create`
      `blocked` =

      | ok | status | decision | create_allowed | context_path | error |
      |----|--------|----------|----------------|--------------|-------|
      | False | blocked | CREATE | False | `path` | reuse_gate_blocked |

      *blocked*

**wb = > run.create task=`task` intent="build" surface="build"**
**slug = [slug](wb)**
> run.attach_preflight slug=`slug` decision=`decision` create_allowed=`allowed` context_path=`path`
**pf_body = [preflight](pack)**
**existing = > json.get value=`pf_body` key="existing"**
**existing_s = > json.stringify value=`existing`**
> run.put_section slug=`slug` section="Existing Capabilities" content=`existing_s`
> run.attach_decision slug=`slug` decision=`decision`
> run.set_status slug=`slug` status="executing"

**key = > ensure_llm**
**result = ""**
**mode = "dry"**
1. `key`
  **model = > llm.llm**
  **standing = "你是求道工程智能体。必须遵守 Context Pack 与 REUSE/ADAPT/CREATE。禁止再造第二套 Agent Runtime 或 EKC。Context: " + `path`**
  **助手 = > agent.agent model=`model` standing=`standing`**
  **out = > `助手`.plan goal=`task` eng_preflight=True marqdo_dir=`out` writeback=True max_rounds=4**
  **status = > json.get value=`out` key="status"**
  1. `status` == "ok"
    **result = > json.stringify value=`out`**
    **mode = "live"**
  2. `status` == "blocked"
    **result = > json.stringify value=`out`**
    **mode = "blocked"**
  3. *
    **result = > json.stringify value=`out`**
    **mode = "error"**
2. *
  **result = "（无 API Key）BUILD dry-run decision=" + `decision` + " context=" + `path`**
  **mode = "dry"**

> run.attach_result slug=`slug` result=`result`

**v = > verify.run slug=`slug` root=`root` out=`out` l1_ok=True**
**promote = [promote_allowed](v)**
**kpi = > metrics.read out=`out`**
**kpi_s = > json.stringify value=`kpi`**
> run.put_section slug=`slug` section="Metrics" content=`kpi_s`
1. `promote`
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="L3 passed" promote_allowed=True
2. *
  > record.from_workbook workbook_slug=`slug` capability=`task` evidence=`path` verification="pending" promote_allowed=False

`ret` =

| ok | mode | slug | decision | create_allowed | context_path | promote_allowed | result |
|----|------|------|----------|----------------|--------------|-----------------|--------|
| True | `mode` | `slug` | `decision` | `allowed` | `path` | `promote` | `result` |

*ret*

## learn
    + `task`=""
    + `root`="."
    + `out`=".marqdo"
    + `failure`=""
    + `decision`=""
    + `constraint`=""

LEARN — feed Marqdo knowledge learn (official compiler). No second skill framework.

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

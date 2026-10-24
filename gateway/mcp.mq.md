---
markup: occlusion
title: gateway/mcp
description: >-
  MCP product surface for Engineering Knowledge tools.
  Internals call knowledge / agent / execution — never a second Agent framework.
import:
  pf: ../agent/preflight.mq.md
  resolver: ../knowledge/resolver.mq.md
  verify: ../execution/verify.mq.md
  record: ../execution/record.mq.md
  promote: ../execution/promote.mq.md
  qd: ../agent/qdagent.mq.md
  api: ../lib/api.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## qd_preflight
    + `task`=""
    + `payload`=None

1. `payload`
  **t = > json.get value=`payload` key="task"**
  1. `t`
    **task = `t`**
1. not `task`
  `fail` =

  | ok | error |
  |----|-------|
  | False | task_required |

  *fail*
*> pf.run task=`task`*

## qd_reuse
    + `task`=""
    + `payload`=None

1. `payload`
  **t = > json.get value=`payload` key="task"**
  1. `t`
    **task = `t`**
1. not `task`
  `fail` =

  | ok | error |
  |----|-------|
  | False | task_required |

  *fail*
*> resolver.reuse task=`task`*

## qd_capability
    + `query`=""
    + `payload`=None

1. `payload`
  **q = > json.get value=`payload` key="query"**
  1. `q`
    **query = `q`**
  **t = > json.get value=`payload` key="task"**
  1. `t`
    1. not `query`
      **query = `t`**
1. not `query`
  `fail` =

  | ok | error |
  |----|-------|
  | False | query_required |

  *fail*
*> resolver.find query=`query`*

## qd_verify
    + `payload`=None

L3 suite bundled: marqdo verify + duplicate + conflicts + stale (exit codes).
For JSON reports use qd_impact / qd_conflicts / qd_stale / qd_duplicate.

*> verify.run*

## qd_impact
    + `paths`=""
    + `payload`=None

1. `payload`
  **p = > json.get value=`payload` key="paths"**
  1. `p`
    **paths = `p`**
*> resolver.impact paths=`paths`*

## qd_conflicts
    + `payload`=None

*> resolver.conflicts*

## qd_stale
    + `payload`=None

*> resolver.stale*

## qd_duplicate
    + `payload`=None

*> resolver.duplicate*

## qd_record
    + `capability`=""
    + `evidence`=""
    + `verification`=""
    + `promote_allowed`=False
    + `payload`=None

1. `payload`
  **c = > json.get value=`payload` key="capability"**
  1. `c`
    **capability = `c`**
  **e = > json.get value=`payload` key="evidence"**
  1. `e`
    **evidence = `e`**
  **v = > json.get value=`payload` key="verification"**
  1. `v`
    **verification = `v`**
  **p = > json.get value=`payload` key="promote_allowed"**
  1. `p`
    **promote_allowed = `p`**
1. not `capability`
  `fail` =

  | ok | error |
  |----|-------|
  | False | capability_required |

  *fail*
*> record.write_candidate capability=`capability` evidence=`evidence` verification=`verification` promote_allowed=`promote_allowed`*

## qd_candidates
    + `status`=""
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="status"**
  1. `s`
    **status = `s`**
*> promote.list status=`status`*

## qd_promote
    + `slug`=""
    + `kind`="decision"
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="slug"**
  1. `s`
    **slug = `s`**
  **k = > json.get value=`payload` key="kind"**
  1. `k`
    **kind = `k`**
1. not `slug`
  `fail` =

  | ok | error |
  |----|-------|
  | False | slug_required |

  *fail*
*> promote.promote slug=`slug` kind=`kind`*

## qd_reject
    + `slug`=""
    + `reason`="rejected"
    + `payload`=None

1. `payload`
  **s = > json.get value=`payload` key="slug"**
  1. `s`
    **slug = `s`**
  **r = > json.get value=`payload` key="reason"**
  1. `r`
    **reason = `r`**
1. not `slug`
  `fail` =

  | ok | error |
  |----|-------|
  | False | slug_required |

  *fail*
*> promote.reject slug=`slug` reason=`reason`*

## qd_learn
    + `task`=""
    + `failure`=""
    + `payload`=None

1. `payload`
  **t = > json.get value=`payload` key="task"**
  1. `t`
    **task = `t`**
  **f = > json.get value=`payload` key="failure"**
  1. `f`
    **failure = `f`**
*> qd.learn task=`task` failure=`failure`*

## qd_kb_status
    + `kb_root`=""
    + `payload`=None

Knowledge UI state machine snapshot (corpus/drafts/published + reuse metrics).

1. `payload`
  **k = > json.get value=`payload` key="kb_root"**
  1. `k`
    **kb_root = `k`**
*> api.eng_kb_status kb_root=`kb_root`*

## qd_import
    + `path`=""
    + `kb_root`=""
    + `publish`=False
    + `title`=""
    + `payload`=None

TXT/Markdown import via document.extract. PDF failures are explicit.

1. `payload`
  **p = > json.get value=`payload` key="path"**
  1. `p`
    **path = `p`**
  **k = > json.get value=`payload` key="kb_root"**
  1. `k`
    **kb_root = `k`**
  **t = > json.get value=`payload` key="title"**
  1. `t`
    **title = `t`**
  **pb = > json.get value=`payload` key="publish"**
  1. `pb`
    **publish = `pb`**
*> api.eng_import path=`path` kb_root=`kb_root` title=`title` publish=`publish`*

## qd_bind
    + `query`=""
    + `project`="."
    + `policy`="pure"
    + `payload`=None

Actual reuse: eng_bind_execute (never discovery_only as success).

1. `payload`
  **q = > json.get value=`payload` key="query"**
  1. `q`
    **query = `q`**
  **p = > json.get value=`payload` key="project"**
  1. `p`
    **project = `p`**
  **pol = > json.get value=`payload` key="policy"**
  1. `pol`
    **policy = `pol`**
*> qd.try_bind_execute project=`project` query=`query` policy=`policy`*

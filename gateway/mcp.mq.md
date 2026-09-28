---
title: gateway/mcp
description: >-
  MCP product surface for Engineering Knowledge tools.
  Internals call knowledge / agent / execution — never a second Agent framework.
import pf:../agent/preflight.mq.md
import resolver:../knowledge/resolver.mq.md
import verify:../execution/verify.mq.md
import record:../execution/record.mq.md
import promote:../execution/promote.mq.md
import qd:../agent/qdagent.mq.md
import table:lib/table.mq.md
import json:lib/json.mq.md
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

*> verify.run*

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

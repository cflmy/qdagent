---
title: agent/preflight
description: >-
  qdagent Engineering Preflight façade — wraps knowledge/context (CLI Context Pack).
  Zero LLM. Does not reimplement EKC; consumes marqdo knowledge preflight.
import ctx:../knowledge/context.mq.md
---

## run
    + `task`
    + `root`="."
    + `out`=".marqdo"

Product Preflight → Engineering Context Pack under `.marqdo/agent/contexts/`.

*> ctx.preflight task=`task` root=`root` out=`out`*

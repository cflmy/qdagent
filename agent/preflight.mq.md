---
markup: occlusion
title: agent/preflight
description: >-
  qdagent Engineering Preflight façade — product Context Pack via
  `marqdo knowledge preflight` (zero LLM). Process-internal latch
  (`agent.preflight` / `eng_reuse` / `eng_record`) lives in agent/qdagent.latch_efi.
import:
  ctx: ../knowledge/context.mq.md
---

## run
    + `task`
    + `root`="."
    + `out`=".marqdo"

Product Preflight → Engineering Context Pack under `.marqdo/agent/contexts/`.

*> ctx.preflight task=`task` root=`root` out=`out`*

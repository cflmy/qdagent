---
markup: occlusion
title: agent/tools/workspace_read
description: >-
  Q-A4 workspace.read — bounded range read with digest/revision check.
  Truncation labeled via next_cursor; never claims full file silently.
import:
  workspace_tools: ../../lib/workspace_tools.mq.md
---

## run
    + `path`=""
    + `root`="."
    + `digest`=""
    + `line_start`=0
    + `line_end`=0
    + `max_bytes`=65536
    + `cursor`=""

*> workspace_tools.read path=`path` root=`root` digest=`digest` line_start=`line_start` line_end=`line_end` max_bytes=`max_bytes` cursor=`cursor`*

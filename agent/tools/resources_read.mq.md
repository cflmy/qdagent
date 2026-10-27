---
markup: occlusion
title: agent/tools/resources_read
description: >-
  Q-A4 resources.read — bounded range read for model/UI; same safety as
  workspace_read (digest, cursor, max_bytes). Never executes Marqdo.
import:
  workspace_read: workspace_read.mq.md
---

## run
    + `path`=""
    + `root`="."
    + `digest`=""
    + `line_start`=0
    + `line_end`=0
    + `max_bytes`=65536
    + `cursor`=""

*> workspace_read.run path=`path` root=`root` digest=`digest` line_start=`line_start` line_end=`line_end` max_bytes=`max_bytes` cursor=`cursor`*

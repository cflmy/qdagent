---
markup: occlusion
title: agent/tools/workspace_search
description: >-
  Q-A4 workspace.search — path/content hits with line locators.
  Hits are clues; use workspace_read for ranges (never silent full-file).
import:
  workspace_tools: ../../lib/workspace_tools.mq.md
---

## run
    + `query`=""
    + `path`=""
    + `root`="."
    + `cursor`=0
    + `limit`=20

*> workspace_tools.search query=`query` path=`path` root=`root` cursor=`cursor` limit=`limit`*

---
markup: occlusion
title: agent/tools/notes_search
description: >-
  Q-A4 notes.search — search under notes root (default data/); hits carry
  path+line locators for note_read. Never executes Marqdo.
import:
  workspace_tools: ../../lib/workspace_tools.mq.md
---

## run
    + `query`=""
    + `path`=""
    + `root`="data"
    + `cursor`=0
    + `limit`=20

*> workspace_tools.search query=`query` path=`path` root=`root` cursor=`cursor` limit=`limit`*

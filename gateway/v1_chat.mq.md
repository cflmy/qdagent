---
markup: occlusion
title: gateway/v1_chat
description: >-
  Entry for thin /v1 compatibility process — reads QDAGENT_TASK / QDAGENT_MODE,
  delegates to gateway/openai.chat (Marqdo Agent path).
import:
  gw: openai.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
---

# main

**task = > sys.env_get name="QDAGENT_TASK"**
1. not `task`
  **task = "ping"**
**mode = > sys.env_get name="QDAGENT_MODE"**
1. not `mode`
  **mode = ""**

**out = > gw.chat message=`task` mode=`mode`**
**s = > json.stringify value=`out`**
> print text=`s`
*""*

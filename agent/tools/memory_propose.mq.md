---
markup: occlusion
title: agent/tools/memory_propose
description: >-
  Q-A6 memory.propose — create a proposed profile item (never auto-confirmed).
  Requires source_refs when available; never upgrades speculation silently.
import:
  profile_items: ../../lib/profile_items.mq.md
---

## run
    + `text`=""
    + `category`="preference"
    + `scope`="user"
    + `workspace_id`=""
    + `session_id`=""
    + `source_refs`=""

*> profile_items.propose text=`text` category=`category` scope=`scope` workspace_id=`workspace_id` session_id=`session_id` source_refs=`source_refs`*

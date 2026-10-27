---
markup: occlusion
title: agent/tools/memory_forget
description: >-
  Q-A6 memory.forget — mark a profile item forgotten (auditable, not injectable).
  Never deletes silently; never upgrades speculation to permanent memory.
import:
  profile_items: ../../lib/profile_items.mq.md
---

## run
    + `id`=""

*> profile_items.set_status id=`id` status="forgotten"*

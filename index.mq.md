---
title: 求道
description: >-
  Entry shim — delegates to serve.mq.md (Marqdo 1.3 Document/Endpoint Gateway).
  Prefer `marqdo run serve.mq.md`; this file keeps historical `run index.mq.md` working.
  `api` must be imported here too: HTTP invoke resolves `lib.member` on the
  site entry module (call_lib_path), not on serve.
import serve:serve.mq.md
import api:lib/api.mq.md
---

# main

*> serve.main*

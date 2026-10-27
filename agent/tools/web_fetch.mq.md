---
markup: occlusion
title: agent/tools/web_fetch
description: >-
  Q-A5 product web.fetch — URL → bounded text + evidence metadata.
  SSRF/size/redirect guarded; trust always unverified.
import:
  web_fetch: ../../lib/web_fetch.mq.md
---

## run
    + `url`=""
    + `max_bytes`=524288
    + `timeout_s`=20

*> web_fetch.fetch url=`url` max_bytes=`max_bytes` timeout_s=`timeout_s`*

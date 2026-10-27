---
markup: occlusion
title: agent/tools/web_search
description: >-
  Q-A5 product web.search — query → hits with trust=unverified.
  Snippets are clues; fetch originals for answer-critical facts.
import:
  web_search: ../../lib/web_search.mq.md
---

## run
    + `query`=""
    + `limit`=5

*> web_search.search query=`query` limit=`limit`*

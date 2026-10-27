---
markup: occlusion
title: agent/tools/artifacts_create
description: >-
  Q-A4 artifacts.create — versioned write under data/artifacts; fail if exists.
import:
  artifacts_write: ../../lib/artifacts_write.mq.md
---

## run
    + `path`=""
    + `root`="data/artifacts"
    + `content`=""
    + `media_type`="text/plain"

*> artifacts_write.create path=`path` root=`root` content=`content` media_type=`media_type`*

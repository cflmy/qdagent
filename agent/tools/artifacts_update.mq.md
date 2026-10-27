---
markup: occlusion
title: agent/tools/artifacts_update
description: >-
  Q-A4 artifacts.update — CAS write with expected_digest under data/artifacts.
import:
  artifacts_write: ../../lib/artifacts_write.mq.md
---

## run
    + `path`=""
    + `root`="data/artifacts"
    + `content`=""
    + `media_type`="text/plain"
    + `expected_digest`=""

*> artifacts_write.update path=`path` root=`root` content=`content` media_type=`media_type` expected_digest=`expected_digest`*

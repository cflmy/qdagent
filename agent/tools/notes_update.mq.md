---
markup: occlusion
title: agent/tools/notes_update
description: >-
  Q-A4 notes.update — CAS write with expected_digest; revision.conflict on mismatch.
  Never executes Marqdo.
import:
  notes_write: ../../lib/notes_write.mq.md
---

## run
    + `path`=""
    + `root`="data"
    + `content`=""
    + `expected_digest`=""

*> notes_write.update path=`path` root=`root` content=`content` expected_digest=`expected_digest`*

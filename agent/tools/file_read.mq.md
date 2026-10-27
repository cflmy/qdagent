---
markup: occlusion
title: agent/tools/file_read
description: >-
  Q-A4 read-only workspace file tool — same safety as note_read (no abs, no ..).
  Default root is `.` (current workspace). Never executes Marqdo.
import:
  note_read: note_read.mq.md
---

## run
    + `path`
    + `root`="."
    + `max_chars`=32000

*> note_read.run path=`path` root=`root` max_chars=`max_chars`*

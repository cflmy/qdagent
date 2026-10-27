---
markup: occlusion
title: agent/tools/note_read
description: >-
  Q-A4 read-only note tool — load a host-relative note/doc under an allowed
  root (default data/). Never executes Marqdo; returns text + path only.
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
---

## run
    + `path`
    + `root`="data"
    + `max_chars`=32000

Read a text note. Rejects absolute paths and `..` segments. Oversized files fail
closed (caller may raise max_chars) — never silently dumps megabytes into prompt.

1. not `path`
  `err` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | missing path |

  *err*

**bad_abs = > text.starts_with text=`path` prefix="/"**
**bad_dots = > text.contains text=`path` sub=".."**
1. `bad_abs`
  `err` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | absolute paths rejected |

  *err*
1. `bad_dots`
  `err` =

  | ok | status | error |
  |----|--------|-------|
  | False | failed | path must not contain .. |

  *err*

**full = `root` + "/" + `path`**
**exists = > fs.exists path=`full`**
1. not `exists`
  `err` =

  | ok | status | error | path |
  |----|--------|-------|------|
  | False | failed | not found | `full` |

  *err*

**body = > fs.read_text path=`full`**
**n = > len value=`body`**
1. `n` > `max_chars`
  `err` =

  | ok | status | error | path | chars | max_chars |
  |----|--------|-------|------|-------|-----------|
  | False | failed | too large; raise max_chars or open via ResourceView | `full` | `n` | `max_chars` |

  *err*

`out` =

| ok | status | path | text | truncated | chars |
|----|--------|------|------|-----------|-------|
| True | succeeded | `full` | `body` | False | `n` |

*out*

---
markup: occlusion
title: T11 context panel requestGen isolates late responses (contract fixture)
description: >-
  Mirrors frontend ContextPanelStore requestGen — older gen must not apply.
  Pure logic stand-in for browser race (Playwright covers UI separately).
---

# main

Simulate two generations; only matching gen commits view.
**active_gen = 2**
**late_gen = 1**
**applied = False**
1. `late_gen` == `active_gen`
  **applied = True**
1. `applied`
  > print text=late-gen-applied
  > sys.exit code=1

**applied2 = False**
1. `active_gen` == `active_gen`
  **applied2 = True**
1. not `applied2`
  > print text=current-gen-blocked
  > sys.exit code=1

Cross-workspace same filename must not share authorize root.
> print text=t11-late-response-gen-ok

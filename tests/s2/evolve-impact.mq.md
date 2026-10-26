---
markup: occlusion
title: S2 evolve — impact + generation identity
description: >-
  Offline: after ensuring layout, refuse_mixed_generation reports CURRENT/
  publish_manifest presence; impact call is well-formed (ok or structured error).
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  evo: ../../knowledge/evolve.mq.md
---

# main

**kinds = > evo.kinds**
> print text=kinds-ok

**tmpfile = > fs.make_temp**
> fs.remove path=`tmpfile`
**tmpdir = `tmpfile`**
> fs.make_dir path=`tmpdir`
**kb = `tmpdir` + "/kb"**
> fs.make_dir path=`kb`
> fs.make_dir path=`kb` + "/knowledge"
> fs.make_dir path=`kb` + "/.marqdo"
**gen = > evo.refuse_mixed_generation kb_root=`kb`**
**ok = access(gen, "ok")**
1. not `ok`
  > print text=generation-FAIL
  > sys.exit code=1
> print text=generation-ok

Vendored Marqdo baseline fixture.
fs.exists is sandbox-relative to this file; evolve.impact resolves project from process cwd (repo root).

**proj = "tests/fixtures/executable_knowledge/baseline/02-extract"**
**check = "../fixtures/executable_knowledge/baseline/02-extract/main.mq.md"**
**has_proj = > fs.exists path=`check`**
1. not `has_proj`
  > print text=no-baseline-fixture-skip-impact
  > print text=s2-evolve-impact-partial-ok
  *"s2-evolve-impact-partial-ok"*
**imp = > evo.impact project=`proj` artifact_id="商品小计"**
**s = > json.stringify value=`imp`**
> print text=`s`
> print text=s2-evolve-impact-ok
*"s2-evolve-impact-ok"*

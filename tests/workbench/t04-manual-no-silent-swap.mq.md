---
markup: occlusion
title: T04 manual selection does not silently swap provider
import:
  registry: lib/registry.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

> registry.migrate_legacy_settings

**sel = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"mdl-legacy-default\"}"**
**a = > registry.resolve_selection model_id="mdl-legacy-default" selection=`sel`**
**aok = > json.get value=`a` key="ok"**
1. not `aok`
  > print text=resolve-fail
  > print text=`a`
  > sys.exit code=1

**mid = > json.get value=`a` key="model_id"**
**pid = > json.get value=`a` key="provider_id"**
1. not `mid` == "mdl-legacy-default"
  > print text=model-swapped
  > print text=`mid`
  > sys.exit code=1
1. not `pid`
  > print text=provider-missing
  > sys.exit code=1

**bad_sel = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"mdl-does-not-exist\"}"**
**bad = > registry.resolve_selection model_id="mdl-does-not-exist" selection=`bad_sel`**
**bok = > json.get value=`bad` key="ok"**
1. `bok`
  > print text=should-fail-closed
  > print text=`bad`
  > sys.exit code=1

> print text=t04-manual-no-silent-swap-ok

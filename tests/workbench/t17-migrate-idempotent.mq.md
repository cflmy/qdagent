---
markup: occlusion
title: T17 legacy settings migrate is idempotent
import:
  registry: lib/registry.mq.md
  json: lib/json.mq.md
---

# main

**a = > registry.migrate_legacy_settings**
**ok1 = > json.get value=`a` key="ok"**
1. not `ok1`
  > print text=migrate-fail-1
  > print text=`a`
  > sys.exit code=1

**b = > registry.migrate_legacy_settings**
**ok2 = > json.get value=`b` key="ok"**
**idem = > json.get value=`b` key="idempotent"**
1. not `ok2`
  > print text=migrate-fail-2
  > sys.exit code=1
1. not `idem`
  > print text=migrate-not-idempotent
  > print text=`b`
  > sys.exit code=1

**snap = > registry.resolve_selection model_id="mdl-legacy-default" selection=None**
**sok = > json.get value=`snap` key="ok"**
1. not `sok`
  > print text=resolve-legacy-fail
  > print text=`snap`
  > sys.exit code=1

**pub = > registry.public_snapshot snap=`snap`**
**key = > json.get value=`pub` key="api_key"**
1. `key`
  > print text=public-snapshot-leaked-key
  > sys.exit code=1

> print text=t17-migrate-ok

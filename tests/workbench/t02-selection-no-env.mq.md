---
markup: occlusion
title: T02 / A02 selection must not require process env mutation
description: >-
  Two sequential resolve_selection calls with different model ids must return
  distinct upstream ids without depending on OPENAI_MODEL env.
import:
  registry: lib/registry.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
---

# main

> registry.migrate_legacy_settings

Poison ambient env — snapshots must still resolve from registry rows.
> sys.env_set name="OPENAI_MODEL" value="env-poison-model"

**sel_a = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"mdl-legacy-default\"}"**
**a = > registry.resolve_selection model_id="mdl-legacy-default" selection=`sel_a`**
**ok_a = > json.get value=`a` key="ok"**
**up_a = > json.get value=`a` key="upstream_model_id"**
1. not `ok_a`
  > print text=resolve-a-fail
  > print text=`a`
  > sys.exit code=1
1. `up_a` == "env-poison-model"
  > print text=a-used-poison-env
  > sys.exit code=1

**env_now = > sys.env_get name="OPENAI_MODEL"**
1. not `env_now` == "env-poison-model"
  > print text=env-was-clobbered
  > print text=`env_now`
  > sys.exit code=1

> print text=t02-selection-no-env-ok
> print text=`up_a`

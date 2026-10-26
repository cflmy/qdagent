---
markup: occlusion
title: T01 dual provider same upstream id
description: >-
  Two providers each with a model sharing upstream id "shared-upstream".
  resolve_selection must hit the correct provider base_url by composite identity.
import:
  registry: lib/registry.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  sys: lib/sys.mq.md
---

# main

**pa_in = > json.parse text="{\"id\":\"prov-t01-a\",\"display_name\":\"Provider A\",\"adapter\":\"openai-compatible\",\"base_url\":\"https://a.example/v1\",\"credential_action\":\"replace\",\"credential\":\"key-a\"}"**
**pb_in = > json.parse text="{\"id\":\"prov-t01-b\",\"display_name\":\"Provider B\",\"adapter\":\"openai-compatible\",\"base_url\":\"https://b.example/v1\",\"credential_action\":\"replace\",\"credential\":\"key-b\"}"**
**pa = > registry.save_provider payload=`pa_in`**
**pb = > registry.save_provider payload=`pb_in`**
**pa_ok = > json.get value=`pa` key="ok"**
**pb_ok = > json.get value=`pb` key="ok"**
1. not `pa_ok`
  > print text=save-provider-a-fail
  > print text=`pa`
  > sys.exit code=1
1. not `pb_ok`
  > print text=save-provider-b-fail
  > print text=`pb`
  > sys.exit code=1

**ma_in = > json.parse text="{\"id\":\"mdl-t01-a\",\"provider_id\":\"prov-t01-a\",\"upstream_model_id\":\"shared-upstream\",\"display_name\":\"Shared on A\"}"**
**mb_in = > json.parse text="{\"id\":\"mdl-t01-b\",\"provider_id\":\"prov-t01-b\",\"upstream_model_id\":\"shared-upstream\",\"display_name\":\"Shared on B\"}"**
**ma = > registry.save_model payload=`ma_in`**
**mb = > registry.save_model payload=`mb_in`**
**ma_ok = > json.get value=`ma` key="ok"**
**mb_ok = > json.get value=`mb` key="ok"**
1. not `ma_ok`
  > print text=save-model-a-fail
  > print text=`ma`
  > sys.exit code=1
1. not `mb_ok`
  > print text=save-model-b-fail
  > print text=`mb`
  > sys.exit code=1

**sa = > registry.resolve_selection model_id="mdl-t01-a" selection=None**
**sb = > registry.resolve_selection model_id="mdl-t01-b" selection=None**
**ba = > json.get value=`sa` key="base_url"**
**bb = > json.get value=`sb` key="base_url"**
**ua = > json.get value=`sa` key="upstream_model_id"**
**ub = > json.get value=`sb` key="upstream_model_id"**
1. not `ua` == "shared-upstream"
  > print text=upstream-a-wrong
  > sys.exit code=1
1. not `ub` == "shared-upstream"
  > print text=upstream-b-wrong
  > sys.exit code=1
1. not `ba` == "https://a.example/v1"
  > print text=base-a-wrong
  > print text=`ba`
  > sys.exit code=1
1. not `bb` == "https://b.example/v1"
  > print text=base-b-wrong
  > print text=`bb`
  > sys.exit code=1
1. `ba` == `bb`
  > print text=providers-collided
  > sys.exit code=1

**pub = > registry.public_snapshot snap=`sa`**
**leak = > json.get value=`pub` key="api_key"**
1. `leak`
  > print text=public-leaked-key
  > sys.exit code=1

> print text=t01-dual-provider-ok

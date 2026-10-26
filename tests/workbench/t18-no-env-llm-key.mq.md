---
markup: occlusion
title: T18 ensure_llm ignores OPENAI_API_KEY — registry only
import:
  registry: lib/registry.mq.md
  qd: ../../agent/qdagent.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

Create a provider with **no** credential, poison OPENAI_* env, and assert
`ensure_llm` still returns empty for that model (single registry path).

> sys.env_set name="OPENAI_API_KEY" value="env-poison-should-not-be-used"
> sys.env_set name="MARQDO_LLM_API_KEY" value="env-poison-marqdo"

**payload = > json.parse text="{\"id\":\"prov-t18-nocred\",\"display_name\":\"T18 NoCred\",\"adapter\":\"openai-compatible\",\"base_url\":\"https://example.invalid/v1\",\"auth_mode\":\"api_key\",\"credential_action\":\"clear\",\"enabled\":1}"**
**sp = > registry.save_provider payload=`payload`**
**pok = > json.get value=`sp` key="ok"**
1. not `pok`
  > print text=t18-save-provider-fail
  > print text=`sp`
  > sys.exit code=1

**mp = > json.parse text="{\"id\":\"mdl-t18-nocred\",\"provider_id\":\"prov-t18-nocred\",\"upstream_model_id\":\"t18-model\",\"display_name\":\"t18-model\",\"enabled\":1}"**
**sm = > registry.save_model payload=`mp`**
**mok = > json.get value=`sm` key="ok"**
1. not `mok`
  > print text=t18-save-model-fail
  > print text=`sm`
  > sys.exit code=1

**sel = > json.parse text="{\"mode\":\"manual\",\"model_id\":\"mdl-t18-nocred\"}"**
**key = > qd.ensure_llm model_id="mdl-t18-nocred" selection=`sel`**
1. `key`
  > print text=t18-fail-env-key-leaked
  > print text=`key`
  > sys.exit code=1

> print text=t18-no-env-llm-key-ok

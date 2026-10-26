---
markup: occlusion
title: lib/registry
description: >-
  Provider / Model / Credential registry (Q01). Resolves ModelSelection without
  mutating process env so concurrent sessions cannot clobber each other.
import:
  db: ../db/index.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  time: lib/time.mq.md
  text: lib/text.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  net: lib/net.mq.md
---

## list_providers

Ensure legacy settings migration + credential repair before listing (T17 idempotent).
> migrate_legacy_settings
> repair_legacy_credentials

**store = > db.open**
**rows = > `store`.select table="providers" limit=200 order="-updated_at"**
**out = > table.empty_list**
1. `rows`
  - [p](遍历 rows 为 p)
    **ref = [credential_ref](access(p, "credential_ref"))**
    **configured = False**
    1. `ref`
      **cred = > `store`.get table="credentials" id=`ref`**
      1. `cred`
        **cflag = [configured](access(cred, "configured"))**
        1. `cflag`
          **configured = True**
        2. *
          **secret = [secret](access(cred, "secret"))**
          1. `secret`
            **configured = True**
    **pid = [id](access(p, "id"))**
    **mods = > `store`.select table="models" limit=200**
    **model_list = > table.empty_list**
    1. `mods`
      - [m](遍历 mods 为 m)
        **mp = [provider_id](access(m, "provider_id"))**
        1. `mp` == `pid`
          **mid = [id](access(m, "id"))**
          **uname = [upstream_model_id](access(m, "upstream_model_id"))**
          **dname = [display_name](access(m, "display_name"))**
          **men = [enabled](access(m, "enabled"))**
          **mrev = [revision](access(m, "revision"))**
          `mrow` =

          | id | provider_id | upstream_model_id | display_name | enabled | revision |
          |----|-------------|-------------------|--------------|---------|----------|
          | `mid` | `pid` | `uname` | `dname` | `men` | `mrev` |

          **model_list = > table.append list=`model_list` item=`mrow`**
    **id = [id](access(p, "id"))**
    **name = [display_name](access(p, "display_name"))**
    **adapter = [adapter](access(p, "adapter"))**
    **base = [base_url](access(p, "base_url"))**
    **auth = [auth_mode](access(p, "auth_mode"))**
    **en = [enabled](access(p, "enabled"))**
    **rev = [revision](access(p, "revision"))**
    `prow` =

    | id | display_name | adapter | base_url | auth_mode | enabled | revision | credential_configured | models |
    |----|--------------|---------|----------|-----------|---------|----------|------------------------|--------|
    | `id` | `name` | `adapter` | `base` | `auth` | `en` | `rev` | `configured` | `model_list` |

    **out = > table.append list=`out` item=`prow`**
`ret` =

| ok | providers |
|----|-----------|
| True | `out` |

*ret*

## list_models
    + `workspace_id`=""

Catalog of enabled models (no secrets). Optional workspace filter reserved.

**store = > db.open**
**rows = > `store`.select table="models" limit=500 order="-updated_at"**
**out = > table.empty_list**
1. `rows`
  - [m](遍历 rows 为 m)
    **en = [enabled](access(m, "enabled"))**
    1. `en`
      **mid = [id](access(m, "id"))**
      **pid = [provider_id](access(m, "provider_id"))**
      **uname = [upstream_model_id](access(m, "upstream_model_id"))**
      **dname = [display_name](access(m, "display_name"))**
      **rev = [revision](access(m, "revision"))**
      **prov = > `store`.get table="providers" id=`pid`**
      **pname = ""**
      **adapter = ""**
      **cred_ok = False**
      1. `prov`
        **pname = [display_name](access(prov, "display_name"))**
        **adapter = [adapter](access(prov, "adapter"))**
        **cref = [credential_ref](access(prov, "credential_ref"))**
        **auth = [auth_mode](access(prov, "auth_mode"))**
        1. `auth` == "none"
          **cred_ok = True**
        1. `cref`
          **cred = > `store`.get table="credentials" id=`cref`**
          1. `cred`
            **sec = [secret](access(cred, "secret"))**
            1. `sec`
              **cred_ok = True**
      `mrow` =

      | id | provider_id | provider_name | adapter | upstream_model_id | display_name | enabled | revision | credential_configured |
      |----|-------------|---------------|---------|-------------------|--------------|---------|----------|------------------------|
      | `mid` | `pid` | `pname` | `adapter` | `uname` | `dname` | `en` | `rev` | `cred_ok` |

      **out = > table.append list=`out` item=`mrow`**
`ret` =

| ok | models | workspace_id |
|----|--------|--------------|
| True | `out` | `workspace_id` |

*ret*

## save_provider
    + `payload`=None

Create or revision-update a provider. Credential via credential_action keep|replace|clear.
Never echoes secrets.

1. not `payload`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | payload required | resource.not_found |

  *need*

**store = > db.open**
**u = > time.now_unix**
**pid = > json.get value=`payload` key="id"**
**name = > json.get value=`payload` key="display_name"**
**adapter = > json.get value=`payload` key="adapter"**
**base = > json.get value=`payload` key="base_url"**
**auth = > json.get value=`payload` key="auth_mode"**
**enabled = > json.get value=`payload` key="enabled"**
**expected = > json.get value=`payload` key="expected_revision"**
**cred_action = > json.get value=`payload` key="credential_action"**
**cred_value = > json.get value=`payload` key="credential"**
1. not `cred_action`
  **cred_action = "keep"**
1. not `adapter`
  **adapter = "openai-compatible"**
1. not `auth`
  **auth = "bearer"**
1. not `enabled`
  **enabled = 1**

1. `pid`
  **cur = > `store`.get table="providers" id=`pid`**
  1. `cur`
    **crev = [revision](access(cur, "revision"))**
    1. `expected`
      1. not `expected` == `crev`
        `conflict` =

        | ok | error | code | expected | actual |
        |----|-------|------|----------|--------|
        | False | revision conflict | revision.conflict | `expected` | `crev` |

        *conflict*
    **row = > table.empty_map**
    1. `name`
      **row = > table.put in=`row` at="display_name" value=`name`**
    1. `adapter`
      **row = > table.put in=`row` at="adapter" value=`adapter`**
    1. `base`
      **row = > table.put in=`row` at="base_url" value=`base`**
    1. `auth`
      **row = > table.put in=`row` at="auth_mode" value=`auth`**
    1. `enabled` == False
      **row = > table.put in=`row` at="enabled" value=0**
    2. `enabled` == 0
      **row = > table.put in=`row` at="enabled" value=0**
    3. *
      1. `enabled`
        **row = > table.put in=`row` at="enabled" value=1**
    **nrev = `crev` + 1**
    **row = > table.put in=`row` at="revision" value=`nrev`**
    **row = > table.put in=`row` at="updated_at" value=`u`**
    **cref = [credential_ref](access(cur, "credential_ref"))**
    1. not `cref`
      **cref = "cred-" + `pid`**
      **row = > table.put in=`row` at="credential_ref" value=`cref`**
    1. `cred_action` == "replace"
      1. not `cred_value`
        `needc` =

        | ok | error | code |
        |----|-------|------|
        | False | credential required for replace | model.unavailable |

        *needc*
      **cred = > `store`.get table="credentials" id=`cref`**
      1. `cred`
        **cv = [version](access(cred, "version"))**
        **nv = `cv` + 1**
        `cpatch` =

        | secret | configured | version | updated_at |
        |--------|------------|---------|------------|
        | `cred_value` | 1 | `nv` | `u` |

        > `store`.update table="credentials" id=`cref` row=`cpatch`
      2. *
        `cins` =

        | id | version | secret | configured | owner_scope | created_at | updated_at |
        |----|---------|--------|------------|-------------|------------|------------|
        | `cref` | 1 | `cred_value` | 1 | app | `u` | `u` |

        > `store`.insert table=credentials rows=`cins`
    2. `cred_action` == "clear"
      1. `cref`
        `cclear` =

        | secret | configured | updated_at |
        |--------|------------|------------|
        |  | 0 | `u` |

        > `store`.update table="credentials" id=`cref` row=`cclear`
    > `store`.update table="providers" id=`pid` row=`row`
    `okupd` =

    | ok | id | revision |
    |----|----|----------|
    | True | `pid` | `nrev` |

    *okupd*

1. not `name`
  `needn` =

  | ok | error | code |
  |----|-------|------|
  | False | display_name required | resource.not_found |

  *needn*
1. not `pid`
  **pid = "prov-" + `u`**
**cref = "cred-" + `pid`**
**configured = 0**
**secret = ""**
1. `cred_action` == "replace"
  1. `cred_value`
    **secret = `cred_value`**
    **configured = 1**
`cins` =

| id | version | secret | configured | owner_scope | created_at | updated_at |
|----|---------|--------|------------|-------------|------------|------------|
| `cref` | 1 | `secret` | `configured` | app | `u` | `u` |

> `store`.insert table=credentials rows=`cins`
1. not `base`
  **base = "https://api.openai.com/v1"**
`prow` =

| id | display_name | adapter | base_url | credential_ref | auth_mode | enabled | revision | created_at | updated_at |
|----|--------------|---------|----------|----------------|-----------|---------|----------|------------|------------|
| `pid` | `name` | `adapter` | `base` | `cref` | `auth` | `enabled` | 1 | `u` | `u` |

> `store`.insert table=providers rows=`prow`
`okins` =

| ok | id | revision |
|----|----|----------|
| True | `pid` | 1 |

*okins*

## save_model
    + `payload`=None

1. not `payload`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | payload required | resource.not_found |

  *need*

**store = > db.open**
**u = > time.now_unix**
**mid = > json.get value=`payload` key="id"**
**pid = > json.get value=`payload` key="provider_id"**
**uname = > json.get value=`payload` key="upstream_model_id"**
**dname = > json.get value=`payload` key="display_name"**
**enabled = > json.get value=`payload` key="enabled"**
**expected = > json.get value=`payload` key="expected_revision"**
1. not `enabled`
  **enabled = 1**
1. not `dname`
  **dname = `uname`**

1. `mid`
  **cur = > `store`.get table="models" id=`mid`**
  1. `cur`
    **crev = [revision](access(cur, "revision"))**
    1. `expected`
      1. not `expected` == `crev`
        `conflict` =

        | ok | error | code | expected | actual |
        |----|-------|------|----------|--------|
        | False | revision conflict | revision.conflict | `expected` | `crev` |

        *conflict*
    **row = > table.empty_map**
    1. `uname`
      **row = > table.put in=`row` at="upstream_model_id" value=`uname`**
    1. `dname`
      **row = > table.put in=`row` at="display_name" value=`dname`**
    1. `enabled` == False
      **row = > table.put in=`row` at="enabled" value=0**
    2. `enabled` == 0
      **row = > table.put in=`row` at="enabled" value=0**
    3. *
      1. `enabled`
        **row = > table.put in=`row` at="enabled" value=1**
    **nrev = `crev` + 1**
    **row = > table.put in=`row` at="revision" value=`nrev`**
    **row = > table.put in=`row` at="updated_at" value=`u`**
    > `store`.update table="models" id=`mid` row=`row`
    `okupd` =

    | ok | id | revision |
    |----|----|----------|
    | True | `mid` | `nrev` |

    *okupd*

1. not `pid`
  `needp` =

  | ok | error | code |
  |----|-------|------|
  | False | provider_id required | resource.not_found |

  *needp*
1. not `uname`
  `needu` =

  | ok | error | code |
  |----|-------|------|
  | False | upstream_model_id required | resource.not_found |

  *needu*
**prov = > `store`.get table="providers" id=`pid`**
1. not `prov`
  `nfp` =

  | ok | error | code |
  |----|-------|------|
  | False | provider not found | resource.not_found |

  *nfp*

**existing_mid = ""**
**allm = > `store`.select table="models" limit=500**
1. `allm`
  - [em](遍历 allm 为 em)
    **epid = [provider_id](access(em, "provider_id"))**
    **eup = [upstream_model_id](access(em, "upstream_model_id"))**
    1. `epid` == `pid`
      1. `eup` == `uname`
        **existing_mid = [id](access(em, "id"))**
1. `existing_mid`
  **cur2 = > `store`.get table="models" id=`existing_mid`**
  **crev2 = [revision](access(cur2, "revision"))**
  **nrev2 = `crev2` + 1**
  **row2 = > table.empty_map**
  1. `dname`
    **row2 = > table.put in=`row2` at="display_name" value=`dname`**
  1. `enabled` == False
    **row2 = > table.put in=`row2` at="enabled" value=0**
  2. `enabled` == 0
    **row2 = > table.put in=`row2` at="enabled" value=0**
  3. *
    **row2 = > table.put in=`row2` at="enabled" value=1**
  **row2 = > table.put in=`row2` at="revision" value=`nrev2`**
  **row2 = > table.put in=`row2` at="updated_at" value=`u`**
  > `store`.update table="models" id=`existing_mid` row=`row2`
  `okup` =

  | ok | id | revision | upserted |
  |----|----|----------|----------|
  | True | `existing_mid` | `nrev2` | True |

  *okup*

1. not `mid`
  **mid = "mdl-" + `u`**
`mrow` =

| id | provider_id | upstream_model_id | display_name | enabled | capabilities | limits | default_params | revision | created_at | updated_at |
|----|-------------|-------------------|--------------|---------|--------------|--------|----------------|----------|------------|------------|
| `mid` | `pid` | `uname` | `dname` | `enabled` |  |  |  | 1 | `u` | `u` |

> `store`.insert table=models rows=`mrow`
`okins` =

| ok | id | revision |
|----|----|----------|
| True | `mid` | 1 |

*okins*

## resolve_selection
    + `model_id`=""
    + `selection`=None

Resolve a ModelSnapshot for this request from the provider registry only.
Never reads settings.llm_* or process env for secrets / model identity.

1. `selection`
  **sm = > json.get value=`selection` key="model_id"**
  1. `sm`
    **model_id = `sm`**

**store = > db.open**
1. not `model_id`
  **defs = > `store`.select table="models" limit=1 order="created_at"**
  **d0 = [1](access(defs, "1"))**
  1. `d0`
    **model_id = [id](access(d0, "id"))**

1. not `model_id`
  `none` =

  | ok | error | code |
  |----|-------|------|
  | False | no model configured — open Settings → 模型 | model.unavailable |

  *none*

**mod = > `store`.get table="models" id=`model_id`**
1. not `mod`
  `miss` =

  | ok | error | code | model_id |
  |----|-------|------|----------|
  | False | model unavailable | model.unavailable | `model_id` |

  *miss*

**pid = [provider_id](access(mod, "provider_id"))**
**uname = [upstream_model_id](access(mod, "upstream_model_id"))**
**dname = [display_name](access(mod, "display_name"))**
**mrev = [revision](access(mod, "revision"))**
**men = [enabled](access(mod, "enabled"))**
1. not `men`
  `dis` =

  | ok | error | code | model_id |
  |----|-------|------|----------|
  | False | model disabled | model.unavailable | `model_id` |

  *dis*

**prov = > `store`.get table="providers" id=`pid`**
1. not `prov`
  `np` =

  | ok | error | code |
  |----|-------|------|
  | False | provider missing | provider.unavailable |

  *np*

**adapter = [adapter](access(prov, "adapter"))**
**base = [base_url](access(prov, "base_url"))**
**cref = [credential_ref](access(prov, "credential_ref"))**
**pen = [enabled](access(prov, "enabled"))**
1. not `pen`
  `pdis` =

  | ok | error | code |
  |----|-------|------|
  | False | provider disabled | provider.unavailable |

  *pdis*

**api_key = ""**
**cver = 0**
1. `cref`
  **cred = > `store`.get table="credentials" id=`cref`**
  1. `cred`
    **api_key = [secret](access(cred, "secret"))**
    **cver = [version](access(cred, "version"))**

`snap` =

| ok | model_id | provider_id | upstream_model_id | display_name | adapter | base_url | api_key | credential_ref | credential_version | revision |
|----|----------|-------------|-------------------|--------------|---------|----------|---------|----------------|--------------------|----------|
| True | `model_id` | `pid` | `uname` | `dname` | `adapter` | `base` | `api_key` | `cref` | `cver` | `mrev` |

*snap*

## repair_legacy_credentials

One-shot heal: if historical `settings.llm_api_key` has a secret but
`cred-legacy-default` is missing/empty, copy into the registry credential.
Runtime never reads settings afterward — Settings UI writes providers only.

**store = > db.open**
**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](access(cfg_rows, "1"))**
1. not `cfg`
  *False*
**key = [llm_api_key](access(cfg, "llm_api_key"))**
**base = [llm_base_url](access(cfg, "llm_base_url"))**
**model = [llm_model](access(cfg, "llm_model"))**
1. not `key`
  *False*

**u = > time.now_unix**
**cref = "cred-legacy-default"**
**cred = > `store`.get table="credentials" id=`cref`**
**need = True**
1. `cred`
  **sec = [secret](access(cred, "secret"))**
  1. `sec`
    **need = False**
1. `need`
  1. `cred`
    **cv = [version](access(cred, "version"))**
    **nv = `cv` + 1**
    `cpatch` =

    | secret | configured | version | updated_at |
    |--------|------------|---------|------------|
    | `key` | 1 | `nv` | `u` |

    > `store`.update table="credentials" id=`cref` row=`cpatch`
  2. *
    `cins` =

    | id | version | secret | configured | owner_scope | created_at | updated_at |
    |----|---------|--------|------------|-------------|------------|------------|
    | `cref` | 1 | `key` | 1 | app | `u` | `u` |

    > `store`.insert table=credentials rows=`cins`

**prov = > `store`.get table="providers" id="prov-legacy-default"**
1. `prov`
  **ppatch = > table.empty_map**
  **ppatch = > table.put in=`ppatch` at="credential_ref" value=`cref`**
  **ppatch = > table.put in=`ppatch` at="updated_at" value=`u`**
  1. `base`
    **ppatch = > table.put in=`ppatch` at="base_url" value=`base`**
  > `store`.update table="providers" id="prov-legacy-default" row=`ppatch`
2. *
  1. not `base`
    **base = "https://api.openai.com/v1"**
  `prow` =

  | id | display_name | adapter | base_url | auth_mode | enabled | credential_ref | revision | created_at | updated_at |
  |----|--------------|---------|----------|-----------|---------|----------------|----------|------------|------------|
  | prov-legacy-default | Legacy settings | openai-compatible | `base` | api_key | 1 | `cref` | 1 | `u` | `u` |

  > `store`.insert table=providers rows=`prow`

1. `model`
  **mod = > `store`.get table="models" id="mdl-legacy-default"**
  1. not `mod`
    `mrow` =

    | id | provider_id | upstream_model_id | display_name | enabled | capabilities | limits | default_params | revision | created_at | updated_at |
    |----|-------------|-------------------|--------------|---------|--------------|--------|----------------|----------|------------|------------|
    | mdl-legacy-default | prov-legacy-default | `model` | `model` | 1 |  |  |  | 1 | `u` | `u` |

    > `store`.insert table=models rows=`mrow`
*True*

## migrate_legacy_settings

Idempotent T17: seed one legacy provider + model from the single-row settings table.
Re-running must not insert duplicates (stable ids `prov-legacy-default` / `mdl-legacy-default`).
When already present, `repair_legacy_credentials` heals empty secrets from settings once.

**store = > db.open**
**u = > time.now_unix**
**existing = > `store`.get table="providers" id="prov-legacy-default"**
1. `existing`
  > repair_legacy_credentials
  `done` =

  | ok | migrated | idempotent | provider_id | model_id |
  |----|----------|------------|-------------|----------|
  | True | False | True | prov-legacy-default | mdl-legacy-default |

  *done*

**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](access(cfg_rows, "1"))**
**key = ""**
**base = "https://api.openai.com/v1"**
**model = "gpt-4o-mini"**
1. `cfg`
  **key = [llm_api_key](access(cfg, "llm_api_key"))**
  **b = [llm_base_url](access(cfg, "llm_base_url"))**
  1. `b`
    **base = `b`**
  **m = [llm_model](access(cfg, "llm_model"))**
  1. `m`
    **model = `m`**

**cref = ""**
1. `key`
  **cref = "cred-legacy-default"**
  **cred_row = > table.empty_map**
  `cred` =

  | id | secret | configured | version | owner_scope | created_at | updated_at |
  |----|--------|------------|---------|-------------|------------|------------|
  | `cref` | `key` | 1 | 1 | app | `u` | `u` |

  > `store`.insert table=credentials rows=`cred`

`prow` =

| id | display_name | adapter | base_url | auth_mode | enabled | credential_ref | revision | created_at | updated_at |
|----|--------------|---------|----------|-----------|---------|----------------|----------|------------|------------|
| prov-legacy-default | Legacy settings | openai-compatible | `base` | api_key | 1 | `cref` | 1 | `u` | `u` |

> `store`.insert table=providers rows=`prow`

`mrow` =

| id | provider_id | upstream_model_id | display_name | enabled | capabilities | limits | default_params | revision | created_at | updated_at |
|----|-------------|-------------------|--------------|---------|--------------|--------|----------------|----------|------------|------------|
| mdl-legacy-default | prov-legacy-default | `model` | `model` | 1 |  |  |  | 1 | `u` | `u` |

> `store`.insert table=models rows=`mrow`
`ok` =

| ok | migrated | idempotent | provider_id | model_id |
|----|----------|------------|-------------|----------|
| True | True | False | prov-legacy-default | mdl-legacy-default |

*ok*

## public_snapshot
    + `snap`

Strip secrets from a resolve_selection result for API responses.

1. not `snap`
  *None*
**ok = [ok](access(snap, "ok"))**
1. not `ok`
  *snap*
**mid = [model_id](access(snap, "model_id"))**
**pid = [provider_id](access(snap, "provider_id"))**
**uname = [upstream_model_id](access(snap, "upstream_model_id"))**
**dname = [display_name](access(snap, "display_name"))**
**adapter = [adapter](access(snap, "adapter"))**
**cref = [credential_ref](access(snap, "credential_ref"))**
**cver = [credential_version](access(snap, "credential_version"))**
**rev = [revision](access(snap, "revision"))**
**configured = False**
**key = [api_key](access(snap, "api_key"))**
1. `key`
  **configured = True**
`pub` =

| ok | model_id | provider_id | upstream_model_id | display_name | adapter | credential_configured | credential_ref | credential_version | revision |
|----|----------|-------------|-------------------|--------------|---------|-----------------------|----------------|--------------------|----------|
| True | `mid` | `pid` | `uname` | `dname` | `adapter` | `configured` | `cref` | `cver` | `rev` |

*pub*

## probe
    + `provider_id`=""
    + `payload`=None

Connectivity probe for a provider. Rate-limited (~1/5s per provider).
Native/non openai-compatible adapters report honest `unavailable`.

1. `payload`
  **pp = > json.get value=`payload` key="provider_id"**
  1. `pp`
    **provider_id = `pp`**
1. not `provider_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | provider_id required | resource.not_found |

  *need*

**store = > db.open**
**u = > time.now_unix**
**prov = > `store`.get table="providers" id=`provider_id`**
1. not `prov`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | provider not found | resource.not_found |

  *nf*

**adapter = > json.get value=`prov` key="adapter"**
1. `adapter` == "openai-compatible"
  **_compat = True**
2. *
  `unavail` =

  | ok | status | adapter | rate_limited | note |
  |----|--------|---------|--------------|------|
  | True | unavailable | `adapter` | False | "native adapter not wired — honest unavailable" |

  *unavail*

**data = > sys.env_get name="QDAGENT_DATA"**
1. not `data`
  **data = "data"**
**stamp_dir = `data` + "/tmp"**
> fs.make_dirs path=`stamp_dir`
**ustamp = "" + `u`**
**stamp = `stamp_dir` + "/qd-probe-" + `provider_id` + "-" + `ustamp` + ".stamp"**
**burst = `stamp_dir` + "/qd-probe-" + `provider_id` + "-burst.stamp"**
**exists = > fs.exists path=`burst`**
1. `exists`
  **prev = > fs.read_text path=`burst`**
  1. `prev` == `ustamp`
    `rl` =

    | ok | status | adapter | rate_limited | retry_after_s |
    |----|--------|---------|--------------|---------------|
    | False | rate_limited | `adapter` | True | 1 |

    *rl*
> fs.write_text path=`burst` text=`ustamp`
> fs.write_text path=`stamp` text=`ustamp`

**base = > json.get value=`prov` key="base_url"**
**cref = > json.get value=`prov` key="credential_ref"**
**auth = > json.get value=`prov` key="auth_mode"**
**configured = False**
**sec = ""**
1. `cref`
  **cred = > `store`.get table="credentials" id=`cref`**
  1. `cred`
    **sec = > json.get value=`cred` key="secret"**
    1. `sec`
      **configured = True**
1. `auth` == "none"
  **configured = True**

1. not `base`
  `nobase` =

  | ok | status | adapter | credential_configured | rate_limited | may_incur_cost | note |
  |----|--------|---------|------------------------|--------------|----------------|------|
  | False | unreachable | `adapter` | `configured` | False | False | "base_url missing" |

  *nobase*

**url = `base` + "/models"**
**auth_header = "Bearer " + `sec`**
**headers = > table.empty_map**
1. `sec`
  **headers = > table.put in=`headers` at="Authorization" value=`auth_header`**

**t0 = > time.now_unix**
**resp = > net.http_get url=`url` headers=`headers`**
**t1 = > time.now_unix**
**latency = `t1` - `t0`**
1. not `resp`
  `unreach` =

  | ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at | note |
  |----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|------|
  | False | unreachable | `adapter` | `base` | `configured` | False | False | 0 | `u` | "no response" |

  *unreach*

**status = > json.get value=`resp` key="status"**
**body = > json.get value=`resp` key="body"**
1. `status` == 401
  `authf` =

  | ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at | note |
  |----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|------|
  | False | auth_failed | `adapter` | `base` | `configured` | False | False | `latency` | `u` | "HTTP 401" |

  *authf*
1. `status` == 403
  `authf2` =

  | ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at | note |
  |----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|------|
  | False | auth_failed | `adapter` | `base` | `configured` | False | False | `latency` | `u` | "HTTP 403" |

  *authf2*
1. `status` == 200
  `okp` =

  | ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at |
  |----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|
  | True | ok | `adapter` | `base` | `configured` | False | False | `latency` | `u` |

  *okp*
1. `status` == 201
  `okp2` =

  | ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at |
  |----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|
  | True | ok | `adapter` | `base` | `configured` | False | False | `latency` | `u` |

  *okp2*
`fail` =

| ok | status | adapter | base_url | credential_configured | rate_limited | may_incur_cost | latency_ms | probed_at | http_status | note |
|----|--------|---------|----------|------------------------|--------------|----------------|------------|-----------|-------------|------|
| False | unreachable | `adapter` | `base` | `configured` | False | False | `latency` | `u` | `status` | "upstream error" |

*fail*

## discover
    + `provider_id`=""
    + `payload`=None

Fetch upstream OpenAI-compatible `/models` and return **candidates** (not auto-enabled).
Registered models are marked `already_registered`. Native adapters: honest unavailable.

1. `payload`
  **pp = > json.get value=`payload` key="provider_id"**
  1. `pp`
    **provider_id = `pp`**
1. not `provider_id`
  `need` =

  | ok | error | code |
  |----|-------|------|
  | False | provider_id required | resource.not_found |

  *need*

**store = > db.open**
**prov = > `store`.get table="providers" id=`provider_id`**
1. not `prov`
  `nf` =

  | ok | error | code |
  |----|-------|------|
  | False | provider not found | resource.not_found |

  *nf*
**adapter = > json.get value=`prov` key="adapter"**
1. `adapter` == "openai-compatible"
  **_compat = True**
2. *
  `unavail` =

  | ok | status | adapter | candidates | note |
  |----|--------|---------|------------|------|
  | True | unavailable | `adapter` |  | "native adapter not wired — honest unavailable" |

  *unavail*

**base = > json.get value=`prov` key="base_url"**
**cref = > json.get value=`prov` key="credential_ref"**
**sec = ""**
1. `cref`
  **cred = > `store`.get table="credentials" id=`cref`**
  1. `cred`
    **sec = > json.get value=`cred` key="secret"**

1. not `base`
  `nob` =

  | ok | status | error | code |
  |----|--------|-------|------|
  | False | unreachable | base_url missing | resource.not_found |

  *nob*

**url = `base` + "/models"**
**auth_header = "Bearer " + `sec`**
**headers = > table.empty_map**
1. `sec`
  **headers = > table.put in=`headers` at="Authorization" value=`auth_header`**

**resp = > net.http_get url=`url` headers=`headers`**
1. not `resp`
  `ur` =

  | ok | status | error |
  |----|--------|-------|
  | False | unreachable | no response |

  *ur*
**http_st = > json.get value=`resp` key="status"**
**body = > json.get value=`resp` key="body"**
1. `http_st` == 401
  `af` =

  | ok | status | error |
  |----|--------|-------|
  | False | auth_failed | HTTP 401 |

  *af*
1. `http_st` == 403
  `af3` =

  | ok | status | error |
  |----|--------|-------|
  | False | auth_failed | HTTP 403 |

  *af3*
1. `http_st` == 200
  **_okhttp = True**
2. `http_st` == 201
  **_okhttp = True**
3. *
  `bad` =

  | ok | status | error | http_status |
  |----|--------|-------|-------------|
  | False | unreachable | upstream error | `http_st` |

  *bad*

**parsed = > json.parse text=`body`**
**data = > json.get value=`parsed` key="data"**
**registered = > table.empty_map**
**mods = > `store`.select table="models" limit=500**
1. `mods`
  - [m](遍历 mods 为 m)
    **mp = > json.get value=`m` key="provider_id"**
    1. `mp` == `provider_id`
      **uid = > json.get value=`m` key="upstream_model_id"**
      1. `uid`
        **registered = > table.put in=`registered` at=`uid` value=True**

**candidates = > table.empty_list**
1. `data`
  - [item](遍历 data 为 item)
    **uid = > json.get value=`item` key="id"**
    1. `uid`
      **already = False**
      **hit = > json.get value=`registered` key=`uid`**
      1. `hit`
        **already = True**
      `cand` =

      | upstream_model_id | display_name | already_registered |
      |-------------------|--------------|--------------------|
      | `uid` | `uid` | `already` |

      **candidates = > table.append list=`candidates` item=`cand`**

`ret` =

| ok | provider_id | candidates | source | status |
|----|-------------|------------|--------|--------|
| True | `provider_id` | `candidates` | "upstream_models" | ok |

*ret*

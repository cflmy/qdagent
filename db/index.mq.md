---
markup: occlusion
title: db/index
description: Open sqlite via ext/data; init runs + settings + workbench tables; seed; migrate; sync run bodies to disk.
import:
  data: ext/data/db.mq.md
  runs: runs.mq.md
  settings: settings.mq.md
  providers: providers.mq.md
  models: models.mq.md
  credentials: credentials.mq.md
  workspaces: workspaces.mq.md
  model_calls: model_calls.mq.md
  profile_items: profile_items.mq.md
  import_jobs: import_jobs.mq.md
  turn_state: turn_state.mq.md
  run: ../lib/run.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## open

**root = > run.确保目录**
**db_url = "sqlite:" + `root` + "/qdagent.db"**
**store = > data.db url=`db_url`**

**run_fields = > runs.schema**
> `store`.init name=runs fields=`run_fields`
**set_fields = > settings.schema**
> `store`.init name=settings fields=`set_fields`
**prov_fields = > providers.schema**
> `store`.init name=providers fields=`prov_fields`
**mod_fields = > models.schema**
> `store`.init name=models fields=`mod_fields`
**cred_fields = > credentials.schema**
> `store`.init name=credentials fields=`cred_fields`
**ws_fields = > workspaces.schema**
> `store`.init name=workspaces fields=`ws_fields`
**mc_fields = > model_calls.schema**
> `store`.init name=model_calls fields=`mc_fields`
**pi_fields = > profile_items.schema**
> `store`.init name=profile_items fields=`pi_fields`
**ij_fields = > import_jobs.schema**
> `store`.init name=import_jobs fields=`ij_fields`
**ts_fields = > turn_state.schema**
> `store`.init name=turn_state fields=`ts_fields`

`migrate_steps` =

| version | sql |
|---------|-----|
| 1 | CREATE UNIQUE INDEX IF NOT EXISTS idx_models_provider_upstream ON models(provider_id, upstream_model_id) |
| 2 | CREATE UNIQUE INDEX IF NOT EXISTS idx_model_calls_call_attempt ON model_calls(call_id, attempt_id) |
| 3 | CREATE INDEX IF NOT EXISTS idx_model_calls_workspace_started ON model_calls(workspace_id, started_at, model_id) |
| 4 | CREATE UNIQUE INDEX IF NOT EXISTS idx_turn_state_request ON turn_state(request_id) |
| 5 | CREATE INDEX IF NOT EXISTS idx_profile_items_status ON profile_items(status, scope) |
| 6 | CREATE UNIQUE INDEX IF NOT EXISTS idx_import_jobs_request ON import_jobs(request_id) |

> `store`.migrate steps=`migrate_steps`

**run_rows = > `store`.select table="runs" limit=1**
1. not `run_rows`
  **seed = > runs.seed**
  > `store`.insert table=runs rows=`seed`

**set_rows = > `store`.select table="settings" limit=1**
1. not `set_rows`
  **sseed = > settings.seed**
  > `store`.insert table=settings rows=`sseed`

> migrate_legacy_settings store=`store`

> run.同步库 store=`store`
*store*

## migrate_legacy_settings
    + `store`

Idempotently promote single-row settings llm_* into one provider + one model + credential.
Re-running must not create duplicates (stable ids).

**existing = > `store`.select table="providers" limit=5**
1. `existing`
  *True*

**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](access(cfg_rows, "1"))**
1. not `cfg`
  *False*

**llm_base = [llm_base_url](access(cfg, "llm_base_url"))**
**llm_model = [llm_model](access(cfg, "llm_model"))**
**llm_key = [llm_api_key](access(cfg, "llm_api_key"))**
1. not `llm_base`
  **llm_base = "https://api.openai.com/v1"**
1. not `llm_model`
  **llm_model = "gpt-4o-mini"**

**u = > time.now_unix**
**cred_ref = "cred-legacy-default"**
**configured = 0**
1. `llm_key`
  **configured = 1**

`cred_row` =

| id | version | secret | configured | owner_scope | created_at | updated_at |
|----|---------|--------|------------|-------------|------------|------------|
| `cred_ref` | 1 | `llm_key` | `configured` | app | `u` | `u` |

> `store`.insert table=credentials rows=`cred_row`

**prov_id = "prov-legacy-default"**
`prov_row` =

| id | display_name | adapter | base_url | credential_ref | auth_mode | enabled | revision | created_at | updated_at |
|----|--------------|---------|----------|----------------|-----------|---------|----------|------------|------------|
| `prov_id` | Legacy OpenAI-compatible | openai-compatible | `llm_base` | `cred_ref` | bearer | 1 | 1 | `u` | `u` |

> `store`.insert table=providers rows=`prov_row`

**mod_id = "mdl-legacy-default"**
`mod_row` =

| id | provider_id | upstream_model_id | display_name | enabled | capabilities | limits | default_params | revision | created_at | updated_at |
|----|-------------|-------------------|--------------|---------|--------------|--------|----------------|----------|------------|------------|
| `mod_id` | `prov_id` | `llm_model` | `llm_model` | 1 |  |  |  | 1 | `u` | `u` |

> `store`.insert table=models rows=`mod_row`

**ws_id = "ws-default"**
**ws_rows = > `store`.select table="workspaces" limit=1**
1. not `ws_rows`
  **sel = "{\"mode\":\"manual\",\"model_id\":\"" + `mod_id` + "\",\"revision\":1}"**
  `ws_row` =

  | id | owner_id | name | project_root_ref | kb_root_ref | data_namespace | default_selection | permissions | index_status | revision | archived | created_at | updated_at |
  |----|----------|------|------------------|-------------|----------------|-------------------|-------------|--------------|----------|----------|------------|------------|
  | `ws_id` | local | 默认工作区 | . |  | data | `sel` | read,run,edit,publish,configure | ready | 1 | 0 | `u` | `u` |

  > `store`.insert table=workspaces rows=`ws_row`
*True*

## recent
    + `limit`=20

返回最近笔记行（在本模块内调用 `` `store`.select ``）。

**store = > open**
**rows = > `store`.select table="runs" limit=`limit` order="-created_at"**
*rows*

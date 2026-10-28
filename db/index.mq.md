---
markup: occlusion
title: db/index
description: >-
  Q-R1: split initialize/migrate vs daily connect. Ordinary reads must not
  rewrite run bodies (R10). Full sync is an explicit background task.
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
  turn_events: turn_events.mq.md
  run: ../lib/run.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

## connect

Daily open — no migrate, no full run sync. Safe for short GETs.
Enable WAL + busy_timeout so concurrent isolated workers / GETs
(`/api/app/models`, turns, usage) do not fail with SQLITE_BUSY (5).

**root = > run.确保目录**
**db_url = "sqlite:" + `root` + "/qdagent.db"**
**store = > data.db url=`db_url`**
> `store`.exec sql="PRAGMA journal_mode=WAL"
> `store`.exec sql="PRAGMA busy_timeout=8000"
> `store`.exec sql="PRAGMA synchronous=NORMAL"
*store*

## initialize

One-shot schema init + migrate + seed. Call from startup / explicit migrate CLI.
Does not sync run bodies to disk (use `sync_runs`).

**store = > connect**

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
**te_fields = > turn_events.schema**
> `store`.init name=turn_events fields=`te_fields`

Q-R1 columns may already exist from `init` (full schema). SQLite has no
`ADD COLUMN IF NOT EXISTS`, so ensure via PRAGMA then record versions with no-op SQL.

> ensure_column store=`store` table="turn_state" column="owner_id" decl="TEXT"
> ensure_column store=`store` table="turn_state" column="payload_hash" decl="TEXT"
> ensure_column store=`store` table="turn_state" column="last_event_seq" decl="INTEGER"
> ensure_column store=`store` table="turn_state" column="result_ref" decl="TEXT"
> ensure_column store=`store` table="turn_state" column="recovery_action" decl="TEXT"
> ensure_column store=`store` table="turn_state" column="runtime_task_id" decl="TEXT"
> ensure_column store=`store` table="turn_state" column="runtime_cancel_token" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="original_digest" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="extracted_text_digest" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="extractor_version" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="candidate_digest" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="publication_manifest" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="publication_generation" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="payload_hash" decl="TEXT"
> ensure_column store=`store` table="import_jobs" column="stage_revision" decl="INTEGER"

`migrate_steps` =

| version | sql |
|---------|-----|
| 1 | CREATE UNIQUE INDEX IF NOT EXISTS idx_models_provider_upstream ON models(provider_id, upstream_model_id) |
| 2 | CREATE UNIQUE INDEX IF NOT EXISTS idx_model_calls_call_attempt ON model_calls(call_id, attempt_id) |
| 3 | CREATE INDEX IF NOT EXISTS idx_model_calls_workspace_started ON model_calls(workspace_id, started_at, model_id) |
| 4 | CREATE UNIQUE INDEX IF NOT EXISTS idx_turn_state_request ON turn_state(request_id) |
| 5 | CREATE INDEX IF NOT EXISTS idx_profile_items_status ON profile_items(status, scope) |
| 6 | CREATE UNIQUE INDEX IF NOT EXISTS idx_import_jobs_request ON import_jobs(request_id) |
| 7 | CREATE INDEX IF NOT EXISTS idx_turn_state_workspace_state ON turn_state(workspace_id, state, updated_at) |
| 8 | CREATE INDEX IF NOT EXISTS idx_import_jobs_workspace_status ON import_jobs(workspace_id, status, updated_at) |
| 9 | CREATE INDEX IF NOT EXISTS idx_model_calls_revision ON model_calls(call_id, attempt_id, revision) |
| 10 | CREATE UNIQUE INDEX IF NOT EXISTS idx_turn_events_turn_seq ON turn_events(turn_id, seq) |
| 11 | CREATE UNIQUE INDEX IF NOT EXISTS idx_turn_events_event_id ON turn_events(event_id) |
| 12 | CREATE INDEX IF NOT EXISTS idx_turn_events_turn_created ON turn_events(turn_id, created_at) |
| 13 | SELECT 1 |
| 14 | SELECT 1 |
| 15 | SELECT 1 |
| 16 | SELECT 1 |
| 17 | SELECT 1 |
| 18 | SELECT 1 |
| 19 | SELECT 1 |
| 20 | SELECT 1 |
| 21 | SELECT 1 |
| 22 | SELECT 1 |
| 23 | SELECT 1 |

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
> repair_legacy_credentials store=`store`
> mark_legacy_unverified_imports store=`store`
*store*

## open

Compatible entry: initialize once per process via env latch, then connect.
Never calls run.同步库 on the hot path (Q-R1 / R10).

**done = > sys.env_get name="QDAGENT_DB_INITIALIZED"**
1. not `done`
  **store = > initialize**
  > sys.env_set name="QDAGENT_DB_INITIALIZED" value="1"
  *store*
**store = > connect**
*store*

## ensure_column
    + `store`
    + `table`
    + `column`
    + `decl`="TEXT"

Idempotent ADD COLUMN for SQLite (no IF NOT EXISTS). No-op when column exists.

**sql = "PRAGMA table_info(" + `table` + ")"**
**info = > `store`.query sql=`sql`**
**rows = > json.get value=`info` key="rows"**
1. not `rows`
  **rows = `info`**
**found = False**
- [r](遍历 rows 为 r)
  **n = > json.get value=`r` key="name"**
  1. `n` == `column`
    **found = True**
1. `found`
  *True*
**alter = "ALTER TABLE " + `table` + " ADD COLUMN " + `column` + " " + `decl`**
> `store`.exec sql=`alter`
*True*

## sync_runs
    + `store`=None

Explicit background recovery — rewrite run bodies from DB. Not for ordinary GET.

1. not `store`
  **store = > connect**
> run.同步库 store=`store`
*store*

## mark_legacy_unverified_imports
    + `store`

Q-R9: published rows without publication_manifest → legacy_unverified.
Preserves original status in error field; does not delete user data.

**rows = > `store`.select table="import_jobs" limit=500 order="-updated_at"**
1. not `rows`
  *True*
**u = > time.now_unix**
- [j](遍历 rows 为 j)
  **st = > json.get value=`j` key="status"**
  **man = > json.get value=`j` key="publication_manifest"**
  **jid = > json.get value=`j` key="id"**
  1. `st` == "published"
    1. not `man`
      1. `jid`
        `patch` =

        | status | error | updated_at |
        |--------|-------|------------|
        | legacy_unverified | migrated:published_without_manifest | `u` |

        > `store`.update table="import_jobs" id=`jid` row=`patch`
*True*

## repair_legacy_credentials
    + `store`

If settings still holds a historical llm_api_key but registry credential is empty,
copy once into `cred-legacy-default`. Runtime truth remains credentials only.

**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](access(cfg_rows, "1"))**
1. not `cfg`
  *False*
**llm_key = [llm_api_key](access(cfg, "llm_api_key"))**
**llm_base = [llm_base_url](access(cfg, "llm_base_url"))**
1. not `llm_key`
  *False*

**cred = > `store`.get table="credentials" id="cred-legacy-default"**
**sec = ""**
1. `cred`
  **sec = [secret](access(cred, "secret"))**
1. `sec`
  *False*

**u = > time.now_unix**
1. `cred`
  **cv = [version](access(cred, "version"))**
  **nv = `cv` + 1**
  `cpatch` =

  | secret | configured | version | updated_at |
  |--------|------------|---------|------------|
  | `llm_key` | 1 | `nv` | `u` |

  > `store`.update table="credentials" id="cred-legacy-default" row=`cpatch`
2. *
  `cins` =

  | id | version | secret | configured | owner_scope | created_at | updated_at |
  |----|---------|--------|------------|-------------|------------|------------|
  | cred-legacy-default | 1 | `llm_key` | 1 | app | `u` | `u` |

  > `store`.insert table=credentials rows=`cins`

**prov = > `store`.get table="providers" id="prov-legacy-default"**
1. `prov`
  **pp = > table.empty_map**
  **pp = > table.put in=`pp` at="credential_ref" value="cred-legacy-default"**
  **pp = > table.put in=`pp` at="updated_at" value=`u`**
  1. `llm_base`
    **pp = > table.put in=`pp` at="base_url" value=`llm_base`**
  > `store`.update table="providers" id="prov-legacy-default" row=`pp`
*True*

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
    + `limit`=200

返回最近笔记行（在本模块内调用 `` `store`.select ``）。

**store = > open**
**rows = > `store`.select table="runs" limit=`limit` order="-created_at"**
*rows*

---
markup: occlusion
title: serve
description: >-
  qdagent Gateway (Marqdo CLI≥1.4.4 · Ext≥1.4.4 / ADR 0007).
  Documents: pages/build + pages/content (Markdown bodies).
  API: GFM 调用表 → lib/api；声明式 Endpoint 文档见 api/*.mq.md。
  Resource: ext/data · lib/site（auth / form / proxy）。
  /v1 is Bearer-auth (OpenAI clients); not session-gated.
import:
  web: ext/web/web.mq.md
  site: lib/site.mq.md
  ui: lib/ui.mq.md
  pages: pages/build.mq.md
  spa: lib/spa.mq.md
  db: db/index.mq.md
  data: ext/data/db.mq.md
  api: lib/api.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
---

# main

*> boot*

## boot

**host = > sys.env_get name="QDAGENT_HOST"**
1. not `host`
  **host = "0.0.0.0"**
**port_s = > sys.env_get name="QDAGENT_PORT"**
1. not `port_s`
  **port_s = "7431"**
**port = > int value=`port_s`**

**store = > db.open**

**cfg_rows = > `store`.select table="settings" limit=1**
**cfg = [1](access(cfg_rows, "1"))**
**llm_base = [llm_base_url](access(cfg, "llm_base_url"))**
1. not `llm_base`
  **llm_base = "https://api.openai.com/v1"**
**tts_base = [tts_base_url](access(cfg, "tts_base_url"))**
1. not `tts_base`
  **tts_base = `llm_base`**
**asr_base = [asr_base_url](access(cfg, "asr_base_url"))**
1. not `asr_base`
  **asr_base = `llm_base`**

**v1_port = > sys.env_get name="QDAGENT_V1_PORT"**
1. not `v1_port`
  **v1_port = "7433"**
**v1_up = "http://127.0.0.1:" + `v1_port`**

`代理表` =

| 路径 | 上游 | 流式 | 去前缀 | 方法 | 环境头 | 超时 |
|------|------|------|--------|------|--------|------|
| /llm/chat/completions | `llm_base` | 真 | /llm | POST | | 120000 |
| /llm/models | `llm_base` | 真 | /llm | GET | | 60000 |
| /asr/audio/transcriptions | `asr_base` | 真 | /asr | POST | | 120000 |
| /asr/models | `asr_base` | 真 | /asr | GET | | 60000 |
| /tts/audio/speech | `tts_base` | 真 | /tts | POST | | 120000 |
| /tts/models | `tts_base` | 真 | /tts | GET | | 60000 |

`调用表` =

| 路径 | 方法 | 函数 | 正文 | 返回 | 类别 |
|------|------|------|------|------|------|
| /api/health | GET | api.health | query | json | read |
| /api/store/run | POST | api.capture | json | json | short |
| /api/store/sync | POST | api.sync | json | json | short |
| /api/store/search | POST | api.search | json | json | read |
| /api/store/list | POST | api.list | json | json | read |
| /api/store/runs | GET | api.list | query | json | read |
| /api/store/get | POST | api.get_run | json | json | read |
| /api/store/context | POST | api.context | json | json | read |
| /api/store/profile | POST | api.profile_get | json | json | read |
| /api/config | GET | api.settings_get | query | json | read |
| /api/config/update | POST | api.settings_update | json | json | short |
| /api/store/profile/update | POST | api.profile_update | json | json | short |
| /api/store/profile/reset | POST | api.profile_reset | json | json | read |
| /api/store/organize | POST | api.organize | json | json | short |
| /api/store/kb/list | POST | api.kb_list | json | json | read |
| /api/store/kb/get | POST | api.kb_get | json | json | read |
| /api/store/web_search | POST | api.web_search | json | json | short |
| /api/store/asr_transcribe | POST | api.asr_transcribe | json | json | short |
| /api/store/changes/propose | POST | api.change_propose | json | json | short |
| /api/store/changes/list | POST | api.change_list | json | json | read |
| /api/store/changes/get | POST | api.change_get | json | json | read |
| /api/store/changes/apply | POST | api.change_apply | json | json | short |
| /api/store/changes/reject | POST | api.change_reject | json | json | short |
| /api/store/git/log | POST | api.git_log | json | json | read |
| /api/store/git/show | POST | api.git_show | json | json | read |
| /api/store/git/revert | POST | api.git_revert | json | json | short |
| /api/eng/preflight | POST | api.preflight | json | json | short |
| /api/eng/reuse | POST | api.eng_reuse | json | json | short |
| /api/eng/find | POST | api.eng_find | json | json | short |
| /api/eng/capability | POST | api.eng_capability | json | json | short |
| /api/eng/impact | POST | api.eng_impact | json | json | short |
| /api/eng/conflicts | POST | api.eng_conflicts | json | json | short |
| /api/eng/stale | POST | api.eng_stale | json | json | short |
| /api/eng/duplicate | POST | api.eng_duplicate | json | json | short |
| /api/eng/verify | POST | api.eng_verify | json | json | short |
| /api/eng/docgate | POST | api.eng_docgate | json | json | short |
| /api/eng/learn | POST | api.eng_learn | json | json | short |
| /api/eng/metrics | GET | api.eng_metrics | query | json | read |
| /api/eng/candidates | POST | api.eng_candidates | json | json | short |
| /api/eng/promote | POST | api.eng_promote | json | json | short |
| /api/eng/reject | POST | api.eng_reject | json | json | short |
| /api/eng/build | POST | api.eng_build | json | json | short |
| /api/eng/session | POST | api.eng_session | json | json | short |
| /api/eng/sessions | POST | api.eng_sessions | json | json | short |
| /api/eng/knowledge | POST | api.eng_knowledge | json | json | short |
| /api/eng/kb/status | POST | api.eng_kb_status | json | json | short |
| /api/eng/import | POST | api.eng_import | json | json | short |
| /api/eng/policies | POST | api.eng_policies | json | json | short |
| /v1/models | GET | api.v1_models | query | json | read |
| /v1/chat/completions | POST | api.v1_chat_completions | json | sse-live | execute |
| /api/eng/workbooks | POST | api.eng_workbooks | json | json | short |
| /api/eng/workbook | POST | api.eng_workbook | json | json | short |
| /api/eng/today | GET | api.eng_today | query | json | read |
| /api/app/providers | GET | api.app_providers | query | json | read |
| /api/app/providers/save | POST | api.app_providers_save | json | json | short |
| /api/app/providers/probe | POST | api.app_providers_probe | json | json | short |
| /api/app/providers/discover | POST | api.app_providers_discover | json | json | short |
| /api/app/models | GET | api.app_models | query | json | read |
| /api/app/models/save | POST | api.app_models_save | json | json | short |
| /api/app/usage/query | POST | api.app_usage_query | json | json | read |
| /api/app/workspaces | GET | api.app_workspaces | query | json | read |
| /api/app/workspaces/save | POST | api.app_workspaces_save | json | json | short |
| /api/app/workspaces/tree | POST | api.app_workspaces_tree | json | json | read |
| /api/app/documents/read | POST | api.app_documents_read | json | json | read |
| /api/app/resources/blob | POST | api.app_resources_blob | json | json | read |
| /api/app/citations/resolve | POST | api.app_citations_resolve | json | json | read |
| /api/app/uploads/create | POST | api.app_uploads_create | json | json | short |
| /api/app/imports/start | POST | api.app_imports_start | json | json | short |
| /api/app/imports/get | POST | api.app_imports_get | json | json | short |
| /api/app/imports/publish | POST | api.app_imports_publish | json | json | short |
| /api/app/profile/items | POST | api.app_profile_items | json | json | short |
| /api/app/profile/propose | POST | api.app_profile_propose | json | json | short |
| /api/app/profile/set_status | POST | api.app_profile_set_status | json | json | short |
| /api/app/turns/cancel | POST | api.app_turns_cancel | json | json | control |
| /api/app/feature_flags | GET | api.app_feature_flags | query | json | read |
| /api/app/turns/get | POST | api.app_turns_get | json | json | read |
| /api/app/turns/{id} | GET | api.app_turns_get | query | json | read |
| /api/app/turns/{id}/events | GET | api.app_turns_events | query | sse-live | control |

**接口 = > ui.接口**

**page_preflight = > pages.工程预检**
**page = > pages.对话**
**notes = > pages.笔记库**
**notes_runs = > pages.原始沉淀**
**detail = > pages.笔记详情**
**new = > pages.记一笔**
**settings_hub = > pages.设置枢纽**
**settings_llm = > pages.大模型设置**
**settings_voice = > pages.语音设置**
**settings_mcp = > pages.MCP设置**
**settings_openai = > pages.OpenAI设置**
**settings_memory = > pages.记忆设置**
**page_workbook = > pages.工程工作簿**
**page_capability = > pages.工程能力**
**page_candidates = > pages.知识候选**

**spa_html = > spa.bootstrap root="."**
**spa_home = > table.empty_map**
**spa_home = > table.put in=`spa_home` at="title" value="求道"**
**spa_home = > table.put in=`spa_home` at="route" value="/"**
**spa_home = > table.put in=`spa_home` at="layout" value="bare"**
**spa_home = > table.put in=`spa_home` at="images_html" value=`spa_html`**
**spa_home = > table.put in=`spa_home` at="styles_css" value="html,body{height:100%;margin:0;padding:0}body{background-color:var(--dsw-alias-bg-base,#fafaf9)!important;color:var(--dsw-alias-label-primary,#1c1917)!important}body.layout-bare main.main{padding:0!important;margin:0!important;max-width:none!important}header.topnav,footer.foot{display:none!important}#root{min-height:100vh}"**

**app = > web.app page=`spa_home` db=`store` admin=True admin_prefix="/account" host=`host` port=`port`**

**app = > web.route app=`app` path="/chat" page=`page`**
**app = > web.route app=`app` path="/notes" page=`notes`**
**app = > web.route app=`app` path="/notes/runs" page=`notes_runs`**
**app = > web.route app=`app` path="/notes/new" page=`new`**
**app = > web.route app=`app` path="/run/{slug}" page=`detail`**
**app = > web.route app=`app` path="/eng/preflight" page=`page_preflight`**
**app = > web.route app=`app` path="/eng/run" page=`page_workbook`**
**app = > web.route app=`app` path="/eng/capability" page=`page_capability`**
**app = > web.route app=`app` path="/eng/candidates" page=`page_candidates`**
**app = > web.route app=`app` path="/settings" page=`settings_hub`**
**app = > web.route app=`app` path="/settings/llm" page=`settings_llm`**
**app = > web.route app=`app` path="/settings/voice" page=`settings_voice`**
**app = > web.route app=`app` path="/settings/memory" page=`settings_memory`**
**app = > web.route app=`app` path="/settings/mcp" page=`settings_mcp`**
**app = > web.route app=`app` path="/settings/openai" page=`settings_openai`**

**note_form = [form](access(page, "form"))**
1. `note_form`
  **app = > site.mount_form app=`app` id="note" form=`note_form`**
**manual = [form](access(new, "form"))**
1. `manual`
  **app = > site.mount_form app=`app` id="manual-note" form=`manual`**
**llm_form = [form](access(settings_llm, "form"))**
1. `llm_form`
  **app = > site.mount_form app=`app` id="settings-llm" form=`llm_form`**
**voice_form = [form](access(settings_voice, "form"))**
1. `voice_form`
  **app = > site.mount_form app=`app` id="settings-voice" form=`voice_form`**

**app = > `app`.static dir="public" mount="/static"**

`图标` =

| 路径 | 关系 | 类型 | 尺寸 | 地址 |
|------|------|------|------|------|
| "public/favicon.ico" | icon | "image/x-icon" | any | "/favicon.ico" |
| "public/favicon.svg" | icon | "image/svg+xml" | any | "/icons/favicon.svg" |
| "public/logo.png" | apple-touch-icon | "image/png" | 192x192 | "/icons/logo.png" |

**app = > site.icons app=`app` table=`图标`**

**app = > site.wire app=`app` proxy=`代理表` invoke=`调用表` 访问日志=True json_routes=`接口`**

**用户 = > ui.用户**
**app = > site.auth app=`app` users=`用户` session_ttl=86400 admin_prefix="/account" login_redirect="/" logout_redirect="/account/login"**

**app = > `app`.gate path="/" roles="user,admin" permissions="" match="exact" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/chat" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/notes" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/eng" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/run" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/settings" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/_form" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/api" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/llm" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/asr" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
**app = > `app`.gate path="/tts" roles="user,admin" permissions="" match="prefix" on_deny="redirect" exclude=None**
> `app`.listen
*None*

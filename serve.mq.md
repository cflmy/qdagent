---
title: serve
description: >-
  qdagent Gateway (Marqdo ≥ 1.3.0 / ADR 0007).
  Documents: pages/build + pages/content (Markdown bodies).
  API: GFM 调用表 → lib/api；声明式 Endpoint 文档见 api/*.mq.md。
  Resource: ext/data · lib/site（auth / form / proxy）。
import web:ext/web/web.mq.md
import site:lib/site.mq.md
import ui:lib/ui.mq.md
import pages:pages/build.mq.md
import db:db/index.mq.md
import data:ext/data/db.mq.md
import api:lib/api.mq.md
import sys:lib/sys.mq.md
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
**cfg = [1](cfg_rows)**
**llm_base = [llm_base_url](cfg)**
1. not `llm_base`
  **llm_base = "https://api.openai.com/v1"**
**tts_base = [tts_base_url](cfg)**
1. not `tts_base`
  **tts_base = `llm_base`**
**asr_base = [asr_base_url](cfg)**
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
| /v1/chat/completions | `v1_up` | 真 | /v1 | POST | | 180000 |
| /v1/models | `v1_up` | 真 | /v1 | GET | | 30000 |

`调用表` =

| 路径 | 方法 | 函数 | 正文 | 返回 |
|------|------|------|------|------|
| /api/health | GET | api.health | query | json |
| /api/store/run | POST | api.capture | json | json |
| /api/store/sync | POST | api.sync | json | json |
| /api/store/search | POST | api.search | json | json |
| /api/store/list | POST | api.list | json | json |
| /api/store/runs | GET | api.list | query | json |
| /api/store/get | POST | api.get_run | json | json |
| /api/store/context | POST | api.context | json | json |
| /api/store/profile | POST | api.profile_get | json | json |
| /api/store/profile/update | POST | api.profile_update | json | json |
| /api/store/profile/reset | POST | api.profile_reset | json | json |
| /api/store/organize | POST | api.organize | json | json |
| /api/store/kb/list | POST | api.kb_list | json | json |
| /api/store/kb/get | POST | api.kb_get | json | json |
| /api/store/web_search | POST | api.web_search | json | json |
| /api/store/asr_transcribe | POST | api.asr_transcribe | json | json |
| /api/store/changes/propose | POST | api.change_propose | json | json |
| /api/store/changes/list | POST | api.change_list | json | json |
| /api/store/changes/get | POST | api.change_get | json | json |
| /api/store/changes/apply | POST | api.change_apply | json | json |
| /api/store/changes/reject | POST | api.change_reject | json | json |
| /api/store/git/log | POST | api.git_log | json | json |
| /api/store/git/show | POST | api.git_show | json | json |
| /api/store/git/revert | POST | api.git_revert | json | json |
| /api/eng/preflight | POST | api.preflight | json | json |
| /api/eng/reuse | POST | api.eng_reuse | json | json |
| /api/eng/verify | POST | api.eng_verify | json | json |
| /api/eng/learn | POST | api.eng_learn | json | json |
| /api/eng/metrics | GET | api.eng_metrics | query | json |
| /api/eng/candidates | POST | api.eng_candidates | json | json |
| /api/eng/promote | POST | api.eng_promote | json | json |
| /api/eng/reject | POST | api.eng_reject | json | json |

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

**app = > web.app page=`page_preflight` db=`store` admin=True admin_prefix="/account" host=`host` port=`port`**

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

**note_form = [form](page)**
1. `note_form`
  **app = > site.mount_form app=`app` id="note" form=`note_form`**
**manual = [form](new)**
1. `manual`
  **app = > site.mount_form app=`app` id="manual-note" form=`manual`**
**llm_form = [form](settings_llm)**
1. `llm_form`
  **app = > site.mount_form app=`app` id="settings-llm" form=`llm_form`**
**voice_form = [form](settings_voice)**
1. `voice_form`
  **app = > site.mount_form app=`app` id="settings-voice" form=`voice_form`**

**app = > `app`.static dir="public" mount="/static"**

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

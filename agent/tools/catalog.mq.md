---
markup: occlusion
title: agent/tools/catalog
description: >-
  Q-A4/Q-A5 tool catalog — ToolSpecV1 for eng + product read/network/workspace
  tools; eng_tools remain CALL aliases.
import:
  agent: ext/ai/agent.mq.md
  plugin: lib/plugin.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  note_read: note_read.mq.md
  file_read: file_read.mq.md
  web_search: web_search.mq.md
  web_fetch: web_fetch.mq.md
  workspace_list: workspace_list.mq.md
  workspace_search: workspace_search.mq.md
  workspace_read: workspace_read.mq.md
  plan_update: plan_update.mq.md
  task_status: task_status.mq.md
  memory_forget: memory_forget.mq.md
  memory_list: memory_list.mq.md
  memory_propose: memory_propose.mq.md
  notes_create: notes_create.mq.md
  notes_update: notes_update.mq.md
  notes_search: notes_search.mq.md
  files_patch: files_patch.mq.md
---

## ensure_plugin

**p = > plugin.native_path name="agent"**
1. `p`
  > plugin.load path=`p`
2. *
  > print text=qdagent tools catalog: native agent plugin not found
  > sys.exit code=1

## register_defaults

Seed Marqdo ToolSpec registry with engineering tools plus product tools.
CALL names stay `tool_find` … `tool_summarize` plus product aliases.

> ensure_plugin
**eng = > agent.tools_register_eng_defaults**
**schema = > json.parse text={"type":"object","properties":{"path":{"type":"string"},"root":{"type":"string"},"max_chars":{"type":"integer","minimum":1,"maximum":200000}},"required":["path"],"additionalProperties":false}**
**search_schema = > json.parse text={"type":"object","properties":{"query":{"type":"string","minLength":1},"limit":{"type":"integer","minimum":1,"maximum":8}},"required":["query"],"additionalProperties":false}**
**fetch_schema = > json.parse text={"type":"object","properties":{"url":{"type":"string","minLength":1},"max_bytes":{"type":"integer","minimum":1024,"maximum":2097152},"timeout_s":{"type":"number","minimum":1,"maximum":60}},"required":["url"],"additionalProperties":false}**
**ws_list_schema = > json.parse text={"type":"object","properties":{"path":{"type":"string"},"root":{"type":"string"},"cursor":{"type":"integer","minimum":0},"limit":{"type":"integer","minimum":1,"maximum":200}},"additionalProperties":false}**
**ws_search_schema = > json.parse text={"type":"object","properties":{"query":{"type":"string","minLength":1},"path":{"type":"string"},"root":{"type":"string"},"cursor":{"type":"integer","minimum":0},"limit":{"type":"integer","minimum":1,"maximum":50}},"required":["query"],"additionalProperties":false}**
**ws_read_schema = > json.parse text={"type":"object","properties":{"path":{"type":"string"},"root":{"type":"string"},"digest":{"type":"string"},"line_start":{"type":"integer","minimum":0},"line_end":{"type":"integer","minimum":0},"max_bytes":{"type":"integer","minimum":1024,"maximum":524288},"cursor":{"type":"string"}},"required":["path"],"additionalProperties":false}**
**tools_search_schema = > json.parse text={"type":"object","properties":{"query":{"type":"string"}},"additionalProperties":false}**
**tools_describe_schema = > json.parse text={"type":"object","properties":{"id":{"type":"string","minLength":1}},"required":["id"],"additionalProperties":false}**
**plan_schema = > json.parse text={"type":"object","properties":{"turn_id":{"type":"string","minLength":1},"text":{"type":"string"},"milestones":{"type":"array"}},"required":["turn_id"],"additionalProperties":false}**
**task_status_schema = > json.parse text={"type":"object","properties":{"turn_id":{"type":"string","minLength":1},"task_id":{"type":"string","minLength":1},"status":{"type":"string","enum":["pending","running","done","blocked"]},"detail":{"type":"string"}},"required":["turn_id","task_id","status"],"additionalProperties":false}**
**note_scopes = > json.parse text=["notes:read"]**
**file_scopes = > json.parse text=["workspace:read"]**
**web_scopes = > json.parse text=["network:read"]**
**meta_scopes = > json.parse text=["tools:describe"]**
**plan_scopes = > json.parse text=["turn:plan"]**
**memory_scopes = > json.parse text=["memory:write"]**
`note_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| note_read | 1 | Read a host-relative note under an allowed root (default data/) | `schema` | read | `note_scopes` | ready |

`file_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| file_read | 1 | Read a host-relative workspace file (default root .) | `schema` | read | `file_scopes` | ready |

`web_search_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| web_search | 1 | Web search hits as unverified clues; fetch originals for critical facts | `search_schema` | read | `web_scopes` | ready |

`web_fetch_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| web_fetch | 1 | Fetch one http(s) URL with SSRF/size/redirect guards; trust=unverified | `fetch_schema` | read | `web_scopes` | ready |

`ws_list_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| workspace_list | 1 | List workspace directory entries with cursor pagination | `ws_list_schema` | read | `file_scopes` | ready |

`ws_search_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| workspace_search | 1 | Search workspace paths/content; hits include line locators for workspace_read | `ws_search_schema` | read | `file_scopes` | ready |

`ws_read_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| workspace_read | 1 | Bounded workspace file range read with digest check and next_cursor | `ws_read_schema` | read | `file_scopes` | ready |

`tools_search_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| tools_search | 1 | Search authorized tool catalog by intent; does not grant execution | `tools_search_schema` | read | `meta_scopes` | ready |

`tools_describe_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| tools_describe | 1 | Describe one authorized ToolSpec by id | `tools_describe_schema` | read | `meta_scopes` | ready |

`plan_update_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| plan_update | 1 | Publish plan milestones as progress events (not execution proof) | `plan_schema` | write | `plan_scopes` | ready |

`task_status_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| task_status | 1 | Publish task status pending|running|done|blocked from real turn | `task_status_schema` | write | `plan_scopes` | ready |

**memory_forget_schema = > json.parse text={"type":"object","properties":{"id":{"type":"string","minLength":1}},"required":["id"],"additionalProperties":false}**
`memory_forget_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| memory_forget | 1 | Forget a profile memory item (auditable; not injectable) | `memory_forget_schema` | write | `memory_scopes` | ready |

**memory_list_schema = > json.parse text={"type":"object","properties":{"scope":{"type":"string"},"status":{"type":"string"},"workspace_id":{"type":"string"}},"additionalProperties":false}**
`memory_list_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| memory_list | 1 | List profile memory items by scope/status (proposed never injects) | `memory_list_schema` | read | `memory_scopes` | ready |

**memory_propose_schema = > json.parse text={"type":"object","properties":{"text":{"type":"string","minLength":1},"category":{"type":"string"},"scope":{"type":"string"},"workspace_id":{"type":"string"},"session_id":{"type":"string"},"source_refs":{"type":"string"}},"required":["text"],"additionalProperties":false}**
`memory_propose_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| memory_propose | 1 | Propose a profile memory item — never auto-confirmed | `memory_propose_schema` | write | `memory_scopes` | ready |

**note_write_scopes = > json.parse text=["notes:write"]**
**file_write_scopes = > json.parse text=["workspace:write"]**
**notes_create_schema = > json.parse text={"type":"object","properties":{"path":{"type":"string","minLength":1},"root":{"type":"string"},"content":{"type":"string"}},"required":["path","content"],"additionalProperties":false}**
**notes_update_schema = > json.parse text={"type":"object","properties":{"path":{"type":"string","minLength":1},"root":{"type":"string"},"content":{"type":"string"},"expected_digest":{"type":"string","minLength":1}},"required":["path","content","expected_digest"],"additionalProperties":false}**
**files_patch_schema = > json.parse text={"type":"object","properties":{"path":{"type":"string","minLength":1},"root":{"type":"string"},"content":{"type":"string"},"expected_digest":{"type":"string","minLength":1}},"required":["path","content","expected_digest"],"additionalProperties":false}**
`notes_create_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| notes_create | 1 | Create a note under allowed root; fails if path exists | `notes_create_schema` | write | `note_write_scopes` | ready |

`notes_update_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| notes_update | 1 | CAS update note with expected_digest; revision.conflict on mismatch | `notes_update_schema` | write | `note_write_scopes` | ready |

`files_patch_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| files_patch | 1 | CAS content replace under workspace root; revision.conflict on mismatch | `files_patch_schema` | write | `file_write_scopes` | ready |

**notes_search_schema = > json.parse text={"type":"object","properties":{"query":{"type":"string","minLength":1},"path":{"type":"string"},"root":{"type":"string"},"cursor":{"type":"integer","minimum":0},"limit":{"type":"integer","minimum":1,"maximum":50}},"required":["query"],"additionalProperties":false}**
`notes_search_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| notes_search | 1 | Search notes under data/ (or root); hits include line locators for note_read | `notes_search_schema` | read | `note_scopes` | ready |

**prod_note = > agent.tools_register spec=`note_spec`**
**prod_file = > agent.tools_register spec=`file_spec`**
**prod_ws = > agent.tools_register spec=`web_search_spec`**
**prod_wf = > agent.tools_register spec=`web_fetch_spec`**
**prod_wsl = > agent.tools_register spec=`ws_list_spec`**
**prod_wss = > agent.tools_register spec=`ws_search_spec`**
**prod_wsr = > agent.tools_register spec=`ws_read_spec`**
**prod_ts = > agent.tools_register spec=`tools_search_spec`**
**prod_td = > agent.tools_register spec=`tools_describe_spec`**
**prod_pu = > agent.tools_register spec=`plan_update_spec`**
**prod_tst = > agent.tools_register spec=`task_status_spec`**
**prod_mf = > agent.tools_register spec=`memory_forget_spec`**
**prod_ml = > agent.tools_register spec=`memory_list_spec`**
**prod_mp = > agent.tools_register spec=`memory_propose_spec`**
**prod_nc = > agent.tools_register spec=`notes_create_spec`**
**prod_nu = > agent.tools_register spec=`notes_update_spec`**
**prod_fp = > agent.tools_register spec=`files_patch_spec`**
**prod_ns = > agent.tools_register spec=`notes_search_spec`**
`out` =

| ok | eng |
|----|-----|
| True | `eng` |

*out*

## search
    + `query`=""
    + `tools`=None

Authorized tool search (summaries). Pass the same allowlist used by agent.run.

> ensure_plugin
1. not `tools`
  **tools = > eng_tools_alias**
*> agent.tools_search query=`query` tools=`tools`*

## describe
    + `id`
    + `tools`=None

Full ToolSpecV1 for one authorized id.

> ensure_plugin
1. not `tools`
  **tools = > eng_tools_alias**
*> agent.tools_describe id=`id` tools=`tools`*

## prepare
    + `tool_id`
    + `arguments`=None
    + `tools`=None

Validate + authorize without executing.

> ensure_plugin
1. not `tools`
  **tools = > eng_tools_alias**
*> agent.tools_prepare_call tool_id=`tool_id` arguments=`arguments` tools=`tools`*

## eng_tools_alias

Product CALL whitelist for agent.run.

**t = > table.empty_list**
**t = > table.append list=`t` item="tool_find"**
**t = > table.append list=`t` item="tool_reuse"**
**t = > table.append list=`t` item="tool_bind"**
**t = > table.append list=`t` item="tool_verify"**
**t = > table.append list=`t` item="tool_summarize"**
**t = > table.append list=`t` item="note_read"**
**t = > table.append list=`t` item="file_read"**
**t = > table.append list=`t` item="web_search"**
**t = > table.append list=`t` item="web_fetch"**
**t = > table.append list=`t` item="workspace_list"**
**t = > table.append list=`t` item="workspace_search"**
**t = > table.append list=`t` item="workspace_read"**
**t = > table.append list=`t` item="tools_search"**
**t = > table.append list=`t` item="tools_describe"**
**t = > table.append list=`t` item="plan_update"**
**t = > table.append list=`t` item="task_status"**
**t = > table.append list=`t` item="memory_forget"**
**t = > table.append list=`t` item="memory_list"**
**t = > table.append list=`t` item="memory_propose"**
**t = > table.append list=`t` item="notes_create"**
**t = > table.append list=`t` item="notes_update"**
**t = > table.append list=`t` item="files_patch"**
**t = > table.append list=`t` item="notes_search"**
*t*

## note_read
    + `path`
    + `root`="data"
    + `max_chars`=32000

*> note_read.run path=`path` root=`root` max_chars=`max_chars`*

## file_read
    + `path`
    + `root`="."
    + `max_chars`=32000

*> file_read.run path=`path` root=`root` max_chars=`max_chars`*

## web_search
    + `query`=""
    + `limit`=5

*> web_search.run query=`query` limit=`limit`*

## web_fetch
    + `url`=""
    + `max_bytes`=524288
    + `timeout_s`=20

*> web_fetch.run url=`url` max_bytes=`max_bytes` timeout_s=`timeout_s`*

## workspace_list
    + `path`=""
    + `root`="."
    + `cursor`=0
    + `limit`=50

*> workspace_list.run path=`path` root=`root` cursor=`cursor` limit=`limit`*

## workspace_search
    + `query`=""
    + `path`=""
    + `root`="."
    + `cursor`=0
    + `limit`=20

*> workspace_search.run query=`query` path=`path` root=`root` cursor=`cursor` limit=`limit`*

## workspace_read
    + `path`=""
    + `root`="."
    + `digest`=""
    + `line_start`=0
    + `line_end`=0
    + `max_bytes`=65536
    + `cursor`=""

*> workspace_read.run path=`path` root=`root` digest=`digest` line_start=`line_start` line_end=`line_end` max_bytes=`max_bytes` cursor=`cursor`*

## tools_search
    + `query`=""

Catalog search — authorize only; does not execute tools.

*> search query=`query`*

## tools_describe
    + `id`=""

*> describe id=`id`*

## plan_update
    + `turn_id`=""
    + `milestones`=None
    + `text`=""

*> plan_update.run turn_id=`turn_id` milestones=`milestones` text=`text`*

## task_status
    + `turn_id`=""
    + `task_id`=""
    + `status`="running"
    + `detail`=""

*> task_status.run turn_id=`turn_id` task_id=`task_id` status=`status` detail=`detail`*

## memory_forget
    + `id`=""

*> memory_forget.run id=`id`*

## memory_list
    + `scope`=""
    + `status`=""
    + `workspace_id`=""

*> memory_list.run scope=`scope` status=`status` workspace_id=`workspace_id`*

## memory_propose
    + `text`=""
    + `category`="preference"
    + `scope`="user"
    + `workspace_id`=""
    + `session_id`=""
    + `source_refs`=""

*> memory_propose.run text=`text` category=`category` scope=`scope` workspace_id=`workspace_id` session_id=`session_id` source_refs=`source_refs`*

## notes_create
    + `path`=""
    + `root`="data"
    + `content`=""

*> notes_create.run path=`path` root=`root` content=`content`*

## notes_update
    + `path`=""
    + `root`="data"
    + `content`=""
    + `expected_digest`=""

*> notes_update.run path=`path` root=`root` content=`content` expected_digest=`expected_digest`*

## files_patch
    + `path`=""
    + `root`="."
    + `content`=""
    + `expected_digest`=""

*> files_patch.run path=`path` root=`root` content=`content` expected_digest=`expected_digest`*

## notes_search
    + `query`=""
    + `path`=""
    + `root`="data"
    + `cursor`=0
    + `limit`=20

*> notes_search.run query=`query` path=`path` root=`root` cursor=`cursor` limit=`limit`*

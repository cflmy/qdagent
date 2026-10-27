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
**note_scopes = > json.parse text=["notes:read"]**
**file_scopes = > json.parse text=["workspace:read"]**
**web_scopes = > json.parse text=["network:read"]**
**meta_scopes = > json.parse text=["tools:describe"]**
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

**prod_note = > agent.tools_register spec=`note_spec`**
**prod_file = > agent.tools_register spec=`file_spec`**
**prod_ws = > agent.tools_register spec=`web_search_spec`**
**prod_wf = > agent.tools_register spec=`web_fetch_spec`**
**prod_wsl = > agent.tools_register spec=`ws_list_spec`**
**prod_wss = > agent.tools_register spec=`ws_search_spec`**
**prod_wsr = > agent.tools_register spec=`ws_read_spec`**
**prod_ts = > agent.tools_register spec=`tools_search_spec`**
**prod_td = > agent.tools_register spec=`tools_describe_spec`**
`out` =

| ok | eng | note | file | web_search | web_fetch | workspace_list | workspace_search | workspace_read | tools_search | tools_describe |
|----|-----|------|------|------------|-----------|----------------|------------------|----------------|--------------|----------------|
| True | `eng` | `prod_note` | `prod_file` | `prod_ws` | `prod_wf` | `prod_wsl` | `prod_wss` | `prod_wsr` | `prod_ts` | `prod_td` |

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

---
markup: occlusion
title: agent/tools/catalog
description: >-
  Q-A4 tool catalog — register ToolSpecV1 for eng tools and product read tools;
  eng_tools remain CALL aliases (tool_find … tool_summarize).
import:
  agent: ext/ai/agent.mq.md
  plugin: lib/plugin.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  note_read: note_read.mq.md
  file_read: file_read.mq.md
---

## ensure_plugin

**p = > plugin.native_path name="agent"**
1. `p`
  > plugin.load path=`p`
2. *
  > print text=qdagent tools catalog: native agent plugin not found
  > sys.exit code=1

## register_defaults

Seed Marqdo ToolSpec registry with the five engineering tools plus product
read tools (`note_read`, `file_read`). CALL names stay `tool_find` /
`tool_reuse` / `tool_bind` / `tool_verify` / `tool_summarize`.

> ensure_plugin
**eng = > agent.tools_register_eng_defaults**
**schema = > json.parse text={"type":"object","properties":{"path":{"type":"string"},"root":{"type":"string"},"max_chars":{"type":"integer","minimum":1,"maximum":200000}},"required":["path"],"additionalProperties":false}**
**note_scopes = > json.parse text=["notes:read"]**
**file_scopes = > json.parse text=["workspace:read"]**
`note_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| note_read | 1 | Read a host-relative note under an allowed root (default data/) | `schema` | read | `note_scopes` | ready |

`file_spec` =

| id | version | description | input_schema | effect | scopes | availability |
|----|---------|-------------|--------------|--------|--------|--------------|
| file_read | 1 | Read a host-relative workspace file (default root .) | `schema` | read | `file_scopes` | ready |

**prod_note = > agent.tools_register spec=`note_spec`**
**prod_file = > agent.tools_register spec=`file_spec`**
`out` =

| ok | eng | note | file |
|----|-----|------|------|
| True | `eng` | `prod_note` | `prod_file` |

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

Same whitelist as `qdagent.eng_tools` — product alias list for CALL.
Includes `note_read` / `file_read` after Q-A4 product registration.

**t = > table.empty_list**
**t = > table.append list=`t` item="tool_find"**
**t = > table.append list=`t` item="tool_reuse"**
**t = > table.append list=`t` item="tool_bind"**
**t = > table.append list=`t` item="tool_verify"**
**t = > table.append list=`t` item="tool_summarize"**
**t = > table.append list=`t` item="note_read"**
**t = > table.append list=`t` item="file_read"**
*t*

## note_read
    + `path`
    + `root`="data"
    + `max_chars`=32000

Product CALL target — delegates to `note_read.run` (read-only, no-exec).

*> note_read.run path=`path` root=`root` max_chars=`max_chars`*

## file_read
    + `path`
    + `root`="."
    + `max_chars`=32000

Workspace file CALL target — delegates to `file_read.run` (read-only, no-exec).

*> file_read.run path=`path` root=`root` max_chars=`max_chars`*

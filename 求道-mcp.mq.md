---
title: 求道-mcp
description: Marqdo MCP Server（stdio）— Cursor / Claude Desktop 接入求道笔记。
import agent:ext/ai/agent.mq.md
import api:lib/api.mq.md
---

# main

*srv = > agent.mcp_server name="qdagent"*
*srv = > srv.tool name="qd_list_recent" fn="api.list" description="List recent run notes"*
*srv = > srv.tool name="qd_search" fn="api.search" description="Keyword search over runs (evidence excerpts)"*
*srv = > srv.tool name="qd_capture" fn="api.capture" description="Capture a conclusion as data/runs/*.mq.md"*
*srv = > srv.tool name="qd_get_run" fn="api.get_run" description="Read full run .mq.md by slug"*
> srv.serve transport=stdio
**""**

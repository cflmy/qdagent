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
*srv = > srv.tool name="qd_context" fn="api.context" description="Load user profile plus corpus hits before answering"*
*srv = > srv.tool name="qd_profile" fn="api.profile_get" description="Read data/kb/用户画像.mq.md"*
*srv = > srv.tool name="qd_organize" fn="api.organize" description="Write a new kb/整理-*.mq.md index (does not rewrite runs); git-commits"*
*srv = > srv.tool name="qd_propose_change" fn="api.change_propose" description="Propose a file edit under kb/ or runs/ for human review (does not apply)"*
*srv = > srv.tool name="qd_list_changes" fn="api.change_list" description="List change proposals (optional status=open|applied|rejected)"*
*srv = > srv.tool name="qd_web_search" fn="api.web_search" description="Internet search via DuckDuckGo Instant Answer (evidence only)"*
*srv = > srv.tool name="qd_capture" fn="api.capture" description="Capture a conclusion as data/runs/*.mq.md"*
*srv = > srv.tool name="qd_get_run" fn="api.get_run" description="Read full run .mq.md by slug"*
> srv.serve transport=stdio
**""**

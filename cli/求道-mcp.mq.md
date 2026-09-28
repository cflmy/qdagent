---
title: 求道-mcp
description: Marqdo MCP Server（stdio）— Engineering Knowledge + legacy notes tools.
import agent:ext/ai/agent.mq.md
import api:../lib/api.mq.md
import gw:../gateway/mcp.mq.md
---

# main

**srv = > agent.mcp_server name="qdagent"**

Engineering Knowledge tools (qdagent 2.0):

**srv = > srv.tool name="qd_preflight" fn="gw.qd_preflight" description="Engineering Preflight → Context Pack (REUSE/ADAPT/CREATE)"**
**srv = > srv.tool name="qd_reuse" fn="gw.qd_reuse" description="Resolve REUSE/ADAPT/CREATE for a task via Marqdo EKC"**
**srv = > srv.tool name="qd_capability" fn="gw.qd_capability" description="Find engineering capabilities / symbols"**
**srv = > srv.tool name="qd_verify" fn="gw.qd_verify" description="Verify knowledge (verify/duplicate/conflicts/stale)"**
**srv = > srv.tool name="qd_record" fn="gw.qd_record" description="Write Knowledge Candidate (verify-before-promote)"**
**srv = > srv.tool name="qd_learn" fn="gw.qd_learn" description="Learn failure/decision into EKC"**

Legacy notes tools (compat):

**srv = > srv.tool name="qd_list_recent" fn="api.list" description="List recent run notes"**
**srv = > srv.tool name="qd_search" fn="api.search" description="Keyword search over runs (evidence excerpts)"**
**srv = > srv.tool name="qd_context" fn="api.context" description="Load user profile plus corpus hits before answering"**
**srv = > srv.tool name="qd_profile" fn="api.profile_get" description="Read data/kb/用户画像.mq.md"**
**srv = > srv.tool name="qd_organize" fn="api.organize" description="OKF promote (legacy): merge recent runs into concepts"**
**srv = > srv.tool name="qd_kb_list" fn="api.kb_list" description="List OKF concept notes under data/kb/concepts"**
**srv = > srv.tool name="qd_kb_get" fn="api.kb_get" description="Read one OKF concept note by slug"**
**srv = > srv.tool name="qd_propose_change" fn="api.change_propose" description="Propose a file edit under kb/ or runs/ for human review"**
**srv = > srv.tool name="qd_list_changes" fn="api.change_list" description="List change proposals"**
**srv = > srv.tool name="qd_web_search" fn="api.web_search" description="Internet search (evidence only)"**
**srv = > srv.tool name="qd_capture" fn="api.capture" description="Capture a conclusion as data/runs/*.mq.md"**
**srv = > srv.tool name="qd_get_run" fn="api.get_run" description="Read full run .mq.md by slug"**
> srv.serve transport=stdio
*""*

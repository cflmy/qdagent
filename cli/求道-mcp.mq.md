---
markup: occlusion
title: 求道-mcp
description: >-
  Marqdo MCP Server — Engineering Knowledge + legacy notes tools.
  transport=stdio (default) or http/streamable-http via QDAGENT_MCP_TRANSPORT.
import:
  agent: ext/ai/agent.mq.md
  api: ../lib/api.mq.md
  gw: ../gateway/mcp.mq.md
  sys: lib/sys.mq.md
---

# main

**srv = > agent.mcp_server name="qdagent"**

Engineering Knowledge tools (qdagent 2.0):

**srv = > srv.tool name="qd_preflight" fn="gw.qd_preflight" description="Engineering Preflight → Context Pack (REUSE/ADAPT/CREATE)"**
**srv = > srv.tool name="qd_reuse" fn="gw.qd_reuse" description="Resolve REUSE/ADAPT/CREATE for a task via Marqdo EKC"**
**srv = > srv.tool name="qd_capability" fn="gw.qd_capability" description="Find engineering capabilities / symbols"**
**srv = > srv.tool name="qd_verify" fn="gw.qd_verify" description="L3 suite exit codes: verify+duplicate+conflicts+stale (bundled)"**
**srv = > srv.tool name="qd_impact" fn="gw.qd_impact" description="Knowledge impact of changed paths (marqdo impact --json)"**
**srv = > srv.tool name="qd_conflicts" fn="gw.qd_conflicts" description="Conflict / possible-duplicate edges (marqdo conflicts --json)"**
**srv = > srv.tool name="qd_stale" fn="gw.qd_stale" description="Stale knowledge entries (marqdo stale --json)"**
**srv = > srv.tool name="qd_duplicate" fn="gw.qd_duplicate" description="Duplicate symbols by fingerprint (marqdo duplicate --json)"**
**srv = > srv.tool name="qd_record" fn="gw.qd_record" description="Write Knowledge Candidate (verify-before-promote)"**
**srv = > srv.tool name="qd_candidates" fn="gw.qd_candidates" description="List Knowledge Candidates"**
**srv = > srv.tool name="qd_promote" fn="gw.qd_promote" description="Promote candidate to knowledge/* after L3 verify"**
**srv = > srv.tool name="qd_reject" fn="gw.qd_reject" description="Reject a Knowledge Candidate"**
**srv = > srv.tool name="qd_learn" fn="gw.qd_learn" description="Learn failure/decision into EKC"**
**srv = > srv.tool name="qd_kb_status" fn="gw.qd_kb_status" description="Knowledge UI state: corpus/drafts/published + reuse metrics"**
**srv = > srv.tool name="qd_import" fn="gw.qd_import" description="TXT/Markdown document.extract → drafts (optional publish)"**
**srv = > srv.tool name="qd_bind" fn="gw.qd_bind" description="Actual reuse via eng_bind_execute (not discovery_only)"**

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

**transport = > sys.env_get name="QDAGENT_MCP_TRANSPORT"**
1. not `transport`
  **transport = "stdio"**
**host = > sys.env_get name="QDAGENT_MCP_HOST"**
1. not `host`
  **host = "127.0.0.1"**
**port_s = > sys.env_get name="QDAGENT_MCP_PORT"**
1. not `port_s`
  **port_s = "7434"**
**path = > sys.env_get name="QDAGENT_MCP_PATH"**
1. not `path`
  **path = "/mcp"**
**port = `port_s`**
> srv.serve transport=`transport` host=`host` port=`port` path=`path`
*""*

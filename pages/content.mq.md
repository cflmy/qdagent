---
title: pages/content
description: >-
  Document bodies as Markdown (ADR 0007). Rendered via site.page_md — the page
  text is the documentation humans and models both read.
  Paths written with HTML code tags so *return* markers do not parse path ticks.
---

## 设置枢纽

**md = "# 设置\n\n<strong>工程知识</strong>优先：[预检](/eng/preflight) · [能力](/eng/capability) · [工作簿](/eng/run)。\n\n大模型、语音、记忆与 MCP / OpenAI 接入。知识本体是 <code>*.mq.md</code> + EKC（<code>.marqdo</code>）；个人画像在 <code>data/kb/用户画像.mq.md</code>（Personal Memory，非工程主轴）。\n\n- [大模型设置](/settings/llm)\n- [语音设置](/settings/voice)\n- [记忆 · 画像与整理](/settings/memory)\n- [MCP 接入](/settings/mcp)\n- [OpenAI 兼容网关](/settings/openai)\n"**
*md*

## 大模型设置

**md = "# 大模型设置\n\nOpenAI 兼容 Chat API。保存前会 ping；改 Base URL 后请重启 <code>marqdo run serve.mq.md</code> 使同域 <code>/llm</code> 代理生效。\n\n<p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>\n"**
*md*

## 语音设置

**md = "# 语音设置\n\n<strong>实时听写</strong>仍优先用浏览器 Web Speech；国内连不上 Google 时会自动切到<strong>云端分段听写</strong>，直连失败再经 <code>proxy.cflmy.top</code> 重试。请配置 ASR（可空，复用大模型 Key/Base URL）。TTS 仅用于「朗读」。\n\n<p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>\n"**
*md*

## mcp

**md = "# MCP 接入\n\nCursor / Claude Desktop 经 MCP 使用求道工程知识（可不使用求道模型）。宿主：<code>marqdo run 求道-mcp.mq.md</code> 或 <code>./scripts/qdagent mcp</code>。\n\n<strong>工程工具</strong>：<code>qd_preflight</code>、<code>qd_reuse</code>、<code>qd_capability</code>、<code>qd_verify</code>、<code>qd_record</code>、<code>qd_learn</code>。\n\n<strong>笔记兼容</strong>：<code>qd_list_recent</code>、<code>qd_search</code>、<code>qd_context</code>、<code>qd_profile</code>、<code>qd_organize</code>、<code>qd_kb_*</code>、<code>qd_capture</code>。\n\n若要把<strong>求道当模型</strong>（OpenAI <code>base_url</code>），请看 [OpenAI 兼容网关](/settings/openai)。\n\n<p><button type=\"button\" id=\"qd-mcp-copy\" class=\"primary\">复制 mcp.json</button> <button type=\"button\" id=\"qd-mcp-health\">检查宿主健康</button></p>\n<p id=\"qd-mcp-status\" class=\"qd-settings-status\"></p>\n<pre id=\"qd-mcp-json\" class=\"qd-mcp-json\"></pre>\n"**
*md*

## openai

**md = "# OpenAI 兼容网关\n\n把求道当作一个「模型」挂进 Cursor / Continue / Open WebUI。默认 <code>QDAGENT_V1_EFI=1</code>：Python 只做 HTTP 传输，领域逻辑走 <code>gateway/v1_chat.mq.md</code> → <code>agent/qdagent</code>（工程预检）。\n\nLegacy 厚网关（画像+corpus inject）仅在 <code>QDAGENT_V1_EFI=0</code> 时启用，勿扩展。\n\n与 [MCP](/settings/mcp) 互补：MCP = 编辑器模型 + 求道知识；本网关 = 求道当模型。\n\n## 客户端配置\n\n<pre class=\"qd-mcp-json\">BASE_URL=http://127.0.0.1:7431/v1\nAPI_KEY=qdagent-local\nMODEL=qdagent</pre>\n\n## 验收\n\n<pre class=\"qd-mcp-json\">curl -s http://127.0.0.1:7431/v1/models -H \"Authorization: Bearer qdagent-local\"</pre>\n"**
*md*

## 记忆

**md = "# 记忆 · 画像与变更审查\n\n权威文件：<code>data/kb/用户画像.mq.md</code>；整理后的知识在 <code>data/kb/concepts</code>（OKF）；审计 runs 在 <code>data/runs</code>。知识库使用独立 git（<code>data/.git</code>）。清理/改写须经<strong>变更提案</strong>审查后应用。「智能整理」合并主题到 concepts，<strong>不改写</strong>历史 runs。\n\n<p id=\"qd-memory-status\" class=\"qd-settings-status\"></p>\n<p><button type=\"button\" id=\"qd-profile-refresh\" class=\"primary\">刷新画像</button> <button type=\"button\" id=\"qd-profile-reset\">提案：重置画像模板</button> <input id=\"qd-organize-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:14rem\"/> <button type=\"button\" id=\"qd-organize\">智能整理（OKF）</button></p>\n\n## 待审变更\n\n<div id=\"qd-changes-list\" class=\"qd-changes-list\"></div>\n<pre id=\"qd-change-diff\" class=\"qd-change-diff\" hidden></pre>\n<p class=\"qd-changes-actions\"><button type=\"button\" id=\"qd-change-apply\" class=\"primary\" disabled>应用选中</button> <button type=\"button\" id=\"qd-change-reject\" disabled>拒绝选中</button> <button type=\"button\" id=\"qd-changes-refresh\">刷新提案</button></p>\n\n## Git 历史\n\n<div id=\"qd-git-log\" class=\"qd-git-log\"></div>\n<p><button type=\"button\" id=\"qd-git-refresh\">刷新提交</button> <button type=\"button\" id=\"qd-git-revert\" disabled>回滚选中提交</button></p>\n\n## 当前画像\n\n<pre id=\"qd-profile-body\" class=\"qd-profile-body\"></pre>\n"**
*md*

## 笔记库

**md = "# 笔记库\n\n默认展示 <strong>OKF 整理后的概念笔记</strong>（<code>data/kb/concepts</code>）。对话仍自动沉淀到 <code>data/runs</code>（只追加）；智能体增量整理后在此合并主题。[原始沉淀](/notes/runs) · [记一笔](/notes/new) · [记忆审查](/settings/memory)\n\n<p class=\"qd-notes-toolbar\"><button type=\"button\" id=\"qd-kb-organize\" class=\"primary\">智能整理</button> <input id=\"qd-kb-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:12rem\"/> <span id=\"qd-kb-status\" class=\"qd-muted\"></span></p>\n<div id=\"qd-kb-grid\" class=\"qd-kb-grid\" aria-live=\"polite\"></div>\n<article id=\"qd-kb-detail\" class=\"qd-kb-detail\" hidden><header class=\"qd-kb-detail-head\"><h2 id=\"qd-kb-detail-title\">笔记</h2><button type=\"button\" id=\"qd-kb-detail-close\">关闭</button></header><pre id=\"qd-kb-detail-body\" class=\"qd-kb-detail-body\"></pre></article>\n"**
*md*

## 原始沉淀

**md = "# 原始沉淀\n\n审计层：每次对话/执行追加的 <code>data/runs/*.mq.md</code>。<strong>不会</strong>被整理改写。回到[整理后的笔记库](/notes)。\n"**
*md*

## 工程预检

**md = "# 工程预检\n\n求道 2.0 杀手级入口：在写代码前先获得 <strong>Engineering First Information</strong>。\n\n<pre class=\"qd-mcp-json\">./scripts/qdagent preflight \"给 OpenAI /v1 网关增加工程预检再调上游\"</pre>\n\n输出是 <code>.marqdo/agent/contexts/task-*.mq.md</code>（Context Pack），含 Existing Capabilities / Recommended REUSE·ADAPT·CREATE / Forbidden / create_allowed。\n\nHTTP：<code>POST /api/eng/preflight</code> · MCP：<code>qd_preflight</code>。\n\n<p><input id=\"qd-eng-task\" type=\"text\" placeholder=\"工程任务\" style=\"width:min(36rem,100%)\"/> <button type=\"button\" id=\"qd-eng-preflight\" class=\"primary\">预检</button></p>\n<pre id=\"qd-eng-out\" class=\"qd-mcp-json\"></pre>\n"**
*md*

## 工程工作簿

**md = "# 工程工作簿\n\n一次 BUILD 的执行证据：Task → Preflight → Decision → Execution → Verification → Knowledge Candidate。\n\n落盘：<code>data/workbooks/wb-*.mq.md</code>。\n\n<pre class=\"qd-mcp-json\">./scripts/qdagent build \"…\"\n./scripts/qdagent verify\n./scripts/qdagent metrics</pre>\n\n<p><button type=\"button\" id=\"qd-eng-verify\" class=\"primary\">运行验证</button> <button type=\"button\" id=\"qd-eng-metrics\">刷新 KPI</button></p>\n<pre id=\"qd-eng-verify-out\" class=\"qd-mcp-json\"></pre>\n<pre id=\"qd-eng-metrics-out\" class=\"qd-mcp-json\"></pre>\n"**
*md*

## 工程能力

**md = "# 工程能力\n\nCapability 是第一公民：系统已经能做什么（≠ 函数列表）。数据来自 Marqdo EKC（<code>.marqdo/catalog/capabilities</code>）。\n\n<pre class=\"qd-mcp-json\">./scripts/qdagent find \"openai gateway\"\n./scripts/qdagent reuse \"给 OpenAI /v1 增加预检\"</pre>\n\n<p><input id=\"qd-eng-query\" type=\"text\" placeholder=\"能力查询\" style=\"width:min(36rem,100%)\"/> <button type=\"button\" id=\"qd-eng-find\" class=\"primary\">查找</button></p>\n<pre id=\"qd-eng-find-out\" class=\"qd-mcp-json\"></pre>\n"**
*md*

---
title: lib/ui
description: >-
  Shared UI tables for qdagent Documents — form fields/rules, head links, users.
  Data as GFM tables (code-as-documentation).
import nav:../components/nav.mq.md
import side:../components/side.mq.md
import foot:../components/foot.mq.md
---

## nav

*> nav.nav*

## side

*> side.side*

## foot

*> foot.foot*

## 笔记字段

`字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| slug | 标识 | text | true | |
| title | 标题 | text | true | |
| summary | 摘要 | text | false | |
| body | 正文 | textarea | true | |

*`字段`*

## 笔记规则

`规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| slug | required | 标识不能为空 |
| title | required | 标题不能为空 |
| body | required | 正文不能为空 |

*`规则`*

## 大模型字段

`字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| llm_api_key | API Key | text | true | |
| llm_base_url | Base URL | text | true | https://api.openai.com/v1 |
| llm_model | Model | text | true | gpt-4o-mini |

*`字段`*

## 大模型规则

`规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| llm_api_key | required | 请填写 API Key |
| llm_base_url | required | 请填写 Base URL |
| llm_model | required | 请填写模型名 |
| llm_base_url | max:500 | Base URL 太长 |
| llm_model | max:120 | 模型名太长 |

*`规则`*

## 语音字段

`字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| dictation_lang | 听写语言（zh-CN 中文 / en-US 英文 / auto 跟随浏览器） | text | false | zh-CN |
| asr_api_key | ASR API Key（国内推荐；空则复用大模型 Key） | text | false | |
| asr_base_url | ASR Base URL（空则复用大模型 Base URL） | text | false | |
| asr_model | ASR Model（如 whisper-1 / FunAudioLLM/SenseVoiceSmall） | text | false | whisper-1 |
| tts_api_key | TTS API Key（仅朗读需要） | text | false | |
| tts_base_url | TTS Base URL | text | false | https://api.openai.com/v1 |
| tts_model | TTS Model | text | false | tts-1 |

*`字段`*

## 语音规则

`规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| dictation_lang | max:32 | 听写语言代码过长 |
| asr_base_url | max:500 | ASR Base URL 太长 |
| asr_model | max:120 | ASR 模型名太长 |
| tts_base_url | max:500 | TTS Base URL 太长 |

*`规则`*

## 头资源

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |

*`头`*

## 聊天头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/qd-voice.js" | | true | 30 |
| script | "/static/chat.js" | | true | 30 |

*`头`*

## 记一笔头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/qd-voice.js" | | true | 30 |
| script | "/static/notes-voice.js" | | true | 30 |

*`头`*

## 笔记库头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/notes-kb.js" | | true | 30 |

*`头`*

## 设置头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/settings.js" | | true | 30 |

*`头`*

## 接入头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/mcp.js" | | true | 30 |

*`头`*

## 记忆头

`头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/memory.js" | | true | 30 |

*`头`*

## 用户

`用户` =

| 用户名 | 密码 | 角色 |
|--------|------|------|
| demo | demo | user |

*`用户`*

## 接口

`接口` =

| 路径 | 方法 | 表 | 排序 | 上限 |
|------|------|-----|------|------|
| /api/settings | GET | settings | | 1 |

*`接口`*

## 聊天引言

*"<div class=\"qd-workspace\"><aside class=\"qd-sessions\" aria-label=\"会话\"><div class=\"qd-sessions-head\"><strong>会话</strong><button type=\"button\" id=\"qd-new-session\" class=\"primary\">新会话</button></div><ul id=\"qd-session-list\" class=\"qd-session-list\"></ul></aside><div class=\"qd-chat\"><header class=\"qd-chat-top\"><div class=\"qd-head\"><h1 id=\"qd-session-title\">求道</h1><p>笔记驱动助手 · 流式对话 · 自动沉淀</p></div><div class=\"qd-toolbar\"><span id=\"qd-status\">加载设置…</span><button type=\"button\" id=\"qd-mic\">语音</button><button type=\"button\" id=\"qd-speak\">朗读</button><button type=\"button\" id=\"qd-save\">再存</button></div></header><div id=\"qd-log\" class=\"qd-log\" aria-live=\"polite\"></div><footer class=\"qd-composer\"><div id=\"qd-runbar\" class=\"qd-runbar\" hidden><span class=\"qd-runbar-pulse\" aria-hidden=\"true\"></span><div class=\"qd-runbar-main\"><strong id=\"qd-runbar-label\">进行中</strong><ol id=\"qd-run-steps\" class=\"qd-run-steps\"></ol></div><button type=\"button\" id=\"qd-stop-bar\" class=\"danger\">停止</button></div><div class=\"qd-sendrow\"><textarea id=\"qd-input\" rows=\"1\" placeholder=\"输入问题，或继续写下一行…\"></textarea><div class=\"qd-send-slot\"><button type=\"button\" id=\"qd-send\" class=\"primary\">发送</button><button type=\"button\" id=\"qd-stop\" class=\"danger qd-stop-main\" hidden title=\"停止生成 (Esc)\" aria-label=\"停止生成\">停止</button></div></div></footer></div></div>"*

## 聊天样式

*"html,body{height:100%;overflow:hidden}body{display:flex;flex-direction:column}header.topnav{flex-shrink:0}aside.side{display:none!important}.layout,.site-layout,body>.wrap,body>.container,#app,.page-shell{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}main.main{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:0!important;margin:0!important}main.main>.site-form{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important;white-space:nowrap!important}.side-label{display:none!important}main.main>.main-intro{flex:1;min-height:0;display:flex;flex-direction:column;padding:0!important;overflow:hidden}footer.foot,.site-footer{display:none!important}"*

## 笔记库引言

*"<h1>笔记库</h1><p>默认展示<strong>OKF 整理后的概念笔记</strong>（<code>data/kb/concepts</code>）。对话仍自动沉淀到 <code>data/runs</code>（只追加）；智能体增量整理后在此合并主题。<a href=\"/notes/runs\">原始沉淀</a> · <a href=\"/notes/new\">记一笔</a> · <a href=\"/settings/memory\">记忆审查</a></p><p class=\"qd-notes-toolbar\"><button type=\"button\" id=\"qd-kb-organize\" class=\"primary\">智能整理</button> <input id=\"qd-kb-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:12rem\"/> <span id=\"qd-kb-status\" class=\"qd-muted\"></span></p><div id=\"qd-kb-grid\" class=\"qd-kb-grid\" aria-live=\"polite\"></div><article id=\"qd-kb-detail\" class=\"qd-kb-detail\" hidden><header class=\"qd-kb-detail-head\"><h2 id=\"qd-kb-detail-title\">笔记</h2><button type=\"button\" id=\"qd-kb-detail-close\">关闭</button></header><pre id=\"qd-kb-detail-body\" class=\"qd-kb-detail-body\"></pre></article>"*

## 原始沉淀引言

*"<h1>原始沉淀</h1><p>审计层：每次对话/执行追加的 <code>data/runs/*.mq.md</code>。<strong>不会</strong>被整理改写。回到<a href=\"/notes\">整理后的笔记库</a>。</p>"*

## 记一笔引言

*"<h1>记一笔</h1><p>左栏语音转写，右栏自己写；小助手可据转写协作改写右侧。</p><div id=\"qd-note-split\" class=\"qd-note-split\"><section class=\"qd-note-col qd-note-voice-col\" aria-label=\"语音转写\"><header><h2>语音转写</h2><p class=\"qd-muted\">优先浏览器实时听写；国内 Chrome 常因连不上 Google 报 <code>network</code>，将自动改用「录音→云端 ASR」（请在语音设置填 ASR，或复用大模型 Key）。</p></header><div class=\"qd-notes-voice-row\"><button type=\"button\" id=\"qd-note-mic\" class=\"primary\">开始听写</button> <button type=\"button\" id=\"qd-note-clear-tx\">清空转写</button> <label class=\"qd-dictation-lang-wrap\">语言 <select id=\"qd-note-lang\" class=\"qd-dictation-lang\"></select></label> <span id=\"qd-note-voice-status\" class=\"qd-muted\"></span></div><div id=\"qd-note-vu\" class=\"qd-vu\" aria-live=\"polite\"><div class=\"qd-vu-track\"><div class=\"qd-vu-fill\" id=\"qd-note-vu-fill\"></div></div><span class=\"qd-vu-label\" id=\"qd-note-vu-label\">音量（听写时显示）</span></div><div id=\"qd-note-transcript\" class=\"qd-note-transcript\" contenteditable=\"true\" role=\"textbox\" aria-label=\"转写文本\"></div><p id=\"qd-note-interim\" class=\"qd-note-interim qd-muted\" aria-live=\"polite\"></p></section><section class=\"qd-note-col qd-note-write-col\" aria-label=\"自己写\"><header><h2>自己写</h2><p class=\"qd-muted\">可手写；点「小助手协作」根据左侧转写整理右侧标题/摘要/正文。</p></header><div class=\"qd-notes-voice-row\"><button type=\"button\" id=\"qd-note-assist\" class=\"primary\">小助手协作</button> <label class=\"qd-note-auto\"><input type=\"checkbox\" id=\"qd-note-auto-assist\"/> 停说后自动协作</label> <span id=\"qd-note-assist-status\" class=\"qd-muted\"></span></div><div id=\"qd-note-form-mount\"></div></section></div>"*

## 记一笔样式

*".qd-note-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem;align-items:stretch;margin:0.75rem 0 1rem}@media(max-width:900px){.qd-note-split{grid-template-columns:1fr}}.qd-note-col{border:1px solid #d5dae0;background:rgba(255,255,255,.72);padding:.85rem .95rem 1rem;min-height:16rem}.qd-note-col h2{margin:0 0 .25rem;font-size:1.05rem}.qd-note-transcript{min-height:12rem;max-height:28rem;overflow:auto;border:1px solid #d5dae0;background:#fff;padding:.65rem .75rem;white-space:pre-wrap}"*

## 设置枢纽引言

*"<h1>设置</h1><p>大模型、语音、记忆与 MCP / OpenAI 接入。知识本体是 <code>data/runs/*.mq.md</code>；用户画像在 <code>data/kb/用户画像.mq.md</code>。</p><ul class=\"qd-settings-links\"><li><a href=\"/settings/llm\">大模型设置</a></li><li><a href=\"/settings/voice\">语音设置</a></li><li><a href=\"/settings/memory\">记忆 · 画像与整理</a></li><li><a href=\"/settings/mcp\">MCP 接入</a></li><li><a href=\"/settings/openai\">OpenAI 兼容网关</a></li></ul>"*

## 大模型设置引言

*"<h1>大模型设置</h1><p>OpenAI 兼容 Chat API。保存前会 ping；改 Base URL 后请重启 <code>marqdo run serve.mq.md</code> 使同域 <code>/llm</code> 代理生效。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"*

## 语音设置引言

*"<h1>语音设置</h1><p><strong>实时听写</strong>仍优先用浏览器 Web Speech；国内连不上 Google 时会自动切到<strong>云端分段听写</strong>，直连失败再经 <code>proxy.cflmy.top</code> 重试。请配置 ASR（可空，复用大模型 Key/Base URL）。TTS 仅用于「朗读」。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"*

## mcp引言

*"<h1>MCP 接入</h1><p>Cursor / Claude Desktop 经 MCP 读写笔记（编辑器自带模型）。宿主为 <code>marqdo run 求道-mcp.mq.md</code>。</p><p>若要把<strong>求道当模型</strong>（OpenAI <code>base_url</code>），请看 <a href=\"/settings/openai\">OpenAI 兼容网关</a>。</p><p>工具：<code>qd_list_recent</code>、<code>qd_get_run</code>、<code>qd_search</code>、<code>qd_context</code>、<code>qd_profile</code>、<code>qd_organize</code>、<code>qd_kb_list</code>、<code>qd_kb_get</code>、<code>qd_capture</code>。</p><p><button type=\"button\" id=\"qd-mcp-copy\" class=\"primary\">复制 mcp.json</button> <button type=\"button\" id=\"qd-mcp-health\">检查宿主健康</button></p><p id=\"qd-mcp-status\" class=\"qd-settings-status\"></p><pre id=\"qd-mcp-json\" class=\"qd-mcp-json\"></pre><p class=\"qd-muted\"><code>marqdo catalog data/kb</code> · <code>marqdo view data/runs</code></p>"*

## openai引言

*"<h1>OpenAI 兼容网关</h1><p>把求道当作一个「模型」挂进 Cursor / Continue / Open WebUI：每次 <code>/v1/chat/completions</code> 都会<strong>自动沉淀</strong>到 <code>data/runs</code>（服务端强制审计），并注入用户画像与笔记检索后再转发上游大模型。</p><p>与 <a href=\"/settings/mcp\">MCP</a> 互补：MCP = 编辑器模型 + 求道记忆；本网关 = 求道当模型 + 自动笔记本。</p><h2>客户端配置</h2><pre class=\"qd-mcp-json\">BASE_URL=http://127.0.0.1:7431/v1\nAPI_KEY=qdagent-local\nMODEL=qdagent</pre><p class=\"qd-muted\">API Key 默认 <code>qdagent-local</code>（环境变量 <code>QDAGENT_API_KEY</code>）。旁路进程默认 <code>:7433</code>，由 <code>./scripts/mq.sh</code> 拉起并通过 Marqdo 代理挂到同端口 <code>/v1</code>。</p><h2>验收</h2><pre class=\"qd-mcp-json\">curl -s http://127.0.0.1:7431/v1/models -H \"Authorization: Bearer qdagent-local\"\n\ncurl -s http://127.0.0.1:7431/v1/chat/completions \\\n  -H \"Authorization: Bearer qdagent-local\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"model\":\"qdagent\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}'</pre><p class=\"qd-muted\">成功后查看响应头 <code>X-QDAgent-Run-Id</code> 与 <code>data/runs/api-*.mq.md</code>。</p>"*

## 记忆引言

*"<h1>记忆 · 画像与变更审查</h1><p>权威文件：<code>data/kb/用户画像.mq.md</code>；整理后的知识在 <code>data/kb/concepts</code>（OKF）；审计 runs 在 <code>data/runs</code>。知识库使用独立 git（<code>data/.git</code>）。清理/改写须经<strong>变更提案</strong>审查后应用。「智能整理」合并主题到 concepts，<strong>不改写</strong>历史 runs。</p><p id=\"qd-memory-status\" class=\"qd-settings-status\"></p><p><button type=\"button\" id=\"qd-profile-refresh\" class=\"primary\">刷新画像</button> <button type=\"button\" id=\"qd-profile-reset\">提案：重置画像模板</button> <input id=\"qd-organize-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:14rem\"/> <button type=\"button\" id=\"qd-organize\">智能整理（OKF）</button></p><h2>待审变更</h2><div id=\"qd-changes-list\" class=\"qd-changes-list\"></div><pre id=\"qd-change-diff\" class=\"qd-change-diff\" hidden></pre><p class=\"qd-changes-actions\"><button type=\"button\" id=\"qd-change-apply\" class=\"primary\" disabled>应用选中</button> <button type=\"button\" id=\"qd-change-reject\" disabled>拒绝选中</button> <button type=\"button\" id=\"qd-changes-refresh\">刷新提案</button></p><h2>Git 历史</h2><div id=\"qd-git-log\" class=\"qd-git-log\"></div><p><button type=\"button\" id=\"qd-git-refresh\">刷新提交</button> <button type=\"button\" id=\"qd-git-revert\" disabled>回滚选中提交</button></p><h2>当前画像</h2><pre id=\"qd-profile-body\" class=\"qd-profile-body\"></pre>"*

## 笔记条件

`条件` =

| 字段 | 操作 | 值 |
|------|------|-----|
| slug | = | {slug} |

*`条件`*

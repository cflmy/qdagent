---
title: 求道
description: 登录后对话；笔记库与模型 API 设置。无前后台之分。
导入 网页:ext/web/网页.mq.md
import shell:styles/shell.mq.md
import nav:components/nav.mq.md
import side:components/side.mq.md
import foot:components/foot.mq.md
import db:db/index.mq.md
import api:lib/api.mq.md
import sys:lib/sys.mq.md
---

# main

`壳` =

| 组件 | 样式 |
|------|------|
| nav.`nav` | shell.`topnav` |
| side.`side` | shell.`side_panel` |
| foot.`foot` | |

`列表` =

| 属性 | 值 | 样式 |
|------|-----|------|
| title | runs.title | shell.`card_title` |
| body | runs.summary | shell.`card_body` |
| href | runs.slug | |

`详情` =

| 属性 | 值 | 样式 |
|------|-----|------|
| title | runs.title | shell.`card_title` |
| meta | runs.slug | |
| body | runs.body | shell.`card_body` |

`笔记条件` =

| 字段 | 操作 | 值 |
|------|------|-----|
| slug | = | {slug} |

`笔记字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| slug | 标识 | text | true | |
| title | 标题 | text | true | |
| summary | 摘要 | text | false | |
| body | 正文 | textarea | true | |

`笔记规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| slug | required | 标识不能为空 |
| title | required | 标题不能为空 |
| body | required | 正文不能为空 |

`大模型字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| llm_api_key | API Key | text | true | |
| llm_base_url | Base URL | text | true | https://api.openai.com/v1 |
| llm_model | Model | text | true | gpt-4o-mini |

`大模型规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| llm_api_key | required | 请填写 API Key |
| llm_base_url | required | 请填写 Base URL |
| llm_model | required | 请填写模型名 |
| llm_base_url | max:500 | Base URL 太长 |
| llm_model | max:120 | 模型名太长 |

`语音字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| dictation_lang | 听写语言（zh-CN 中文 / en-US 英文 / auto 跟随浏览器） | text | false | zh-CN |
| asr_api_key | ASR API Key（国内推荐；空则复用大模型 Key） | text | false | |
| asr_base_url | ASR Base URL（空则复用大模型 Base URL） | text | false | |
| asr_model | ASR Model（如 whisper-1 / FunAudioLLM/SenseVoiceSmall） | text | false | whisper-1 |
| tts_api_key | TTS API Key（仅朗读需要） | text | false | |
| tts_base_url | TTS Base URL | text | false | https://api.openai.com/v1 |
| tts_model | TTS Model | text | false | tts-1 |

`语音规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| dictation_lang | max:32 | 听写语言代码过长 |
| asr_base_url | max:500 | ASR Base URL 太长 |
| asr_model | max:120 | ASR 模型名太长 |
| tts_base_url | max:500 | TTS Base URL 太长 |

`头资源` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |

`聊天头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/qd-voice.js" | | true | 30 |
| script | "/static/chat.js" | | true | 30 |

`记一笔头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/qd-voice.js" | | true | 30 |
| script | "/static/notes-voice.js" | | true | 30 |

`笔记库头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/notes-kb.js" | | true | 30 |

`设置头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/settings.js" | | true | 30 |

`接入头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/mcp.js" | | true | 30 |

`记忆头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| preconnect | "https://fonts.googleapis.com" | | | |
| preconnect | "https://fonts.gstatic.com" | | | |
| stylesheet | "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;600;650&family=Literata:opsz,wght@7..72,400;600;700&family=Outfit:wght@400;500;520;600&family=IBM+Plex+Mono:wght@400;500&display=swap" | "text/css" | | |
| stylesheet | "/static/theme.css" | "text/css" | | 30 |
| script | "/static/qd-api.js" | | true | 30 |
| script | "/static/memory.js" | | true | 30 |

`用户` =

| 用户名 | 密码 | 角色 |
|--------|------|------|
| demo | demo | user |

`接口` =

| 路径 | 方法 | 表 | 排序 | 上限 |
|------|------|-----|------|------|
| /api/settings | GET | settings | | 1 |

**host = > sys.env_get name="QDAGENT_HOST"**
1. not `host`
  **host = "0.0.0.0"**
**port_s = > sys.env_get name="QDAGENT_PORT"**
1. not `port_s`
  **port_s = "7431"**
**port = > int value=`port_s`**

**store = > db.open**

**chat_intro = "<div class=\"qd-workspace\"><aside class=\"qd-sessions\" aria-label=\"会话\"><div class=\"qd-sessions-head\"><strong>会话</strong><button type=\"button\" id=\"qd-new-session\" class=\"primary\">新会话</button></div><ul id=\"qd-session-list\" class=\"qd-session-list\"></ul></aside><div class=\"qd-chat\"><header class=\"qd-chat-top\"><div class=\"qd-head\"><h1 id=\"qd-session-title\">求道</h1><p>流式对话 · 自动联网 · 自动沉淀</p></div><div class=\"qd-toolbar\"><span id=\"qd-status\">加载设置…</span><button type=\"button\" id=\"qd-mic\">语音</button><button type=\"button\" id=\"qd-speak\">朗读</button><button type=\"button\" id=\"qd-save\">再存</button></div></header><div id=\"qd-log\" class=\"qd-log\" aria-live=\"polite\"></div><footer class=\"qd-composer\"><div id=\"qd-runbar\" class=\"qd-runbar\" hidden><span class=\"qd-runbar-pulse\" aria-hidden=\"true\"></span><div class=\"qd-runbar-main\"><strong id=\"qd-runbar-label\">进行中</strong><ol id=\"qd-run-steps\" class=\"qd-run-steps\"></ol></div><button type=\"button\" id=\"qd-stop-bar\" class=\"danger\">停止</button></div><div class=\"qd-sendrow\"><textarea id=\"qd-input\" rows=\"1\" placeholder=\"发送消息… Enter 发送，Shift+Enter 换行，Esc 停止\"></textarea><div class=\"qd-send-slot\"><button type=\"button\" id=\"qd-send\" class=\"primary\">发送</button><button type=\"button\" id=\"qd-stop\" class=\"danger qd-stop-main\" hidden title=\"停止生成 (Esc)\" aria-label=\"停止生成\">停止</button></div></div></footer></div></div>"**

**page = > 网页.页面 标题="求道 · 对话" 引言=`chat_intro`**
**page = > page.布局 布局="sidebar"**
**page = > page.组件装配 组件=`壳`**
**page = > page.头装配 表=`聊天头`**
**page = > page.样式 样式="html,body{height:100%;overflow:hidden}body{display:flex;flex-direction:column}header.topnav{flex-shrink:0}aside.side{display:none!important}.layout,.site-layout,body>.wrap,body>.container,#app,.page-shell{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}main.main{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:0!important;margin:0!important}main.main>.site-form{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important;white-space:nowrap!important}.side-label{display:none!important}main.main>.main-intro{flex:1;min-height:0;display:flex;flex-direction:column;padding:0!important;overflow:hidden}footer.foot,.site-footer{display:none!important}"**

**note_form = > 网页.表单 表="runs" 动作="插入"**
**note_form = > note_form.字段 字段=`笔记字段`**
**note_form = > note_form.规则 规则=`笔记规则`**
**page = > page.表单装配 id="note" 表单=note_form**

**notes = > 网页.页面 标题="笔记库" 引言="<h1>笔记库</h1><p>默认展示<strong>OKF 整理后的概念笔记</strong>（<code>data/kb/concepts</code>）。对话仍自动沉淀到 <code>data/runs</code>（只追加）；智能体增量整理后在此合并主题。<a href=\"/notes/runs\">原始沉淀</a> · <a href=\"/notes/new\">记一笔</a> · <a href=\"/settings/memory\">记忆审查</a></p><p class=\"qd-notes-toolbar\"><button type=\"button\" id=\"qd-kb-organize\" class=\"primary\">智能整理</button> <input id=\"qd-kb-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:12rem\"/> <span id=\"qd-kb-status\" class=\"qd-muted\"></span></p><div id=\"qd-kb-grid\" class=\"qd-kb-grid\" aria-live=\"polite\"></div><article id=\"qd-kb-detail\" class=\"qd-kb-detail\" hidden><header class=\"qd-kb-detail-head\"><h2 id=\"qd-kb-detail-title\">笔记</h2><button type=\"button\" id=\"qd-kb-detail-close\">关闭</button></header><pre id=\"qd-kb-detail-body\" class=\"qd-kb-detail-body\"></pre></article>"**
**notes = > notes.组件装配 组件=`壳`**
**notes = > notes.头装配 表=`笔记库头`**

**notes_runs = > 网页.页面 标题="原始沉淀" 引言="<h1>原始沉淀</h1><p>审计层：每次对话/执行追加的 <code>data/runs/*.mq.md</code>。<strong>不会</strong>被整理改写。回到<a href=\"/notes\">整理后的笔记库</a>。</p>"**
**notes_runs = > notes_runs.组件装配 组件=`壳`**
**notes_runs = > notes_runs.主体装配 主体=`列表`**
**notes_runs = > notes_runs.排序 排序="-created_at"**
**notes_runs = > notes_runs.链接前缀 前缀="/run/"**
**notes_runs = > notes_runs.头装配 表=`头资源`**

**detail = > 网页.页面 标题="笔记"**
**detail = > detail.组件装配 组件=`壳`**
**detail = > detail.主体装配 主体=`详情`**
**detail = > detail.查询条件 条件=`笔记条件`**
**detail = > detail.详情 详情=True**
**detail = > detail.头装配 表=`头资源`**

**new = > 网页.页面 标题="记一笔" 引言="<h1>记一笔</h1><p>左栏语音转写，右栏自己写；小助手可据转写协作改写右侧。</p><div id=\"qd-note-split\" class=\"qd-note-split\"><section class=\"qd-note-col qd-note-voice-col\" aria-label=\"语音转写\"><header><h2>语音转写</h2><p class=\"qd-muted\">优先浏览器实时听写；国内 Chrome 常因连不上 Google 报 <code>network</code>，将自动改用「录音→云端 ASR」（请在语音设置填 ASR，或复用大模型 Key）。</p></header><div class=\"qd-notes-voice-row\"><button type=\"button\" id=\"qd-note-mic\" class=\"primary\">开始听写</button> <button type=\"button\" id=\"qd-note-clear-tx\">清空转写</button> <label class=\"qd-dictation-lang-wrap\">语言 <select id=\"qd-note-lang\" class=\"qd-dictation-lang\"></select></label> <span id=\"qd-note-voice-status\" class=\"qd-muted\"></span></div><div id=\"qd-note-vu\" class=\"qd-vu\" aria-live=\"polite\"><div class=\"qd-vu-track\"><div class=\"qd-vu-fill\" id=\"qd-note-vu-fill\"></div></div><span class=\"qd-vu-label\" id=\"qd-note-vu-label\">音量（听写时显示）</span></div><div id=\"qd-note-transcript\" class=\"qd-note-transcript\" contenteditable=\"true\" role=\"textbox\" aria-label=\"转写文本\"></div><p id=\"qd-note-interim\" class=\"qd-note-interim qd-muted\" aria-live=\"polite\"></p></section><section class=\"qd-note-col qd-note-write-col\" aria-label=\"自己写\"><header><h2>自己写</h2><p class=\"qd-muted\">可手写；点「小助手协作」根据左侧转写整理右侧标题/摘要/正文。</p></header><div class=\"qd-notes-voice-row\"><button type=\"button\" id=\"qd-note-assist\" class=\"primary\">小助手协作</button> <label class=\"qd-note-auto\"><input type=\"checkbox\" id=\"qd-note-auto-assist\"/> 停说后自动协作</label> <span id=\"qd-note-assist-status\" class=\"qd-muted\"></span></div><div id=\"qd-note-form-mount\"></div></section></div>"**
**new = > new.组件装配 组件=`壳`**
**new = > new.表单装配 id="manual-note" 表单=note_form**
**new = > new.头装配 表=`记一笔头`**
**new = > new.样式 样式=".qd-note-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem;align-items:stretch;margin:0.75rem 0 1rem}@media(max-width:900px){.qd-note-split{grid-template-columns:1fr}}.qd-note-col{border:1px solid #d5dae0;background:rgba(255,255,255,.72);padding:.85rem .95rem 1rem;min-height:16rem}.qd-note-col h2{margin:0 0 .25rem;font-size:1.05rem}.qd-note-transcript{min-height:12rem;max-height:28rem;overflow:auto;border:1px solid #d5dae0;background:#fff;padding:.65rem .75rem;white-space:pre-wrap}"**

**set_llm = > 网页.表单 表="settings" 动作="更新" id="1"**
**set_llm = > set_llm.字段 字段=`大模型字段`**
**set_llm = > set_llm.规则 规则=`大模型规则`**

**set_voice = > 网页.表单 表="settings" 动作="更新" id="1"**
**set_voice = > set_voice.字段 字段=`语音字段`**
**set_voice = > set_voice.规则 规则=`语音规则`**

**settings_hub = > 网页.页面 标题="设置" 引言="<h1>设置</h1><p>大模型、语音、记忆与 MCP。知识本体是 <code>data/runs/*.mq.md</code>；用户画像在 <code>data/kb/用户画像.mq.md</code>。LLM 同域中继与沉淀 API 由 Marqdo <code>代理</code>/<code>调用</code> 提供。</p><ul class=\"qd-settings-links\"><li><a href=\"/settings/llm\">大模型设置</a></li><li><a href=\"/settings/voice\">语音设置</a></li><li><a href=\"/settings/memory\">记忆 · 画像与整理</a></li><li><a href=\"/settings/mcp\">MCP 接入</a></li></ul>"**
**settings_hub = > settings_hub.组件装配 组件=`壳`**
**settings_hub = > settings_hub.头装配 表=`头资源`**

**settings_llm = > 网页.页面 标题="大模型设置" 引言="<h1>大模型设置</h1><p>OpenAI 兼容 Chat API。保存前会 ping；改 Base URL 后请重启 <code>marqdo run index.mq.md</code> 使同域 <code>/llm</code> 代理生效。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"**
**settings_llm = > settings_llm.组件装配 组件=`壳`**
**settings_llm = > settings_llm.表单装配 id="settings-llm" 表单=set_llm**
**settings_llm = > settings_llm.头装配 表=`设置头`**

**settings_voice = > 网页.页面 标题="语音设置" 引言="<h1>语音设置</h1><p><strong>实时听写</strong>仍优先用浏览器 Web Speech；国内连不上 Google 时会自动切到<strong>云端分段听写</strong>，直连失败再经 <code>proxy.cflmy.top</code> 重试。请配置 ASR（可空，复用大模型 Key/Base URL）。TTS 仅用于「朗读」。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"**
**settings_voice = > settings_voice.组件装配 组件=`壳`**
**settings_voice = > settings_voice.表单装配 id="settings-voice" 表单=set_voice**
**settings_voice = > settings_voice.头装配 表=`设置头`**

**settings_mcp = > 网页.页面 标题="MCP 接入" 引言="<h1>MCP 接入</h1><p>Cursor / Claude Desktop 经 MCP 读写笔记。宿主为 <code>marqdo run 求道-mcp.mq.md</code>。</p><p>工具：<code>qd_list_recent</code>、<code>qd_get_run</code>、<code>qd_search</code>、<code>qd_context</code>、<code>qd_profile</code>、<code>qd_organize</code>、<code>qd_kb_list</code>、<code>qd_kb_get</code>、<code>qd_capture</code>。</p><p><button type=\"button\" id=\"qd-mcp-copy\" class=\"primary\">复制 mcp.json</button> <button type=\"button\" id=\"qd-mcp-health\">检查宿主健康</button></p><p id=\"qd-mcp-status\" class=\"qd-settings-status\"></p><pre id=\"qd-mcp-json\" class=\"qd-mcp-json\"></pre><p class=\"qd-muted\"><code>marqdo catalog data/kb</code> · <code>marqdo view data/runs</code></p>"**
**settings_mcp = > settings_mcp.组件装配 组件=`壳`**
**settings_mcp = > settings_mcp.头装配 表=`接入头`**

**settings_memory = > 网页.页面 标题="记忆" 引言="<h1>记忆 · 画像与变更审查</h1><p>权威文件：<code>data/kb/用户画像.mq.md</code>；整理后的知识在 <code>data/kb/concepts</code>（OKF）；审计 runs 在 <code>data/runs</code>。知识库使用独立 git（<code>data/.git</code>）。清理/改写须经<strong>变更提案</strong>审查后应用。「智能整理」合并主题到 concepts，<strong>不改写</strong>历史 runs。</p><p id=\"qd-memory-status\" class=\"qd-settings-status\"></p><p><button type=\"button\" id=\"qd-profile-refresh\" class=\"primary\">刷新画像</button> <button type=\"button\" id=\"qd-profile-reset\">提案：重置画像模板</button> <input id=\"qd-organize-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:14rem\"/> <button type=\"button\" id=\"qd-organize\">智能整理（OKF）</button></p><h2>待审变更</h2><div id=\"qd-changes-list\" class=\"qd-changes-list\"></div><pre id=\"qd-change-diff\" class=\"qd-change-diff\" hidden></pre><p class=\"qd-changes-actions\"><button type=\"button\" id=\"qd-change-apply\" class=\"primary\" disabled>应用选中</button> <button type=\"button\" id=\"qd-change-reject\" disabled>拒绝选中</button> <button type=\"button\" id=\"qd-changes-refresh\">刷新提案</button></p><h2>Git 历史</h2><div id=\"qd-git-log\" class=\"qd-git-log\"></div><p><button type=\"button\" id=\"qd-git-refresh\">刷新提交</button> <button type=\"button\" id=\"qd-git-revert\" disabled>回滚选中提交</button></p><h2>当前画像</h2><pre id=\"qd-profile-body\" class=\"qd-profile-body\"></pre>"**
**settings_memory = > settings_memory.组件装配 组件=`壳`**
**settings_memory = > settings_memory.头装配 表=`记忆头`**

**cfg_rows = > store.select table="settings" limit=1**
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

`代理表` =

| 路径 | 上游 | 流式 | 去前缀 | 方法 | 环境头 | 超时 |
|------|------|------|--------|------|--------|------|
| /llm/chat/completions | `llm_base` | 真 | /llm | POST | | 120000 |
| /llm/models | `llm_base` | 真 | /llm | GET | | 60000 |
| /asr/audio/transcriptions | `asr_base` | 真 | /asr | POST | | 120000 |
| /asr/models | `asr_base` | 真 | /asr | GET | | 60000 |
| /tts/audio/speech | `tts_base` | 真 | /tts | POST | | 120000 |
| /tts/models | `tts_base` | 真 | /tts | GET | | 60000 |

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

**app = > 网页.应用 页面=page 数据库=store 后台=True 后台前缀="/account" 主机=`host` 端口=`port` 登录回跳="/" 登出回跳="/account/login"**
**app = > app.路由 路径="/notes" 页面=notes**
**app = > app.路由 路径="/notes/runs" 页面=notes_runs**
**app = > app.路由 路径="/notes/new" 页面=new**
**app = > app.路由 路径="/run/{slug}" 页面=detail**
**app = > app.路由 路径="/settings" 页面=settings_hub**
**app = > app.路由 路径="/settings/llm" 页面=settings_llm**
**app = > app.路由 路径="/settings/voice" 页面=settings_voice**
**app = > app.路由 路径="/settings/memory" 页面=settings_memory**
**app = > app.路由 路径="/settings/mcp" 页面=settings_mcp**
**app = > app.静态 目录="public" 挂载="/static"**
**app = > app.装配 接口=`接口` 访问日志=True 代理=`代理表` 调用=`调用表`**
**app = > app.鉴权 用户表=`用户` 会话时长=86400 登录回跳="/" 登出回跳="/account/login"**
**app = > app.门禁 路径="/" 角色="user,admin" 匹配="exact" 拒绝="redirect"**
**app = > app.门禁 路径="/notes" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/run" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/settings" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/_form" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/api" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/llm" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/asr" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
**app = > app.门禁 路径="/tts" 角色="user,admin" 匹配="prefix" 拒绝="redirect"**
> `app`.监听

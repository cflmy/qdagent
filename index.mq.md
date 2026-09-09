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
| asr_api_key | ASR API Key | text | false | |
| asr_base_url | ASR Base URL | text | false | https://api.openai.com/v1 |
| asr_model | ASR Model | text | false | whisper-1 |
| tts_api_key | TTS API Key | text | false | |
| tts_base_url | TTS Base URL | text | false | https://api.openai.com/v1 |
| tts_model | TTS Model | text | false | tts-1 |

`语音规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| asr_base_url | max:500 | ASR Base URL 太长 |
| tts_base_url | max:500 | TTS Base URL 太长 |

`头资源` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" | | 14 |

`聊天头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" | | 14 |
| script | "/static/qd-api.js" | | true | 14 |
| script | "/static/chat.js" | | true | 14 |

`设置头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" | | 14 |
| script | "/static/qd-api.js" | | true | 14 |
| script | "/static/settings.js" | | true | 14 |

`接入头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" | | 14 |
| script | "/static/qd-api.js" | | true | 14 |
| script | "/static/mcp.js" | | true | 14 |

`记忆头` =

| 关系 | 地址 | 类型 | 推迟 | 版本 |
|------|------|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" | | 14 |
| script | "/static/qd-api.js" | | true | 14 |
| script | "/static/memory.js" | | true | 14 |

`用户` =

| 用户名 | 密码 | 角色 |
|--------|------|------|
| demo | demo | user |

`接口` =

| 路径 | 方法 | 表 | 排序 | 上限 |
|------|------|-----|------|------|
| /api/settings | GET | settings | | 1 |

*host = > sys.env_get name="QDAGENT_HOST"*
1. not `host`
  *host = "0.0.0.0"*
*port_s = > sys.env_get name="QDAGENT_PORT"*
1. not `port_s`
  *port_s = "7431"*
*port = > int value=`port_s`*

*store = > db.open*

*chat_intro = "<div class=\"qd-workspace\"><aside class=\"qd-sessions\" aria-label=\"会话\"><div class=\"qd-sessions-head\"><strong>会话</strong><button type=\"button\" id=\"qd-new-session\" class=\"primary\">新会话</button></div><ul id=\"qd-session-list\" class=\"qd-session-list\"></ul></aside><div class=\"qd-chat\"><header class=\"qd-head\"><h1 id=\"qd-session-title\">求道</h1><p>流式对话 · 自动沉淀为可审计 .mq.md</p></header><div class=\"qd-toolbar\"><span id=\"qd-status\">加载设置…</span><label class=\"qd-web-toggle\" title=\"勾选后本轮先 DuckDuckGo 检索再回答\"><input type=\"checkbox\" id=\"qd-web\">联网</label><button type=\"button\" id=\"qd-mic\">语音输入</button><button type=\"button\" id=\"qd-speak\">朗读回复</button><button type=\"button\" id=\"qd-save\">再存一份</button><button type=\"button\" id=\"qd-stop\" class=\"danger\" hidden>停止</button></div><div id=\"qd-log\" aria-live=\"polite\"></div><div class=\"qd-sendrow\"><textarea id=\"qd-input\" rows=\"3\" placeholder=\"输入消息，Enter 发送；Shift+Enter 换行\"></textarea><button type=\"button\" id=\"qd-send\" class=\"primary\">发送</button></div></div></div>"*

*page = > 网页.页面 标题="求道 · 对话" 引言=`chat_intro`*
*page = > page.布局 布局="sidebar"*
*page = > page.组件装配 组件=`壳`*
*page = > page.头装配 表=`聊天头`*
*page = > page.样式 样式="main.main>.site-form{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important;white-space:nowrap!important}.side-label{display:none!important}main.main{display:flex;flex-direction:column;min-height:0}main.main>.main-intro{flex:1;display:flex;flex-direction:column;min-height:0;padding:0;height:100%}"*

*note_form = > 网页.表单 表="runs" 动作="插入"*
*note_form = > note_form.字段 字段=`笔记字段`*
*note_form = > note_form.规则 规则=`笔记规则`*
*page = > page.表单装配 id="note" 表单=note_form*

*notes = > 网页.页面 标题="笔记库" 引言="<h1>笔记库</h1><p>对话回合结束后会<strong>自动沉淀</strong>到这里；回答前会检索本库与 <code>data/kb/用户画像.mq.md</code>。手动整理生成 <code>data/kb/整理-*.mq.md</code>，<strong>不改写</strong>历史 runs。也可<a href=\"/notes/new\">记一笔</a>或打开<a href=\"/settings/memory\">记忆</a>。</p>"*
*notes = > notes.组件装配 组件=`壳`*
*notes = > notes.主体装配 主体=`列表`*
*notes = > notes.排序 排序="-created_at"*
*notes = > notes.链接前缀 前缀="/run/"*
*notes = > notes.头装配 表=`头资源`*

*detail = > 网页.页面 标题="笔记"*
*detail = > detail.组件装配 组件=`壳`*
*detail = > detail.主体装配 主体=`详情`*
*detail = > detail.查询条件 条件=`笔记条件`*
*detail = > detail.详情 详情=True*
*detail = > detail.头装配 表=`头资源`*

*new = > 网页.页面 标题="记一笔" 引言="<h1>记一笔</h1><p>直接写入笔记库。对话默认已自动沉淀，此处用于补充手记。</p>"*
*new = > new.组件装配 组件=`壳`*
*new = > new.表单装配 id="manual-note" 表单=note_form*
*new = > new.头装配 表=`头资源`*

*set_llm = > 网页.表单 表="settings" 动作="更新" id="1"*
*set_llm = > set_llm.字段 字段=`大模型字段`*
*set_llm = > set_llm.规则 规则=`大模型规则`*

*set_voice = > 网页.表单 表="settings" 动作="更新" id="1"*
*set_voice = > set_voice.字段 字段=`语音字段`*
*set_voice = > set_voice.规则 规则=`语音规则`*

*settings_hub = > 网页.页面 标题="设置" 引言="<h1>设置</h1><p>大模型、语音、记忆与 MCP。知识本体是 <code>data/runs/*.mq.md</code>；用户画像在 <code>data/kb/用户画像.mq.md</code>。LLM 同域中继与沉淀 API 由 Marqdo <code>代理</code>/<code>调用</code> 提供。</p><ul class=\"qd-settings-links\"><li><a href=\"/settings/llm\">大模型设置</a></li><li><a href=\"/settings/voice\">语音设置</a></li><li><a href=\"/settings/memory\">记忆 · 画像与整理</a></li><li><a href=\"/settings/mcp\">MCP 接入</a></li></ul>"*
*settings_hub = > settings_hub.组件装配 组件=`壳`*
*settings_hub = > settings_hub.头装配 表=`头资源`*

*settings_llm = > 网页.页面 标题="大模型设置" 引言="<h1>大模型设置</h1><p>OpenAI 兼容 Chat API。保存前会 ping；改 Base URL 后请重启 <code>marqdo run index.mq.md</code> 使同域 <code>/llm</code> 代理生效。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"*
*settings_llm = > settings_llm.组件装配 组件=`壳`*
*settings_llm = > settings_llm.表单装配 id="settings-llm" 表单=set_llm*
*settings_llm = > settings_llm.头装配 表=`设置头`*

*settings_voice = > 网页.页面 标题="语音设置" 引言="<h1>语音设置</h1><p>ASR / TTS 独立配置；同域 <code>/asr</code>、<code>/tts</code> 代理（改 URL 后需重启）。</p><p id=\"qd-settings-status\" class=\"qd-settings-status\"></p>"*
*settings_voice = > settings_voice.组件装配 组件=`壳`*
*settings_voice = > settings_voice.表单装配 id="settings-voice" 表单=set_voice*
*settings_voice = > settings_voice.头装配 表=`设置头`*

*settings_mcp = > 网页.页面 标题="MCP 接入" 引言="<h1>MCP 接入</h1><p>Cursor / Claude Desktop 经 MCP 读写笔记。宿主为 <code>marqdo run 求道-mcp.mq.md</code>。</p><p>工具：<code>qd_list_recent</code>、<code>qd_get_run</code>、<code>qd_search</code>、<code>qd_context</code>、<code>qd_profile</code>、<code>qd_organize</code>、<code>qd_capture</code>。</p><p><button type=\"button\" id=\"qd-mcp-copy\" class=\"primary\">复制 mcp.json</button> <button type=\"button\" id=\"qd-mcp-health\">检查宿主健康</button></p><p id=\"qd-mcp-status\" class=\"qd-settings-status\"></p><pre id=\"qd-mcp-json\" class=\"qd-mcp-json\"></pre><p class=\"qd-muted\"><code>marqdo catalog data/runs</code> · <code>marqdo view data/runs</code></p>"*
*settings_mcp = > settings_mcp.组件装配 组件=`壳`*
*settings_mcp = > settings_mcp.头装配 表=`接入头`*

*settings_memory = > 网页.页面 标题="记忆" 引言="<h1>记忆 · 画像与整理</h1><p>用户画像权威文件：<code>data/kb/用户画像.mq.md</code>（维度：身份、目标、沟通、习惯、工具、近期焦点、禁忌、变更日志）。对话会在回答前检索笔记，并在沉淀后<strong>短句</strong>追加焦点。整理为手动操作，写出可读 Markdown 索引（GFM 表格），不改写历史 runs。</p><p id=\"qd-memory-status\" class=\"qd-settings-status\"></p><p><button type=\"button\" id=\"qd-profile-refresh\" class=\"primary\">刷新画像</button> <button type=\"button\" id=\"qd-profile-reset\">重置画像模板</button> <input id=\"qd-organize-query\" type=\"text\" placeholder=\"整理关键词，默认求道\" style=\"max-width:14rem\"/> <button type=\"button\" id=\"qd-organize\">整理笔记库</button></p><pre id=\"qd-profile-body\" class=\"qd-profile-body\"></pre>"*
*settings_memory = > settings_memory.组件装配 组件=`壳`*
*settings_memory = > settings_memory.头装配 表=`记忆头`*

*cfg_rows = > store.select table="settings" limit=1*
*cfg = cfg_rows[^1]*
*llm_base = cfg[^llm_base_url]*
1. not `llm_base`
  *llm_base = "https://api.openai.com/v1"*
*asr_base = cfg[^asr_base_url]*
1. not `asr_base`
  *asr_base = `llm_base`*
*tts_base = cfg[^tts_base_url]*
1. not `tts_base`
  *tts_base = `llm_base`*

`代理表` =

| 路径 | 上游 | 流式 | 去前缀 | 方法 | 环境头 | 超时 |
|------|------|------|--------|------|--------|------|
| /llm/chat/completions | `llm_base` | 真 | /llm | POST | | 120000 |
| /llm/models | `llm_base` | 真 | /llm | GET | | 60000 |
| /asr/models | `asr_base` | 真 | /asr | GET | | 60000 |
| /asr/audio/transcriptions | `asr_base` | 真 | /asr | POST | | 120000 |
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
| /api/store/web_search | POST | api.web_search | json | json |

*app = > 网页.应用 页面=page 数据库=store 后台=True 后台前缀="/account" 主机=`host` 端口=`port` 登录回跳="/" 登出回跳="/account/login"*
*app = > app.路由 路径="/notes" 页面=notes*
*app = > app.路由 路径="/notes/new" 页面=new*
*app = > app.路由 路径="/run/{slug}" 页面=detail*
*app = > app.路由 路径="/settings" 页面=settings_hub*
*app = > app.路由 路径="/settings/llm" 页面=settings_llm*
*app = > app.路由 路径="/settings/voice" 页面=settings_voice*
*app = > app.路由 路径="/settings/memory" 页面=settings_memory*
*app = > app.路由 路径="/settings/mcp" 页面=settings_mcp*
*app = > app.静态 目录="public" 挂载="/static"*
*app = > app.装配 接口=`接口` 访问日志=True 代理=`代理表` 调用=`调用表`*
*app = > app.鉴权 用户表=`用户` 会话时长=86400 登录回跳="/" 登出回跳="/account/login"*
*app = > app.门禁 路径="/" 角色="user,admin" 匹配="exact" 拒绝="redirect"*
*app = > app.门禁 路径="/notes" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/run" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/settings" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/_form" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/api" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/llm" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/asr" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/tts" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
> `app`.监听

---
title: 求道
description: 登录后对话；笔记库与模型 API 设置。无前后台之分。
导入 网页:ext/web/网页.mq.md
import shell:styles/shell.mq.md
import nav:components/nav.mq.md
import side:components/side.mq.md
import foot:components/foot.mq.md
import db:db/index.mq.md
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

`设置字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| llm_api_key | 大模型 API Key | password | false | |
| llm_base_url | 大模型 Base URL | text | false | https://api.openai.com/v1 |
| llm_model | 大模型 Model | text | false | gpt-4o-mini |
| asr_api_key | 语音识别 ASR Key | password | false | |
| asr_base_url | ASR Base URL | text | false | https://api.openai.com/v1 |
| asr_model | ASR Model | text | false | whisper-1 |
| tts_api_key | 语音合成 TTS Key | password | false | |
| tts_base_url | TTS Base URL | text | false | https://api.openai.com/v1 |
| tts_model | TTS Model | text | false | tts-1 |

`设置规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| llm_base_url | max:500 | Base URL 太长 |
| llm_model | max:120 | 模型名太长 |

`头资源` =

| 关系 | 地址 | 类型 |
|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" |

`聊天头` =

| 关系 | 地址 | 类型 |
|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" |
| script | "/static/chat.js" | |

`设置头` =

| 关系 | 地址 | 类型 |
|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" |
| script | "/static/settings.js" | |

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

*chat_intro = "<div class=\"qd-chat\"><h1>求道</h1><p>登录后即可对话。结论可沉淀为笔记，供之后检索。</p><div class=\"qd-toolbar\"><span id=\"qd-status\">加载设置…</span><button type=\"button\" id=\"qd-mic\">语音输入</button><button type=\"button\" id=\"qd-speak\">朗读回复</button><button type=\"button\" id=\"qd-save\" class=\"primary\">沉淀为本轮笔记</button></div><div id=\"qd-log\"></div><div class=\"qd-sendrow\"><textarea id=\"qd-input\" placeholder=\"输入消息，Enter 发送；Shift+Enter 换行\"></textarea><button type=\"button\" id=\"qd-send\" class=\"primary\">发送</button></div></div>"*

*page = > 网页.页面 标题="求道 · 对话" 引言=`chat_intro`*
*page = > page.布局 布局="stacked"*
*page = > page.组件装配 组件=`壳`*
*page = > page.头装配 表=`聊天头`*
*page = > page.样式 样式=".site-main .site-form{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}"*

*note_form = > 网页.表单 表="runs" 动作="插入"*
*note_form = > note_form.字段 字段=`笔记字段`*
*note_form = > note_form.规则 规则=`笔记规则`*
*page = > page.表单装配 id="note" 表单=note_form*

*notes = > 网页.页面 标题="笔记库" 引言="<h1>笔记库</h1><p>每次执行与对话沉淀都在这里。正文是 .mq.md。</p>"*
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

*new = > 网页.页面 标题="记一笔" 引言="<h1>记一笔</h1><p>直接写入笔记库；也可用对话里的「沉淀为本轮笔记」。</p>"*
*new = > new.组件装配 组件=`壳`*
*new = > new.表单装配 id="manual-note" 表单=note_form*
*new = > new.头装配 表=`头资源`*

*set_form = > 网页.表单 表="settings" 动作="更新" id="1"*
*set_form = > set_form.字段 字段=`设置字段`*
*set_form = > set_form.规则 规则=`设置规则`*

*settings = > 网页.页面 标题="模型设置" 引言="<h1>模型设置</h1><p>配置大模型与语音（ASR / TTS）的 OpenAI 兼容 API。密钥仅保存在本机数据卷，对话页通过登录后的接口读取。</p>"*
*settings = > settings.组件装配 组件=`壳`*
*settings = > settings.表单装配 id="settings" 表单=set_form*
*settings = > settings.头装配 表=`设置头`*

*app = > 网页.应用 页面=page 数据库=store 后台=True 后台前缀="/account" 主机=`host` 端口=`port` 登录回跳="/" 登出回跳="/account/login"*
*app = > app.路由 路径="/notes" 页面=notes*
*app = > app.路由 路径="/notes/new" 页面=new*
*app = > app.路由 路径="/run/{slug}" 页面=detail*
*app = > app.路由 路径="/settings" 页面=settings*
*app = > app.静态 目录="public" 挂载="/static"*
*app = > app.装配 接口=`接口` 访问日志=True*
*app = > app.鉴权 用户表=`用户` 会话时长=86400 登录回跳="/" 登出回跳="/account/login"*
*app = > app.门禁 路径="/" 角色="user,admin" 匹配="exact" 拒绝="redirect"*
*app = > app.门禁 路径="/notes" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/run" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/settings" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/_form" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
*app = > app.门禁 路径="/api" 角色="user,admin" 匹配="prefix" 拒绝="redirect"*
> `app`.监听

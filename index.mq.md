---
title: 求道笔记库
description: Marqdo 原生笔记 UI — 浏览 / 记录 runs，正文即 .mq.md。
导入 网页:ext/web/网页.mq.md
import shell:styles/shell.mq.md
import nav:components/nav.mq.md
import side:components/side.mq.md
import foot:components/foot.mq.md
import runs:db/runs.mq.md
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

`字段` =

| 字段 | 标签 | 类型 | 必填 | 默认 |
|------|------|------|------|------|
| slug | 标识 | text | true | |
| title | 标题 | text | true | |
| summary | 摘要 | text | false | |
| body | 正文 (.mq.md) | textarea | true | |

`规则` =

| 字段 | 规则 | 消息 |
|------|------|------|
| slug | required | 标识不能为空 |
| title | required | 标题不能为空 |
| body | required | 正文不能为空 |
| slug | max:80 | 标识太长 |
| title | max:200 | 标题太长 |
| body | max:100000 | 正文太长 |

`头资源` =

| 关系 | 地址 | 类型 |
|------|------|------|
| stylesheet | "/static/theme.css" | "text/css" |

*host = > sys.env_get name="QDAGENT_HOST"*
1. not `host`
  *host = "0.0.0.0"*
*port_s = > sys.env_get name="QDAGENT_PORT"*
1. not `port_s`
  *port_s = "7431"*
*port = > int value=`port_s`*

*store = > db.open*

*page = > 网页.页面 标题="求道 · 笔记库" 引言="<h1>求道</h1><p>笔记库即审计仓库。每条笔记的正文是一份 <code>.mq.md</code>。</p>"*
*page = > page.组件装配 组件=`壳`*
*page = > page.主体装配 主体=`列表`*
*page = > page.排序 排序="-created_at"*
*page = > page.链接前缀 前缀="/run/"*
*page = > page.头装配 表=`头资源`*

*note = > 网页.页面 标题="笔记"*
*note = > note.组件装配 组件=`壳`*
*note = > note.主体装配 主体=`详情`*
*note = > note.查询条件 条件=`笔记条件`*
*note = > note.详情 详情=True*
*note = > note.头装配 表=`头资源`*

*form = > 网页.表单 表="runs" 动作="插入"*
*form = > form.字段 字段=`字段`*
*form = > form.规则 规则=`规则`*

*new = > 网页.页面 标题="记一笔" 引言="<h1>记一笔</h1><p>直接写入笔记库。提交后请跑 ./scripts/mq.sh run 求道-同步.mq.md 把正文同步成 data/runs 下的 .mq.md；或用 求道-捕捉 / 求道-询问 一次完成写盘+入库。</p>"*
*new = > new.组件装配 组件=`壳`*
*new = > new.表单装配 id="note" 表单=form*
*new = > new.头装配 表=`头资源`*

*about = > 网页.页面 标题="关于" 引言="<h1>关于求道</h1><p>基于 <strong>Marqdo</strong> 的文档驱动智能体：笔记式界面、每次执行沉淀 .mq.md、Docker 默认部署。本演示没有 Python，入口就是本文件。</p><ul><li>./scripts/mq.sh run — 启动本站</li><li>./scripts/mq.sh run 求道-询问.mq.md — 询问并沉淀</li><li>./scripts/mq.sh view data/runs — 原生浏览 runs</li></ul>"*
*about = > about.组件装配 组件=`壳`*
*about = > about.头装配 表=`头资源`*

*doc = > 网页.页面 标题="文档" 引言="<h1>设计文档</h1><p>仓库内 <code>doc/</code> 目录。差异化：笔记 UI + OpenAI 兼容 API + MCP 双轨 + Docker。</p><p>索引：<a href=\"https://github.com/cflmy/qdagent/tree/master/doc\">doc/README.md</a></p>"*
*doc = > doc.组件装配 组件=`壳`*
*doc = > doc.头装配 表=`头资源`*

*app = > 网页.应用 页面=page 数据库=store 后台=True 主机=`host` 端口=`port`*
*app = > app.路由 路径="/run/{slug}" 页面=note*
*app = > app.路由 路径="/new" 页面=new*
*app = > app.路由 路径="/about" 页面=about*
*app = > app.路由 路径="/doc" 页面=doc*
*app = > app.静态 目录="public" 挂载="/static"*
> `app`.监听

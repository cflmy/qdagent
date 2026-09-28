---
title: pages/build
description: >-
  Build Document page bags for qdagent (ADR 0007). Markdown bodies live in
  pages/content.mq.md; chrome/forms attach via lib/site — no compose_*.
import site:../lib/site.mq.md
import ui:../lib/ui.mq.md
import content:content.mq.md
import form:ext/data/form.mq.md
---

## 壳
    + `page`
    + `头`=None

**nav = > ui.nav**
**side = > ui.side**
**foot = > ui.foot**
**p = > site.chrome page=`page` nav=`nav` side=`side` foot=`foot`**
1. `头`
  **p = > site.head page=`p` table=`头`**
*`p`*

## 笔记表单

**f = > form.form table="runs" action="insert" id=None**
**fields = > ui.笔记字段**
**f = > f.fields fields=`fields`**
**rules = > ui.笔记规则**
*> `f`.rules rules=`rules`*

## 大模型表单

**f = > form.form table="settings" action="update" id="1"**
**fields = > ui.大模型字段**
**f = > f.fields fields=`fields`**
**rules = > ui.大模型规则**
*> `f`.rules rules=`rules`*

## 语音表单

**f = > form.form table="settings" action="update" id="1"**
**fields = > ui.语音字段**
**f = > f.fields fields=`fields`**
**rules = > ui.语音规则**
*> `f`.rules rules=`rules`*

## 对话

**intro = > ui.聊天引言**
**page = > site.page title="求道 · 对话" intro=`intro`**
**头 = > ui.聊天头**
**page = > 壳 page=`page` 头=`头`**
**css = > ui.聊天样式**
**page = > site.css page=`page` css=`css`**
**note = > 笔记表单**
*> site.attach_form page=`page` id="note" form=`note`*

## 笔记库

**md = > content.笔记库**
**page = > site.page_md title="笔记库" markdown=`md`**
**头 = > ui.笔记库头**
*> 壳 page=`page` 头=`头`*

## 原始沉淀

**md = > content.原始沉淀**
**page = > site.page_md title="原始沉淀" markdown=`md`**
**page = > site.data_source page=`page` source="runs"**
**page = > site.order page=`page` order="-created_at"**
**page = > site.link_prefix page=`page` prefix="/run/"**
**头 = > ui.头资源**
*> 壳 page=`page` 头=`头`*

## 笔记详情

**page = > site.page title="笔记" intro=""**
**page = > site.data_source page=`page` source="runs"**
**条件 = > ui.笔记条件**
**page = > site.query page=`page` query=`条件`**
**page = > site.detail page=`page` detail=True**
**头 = > ui.头资源**
*> 壳 page=`page` 头=`头`*

## 记一笔

**intro = > ui.记一笔引言**
**page = > site.page title="记一笔" intro=`intro`**
**头 = > ui.记一笔头**
**page = > 壳 page=`page` 头=`头`**
**css = > ui.记一笔样式**
**page = > site.css page=`page` css=`css`**
**note = > 笔记表单**
*> site.attach_form page=`page` id="manual-note" form=`note`*

## 设置枢纽

**md = > content.设置枢纽**
**page = > site.page_md title="设置" markdown=`md`**
**头 = > ui.头资源**
*> 壳 page=`page` 头=`头`*

## 大模型设置

**md = > content.大模型设置**
**page = > site.page_md title="大模型设置" markdown=`md`**
**头 = > ui.设置头**
**page = > 壳 page=`page` 头=`头`**
**frm = > 大模型表单**
*> site.attach_form page=`page` id="settings-llm" form=`frm`*

## 语音设置

**md = > content.语音设置**
**page = > site.page_md title="语音设置" markdown=`md`**
**头 = > ui.设置头**
**page = > 壳 page=`page` 头=`头`**
**frm = > 语音表单**
*> site.attach_form page=`page` id="settings-voice" form=`frm`*

## MCP设置

**md = > content.mcp**
**page = > site.page_md title="MCP 接入" markdown=`md`**
**头 = > ui.接入头**
*> 壳 page=`page` 头=`头`*

## OpenAI设置

**md = > content.openai**
**page = > site.page_md title="OpenAI 网关" markdown=`md`**
**头 = > ui.头资源**
*> 壳 page=`page` 头=`头`*

## 记忆设置

**md = > content.记忆**
**page = > site.page_md title="记忆" markdown=`md`**
**头 = > ui.记忆头**
*> 壳 page=`page` 头=`头`*

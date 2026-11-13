---
markup: occlusion
title: 顶栏面板
description: 插件库、知识库、工作区三个面板；由标签打开，默认隐藏。
import:
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  kb: ../kb.mq.md
---

三个面板对应顶栏三个标签。默认 aria-hidden，客户端加上 is-open 才显示。面板盖在阅读面
之上但不取代 view 语义；关闭后阅读面原样可见。清单均来自装配期真实发现。

## nodes

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 三个面板节点，顺序为插件库、知识库、工作区 |

每个面板一张卡片：标题、说明与清单。关闭按钮 id 带面板后缀，与客户端 wire 对应。

`p1` =

| id | aria-hidden | role |
|---|---|---|
| panel-plugins | true | dialog |

`p2` =

| id | aria-hidden | role |
|---|---|---|
| panel-kb | true | dialog |

`p3` =

| id | aria-hidden | role |
|---|---|---|
| panel-workspace | true | dialog |

`c1` =

| id | type |
|---|---|
| panel-plugins-close | button |

`c2` =

| id | type |
|---|---|
| panel-kb-close | button |

`c3` =

| id | type |
|---|---|
| panel-workspace-close | button |

We **plugin_names = [真实插件清单](kb.plugins())** and **plugin_items = [插件条目从空开始](table.empty_list())**.
- [逐项生成插件条目](for plugin_names as name)
  We **plugin_items = [追加插件条目](table.append(list=`plugin_items`, item="- " + `name` + " · 已注册拓展 · ext/" + `name`))**.
We **plugin_text = [拼接插件清单](text.str_join(xs=`plugin_items`, sep="\n"))**.
We **root_names = [真实知识根](kb.roots())** and **kb_items = [知识条目从空开始](table.empty_list())**.
- [逐项生成知识条目](for root_names as root)
  We **kb_items = [追加知识条目](table.append(list=`kb_items`, item="- " + `root` + " · 真实知识根 · kb/" + `root`))**.
We **kb_text = [拼接知识清单](text.str_join(xs=`kb_items`, sep="\n"))**.

We **ph = [插件标题](component.markdown(text="## 插件库", slot="plugins-title"))** and **pt = [插件说明](component.markdown(text="ext/ 下已注册拓展，装配期真实发现。", slot="plugins-tip", style="mq-note"))** and **pb = [插件清单](component.markdown(text=`plugin_text`, slot="plugins-list"))** and **pc = [关闭插件库](component.element(kind="button", value="关闭", attrs=`c1`, slot="plugins-close", style="mq-btn"))**.
We **pbody = [插件头](table.concat(a=table.concat(a=`ph`, b=`pc`), b=table.concat(a=`pt`, b=`pb`)))**.
We **plugins = [插件库面板](component.wrap(children=`pbody`, kind="aside", slot="panel-plugins", style="mq-panel", attrs=`p1`))**.

We **kh = [知识标题](component.markdown(text="## 知识库", slot="kb-title"))** and **kt = [知识说明](component.markdown(text="kb/ 下真实知识根，引用即出处。", slot="kb-tip", style="mq-note"))** and **kb_list = [知识清单](component.markdown(text=`kb_text`, slot="kb-list"))** and **kc = [关闭知识库](component.element(kind="button", value="关闭", attrs=`c2`, slot="kb-close", style="mq-btn"))**.
We **kbody = [知识头](table.concat(a=table.concat(a=`kh`, b=`kc`), b=table.concat(a=`kt`, b=`kb_list`)))**.
We **kpanel = [知识库面板](component.wrap(children=`kbody`, kind="aside", slot="panel-kb", style="mq-panel", attrs=`p2`))**.

We **wh = [工作区标题](component.markdown(text="## 工作区", slot="workspace-title"))** and **wt = [工作区说明](component.markdown(text="当前可动用的插件与知识根总览；细节在各自标签面板。", slot="workspace-tip", style="mq-note"))** and **wb = [工作区清单](component.markdown(text=`plugin_text` + "\n\n" + `kb_text`, slot="workspace-list"))** and **wc = [关闭工作区](component.element(kind="button", value="关闭", attrs=`c3`, slot="workspace-close", style="mq-btn"))**.
We **wbody = [工作区头](table.concat(a=table.concat(a=`wh`, b=`wc`), b=table.concat(a=`wt`, b=`wb`)))**.
We **wpanel = [工作区面板](component.wrap(children=`wbody`, kind="aside", slot="panel-workspace", style="mq-panel", attrs=`p3`))**.

We **all = [插件在前](table.concat(a=`plugins`, b=`kpanel`))** and **all = [工作区随后](table.concat(a=`all`, b=`wpanel`))**.
Return *all*.

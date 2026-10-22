---
title: execution/docgate-selftest
description: >-
  文档门禁回归自检 — 固定夹具验证 execution/docgate 的三段式判定
  （提取 / 结构 / 沙箱）与整理页契约。无 API Key 也能跑。
  CLI: marqdo run execution/docgate-selftest.mq.md
import gate:docgate.mq.md
import fmt:../lib/kb_format.mq.md
import json:lib/json.mq.md
import txt:lib/text.mq.md
---

每个断言函数返回布尔；主入口逐个调用并累加，最后打印一行 JSON。
全部通过打印 ok=true；任一失败打印 ok=false 并列出失败项。

## 干净文档

符合契约：frontmatter、叙述节、可执行入口（无副作用打印）。

**qt = "\u{22}"**
**star = "\u{2a}"**
**nl = "\n"**
**head = "---" + `nl` + "title: 自检夹具" + `nl` + "---" + `nl` + `nl` + "# 任务" + `nl` + `nl` + "自检用文档。" + `nl` + `nl` + "# 结论" + `nl` + `nl` + "三的平方是九。" + `nl` + `nl` + "# main" + `nl` + `nl`**
**body = "> print text=九" + `nl` + `star` + "None" + `star` + `nl`**
*`head` + `body`*

## 行首数字文档

叙述行以数字开头，结构检查必须拦下。

**qt = "\u{22}"**
**star = "\u{2a}"**
**nl = "\n"**
**head = "---" + `nl` + "title: 坏文档" + `nl` + "---" + `nl` + `nl` + "# 结论" + `nl` + `nl` + "9 号是数字。" + `nl` + `nl` + "# main" + `nl` + `nl`**
**body = "> print text=hi" + `nl` + `star` + "None" + `star` + `nl`**
*`head` + `body`*

## 语法错文档

结构合法但 marqdo 语法错，沙箱试跑必须拦下。

**qt = "\u{22}"**
**star = "\u{2a}"**
**nl = "\n"**
**head = "---" + `nl` + "title: 语法错" + `nl` + "---" + `nl` + `nl` + "# main" + `nl` + `nl`**
**body = "> nosuchfn x=1" + `nl` + `star` + "None" + `star` + `nl`**
*`head` + `body`*

## 缺入口文档

缺少入口章节，结构检查必须报 missing_main。

**qt = "\u{22}"**
**nl = "\n"**
**head = "---" + `nl` + "title: 缺入口" + `nl` + "---" + `nl` + `nl` + "# 结论" + `nl` + `nl` + "只有叙述。" + `nl`**
*head*

## 安全叙述文档

叙述区含 - 列表、> 引用、| 竖线、[ 数组 —— 实测都是安全叙述，必须通过。

**qt = "\u{22}"**
**pipe = "\u{7c}"**
**nl = "\n"**
**head = "---" + `nl` + "title: 安全叙述" + `nl` + "---" + `nl` + `nl` + "# 结论" + `nl` + `nl` + "这里是解释文字。" + `nl` + `nl` + "- 列表项一" + `nl` + "- 列表项二" + `nl` + `nl` + "> 引用一段" + `nl` + `nl` + `pipe` + " a " + `pipe` + " b " + `pipe` + `nl` + "这不是表格" + `nl` + `nl` + "# main" + `nl` + `nl`**
**body = "> print text=ok" + `nl` + "*None*" + `nl`**
*`head` + `body`*

## 阶段
    + `doc`

门禁对 doc 的判定阶段（空串表示通过）。

**r = > gate.门禁 text=`doc` root="."**
**st = > json.get value=`r` key="stage"**
*st*

## 通过
    + `doc`

doc 是否通过门禁。

**r = > gate.门禁 text=`doc` root="."**
**o = > json.get value=`r` key="ok"**
*o*

## 违规含
    + `doc`
    + `needle`

doc 的 violations 序列化后是否含 needle。

**r = > gate.门禁 text=`doc` root="."**
**vi = > json.get value=`r` key="violations"**
**vs = > json.stringify value=`vi`**
**hit = > txt.contains text=`vs` sub=`needle`**
*hit*

## 整洁
    + `doc`

doc 通过门禁且 stdout 非空。

**r = > gate.门禁 text=`doc` root="."**
**o = > json.get value=`r` key="ok"**
**so = > json.get value=`r` key="stdout"**
**good = `o` and `so`**
*good*

## 整理页

整理页（编号列表已改叙述段并补入口）必须通过门禁。

**empty = > json.parse text=[]**
**page = > fmt.整理文稿 query="selftest" day="2026-10-22" hits=`empty` rows=`empty`**
**r = > gate.门禁 text=`page` root="."**
**o = > json.get value=`r` key="ok"**
*o*

# main

**d1 = > 干净文档**
**d2 = > 行首数字文档**
**d3 = > 语法错文档**
**d4 = > 缺入口文档**
**d5 = > 安全叙述文档**

**c1 = > 整洁 doc=`d1`**
**s2 = > 阶段 doc=`d2`**
**c2 = `s2` == "structure"**
**s3 = > 阶段 doc=`d3`**
**c3 = `s3` == "sandbox"**
**c4 = > 违规含 doc=`d4` needle="missing_main"**
**c4b = > 通过 doc=`d5`**
**c5 = > 整理页**

**ok_n = 0**
**fail_n = 0**
**fails = > json.parse text=[]**
**names = > json.parse text=[]**

1. `c1`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="clean_doc"**

1. `c2`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="digit_stage"**

1. `c3`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="syntax_stage"**

1. `c4`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="missing_main_rule"**

1. `c4b`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="safe_prose"**

1. `c5`
  **ok_n = `ok_n` + 1**
2. *
  **fail_n = `fail_n` + 1**
  **fails = > json.append list=`fails` item="organize_page"**

**passed = `fail_n` == 0**
**fs = > json.stringify value=`fails`**
**total = `ok_n` + `fail_n`**
`ret` =

| ok | passed | cases | ok_count | fail_count | failures |
|----|--------|-------|----------|------------|----------|
| `passed` | `passed` | `total` | `ok_n` | `fail_n` | `fs` |

**out = > json.stringify value=`ret`**
> print text=`out`
*""*

---
title: lib/kb_format
description: 把检索命中与笔记行格式化为可读 Markdown（禁止 JSON dump）。
import json:lib/json.mq.md
---

## 单行摘要
    + `text`=""

*s = `text`*
1. not `s`
  **"（空）"**
*parts = > split value=`s` sep="\n"*
*n = > len value=`parts`*
*pick = ""*
1. `n` >= 1
  *a = parts[^1]*
  1. `a`
    1. `a` != "---"
      *pick = `a`*
1. not `pick`
  1. `n` >= 2
    *b = parts[^2]*
    1. `b`
      1. `b` != "---"
        *pick = `b`*
1. not `pick`
  1. `n` >= 3
    *c = parts[^3]*
    1. `c`
      1. `c` != "---"
        *pick = `c`*
1. not `pick`
  1. `n` >= 4
    *d = parts[^4]*
    1. `d`
      1. `d` != "---"
        *pick = `d`*
1. not `pick`
  *pick = `s`*
**`pick`**

## 证据条目
    + `hit`=None

1. not `hit`
  **""**
*path = hit[^path]*
1. not `path`
  *path = hit[^slug]*
1. not `path`
  *path = "（未知路径）"*
*score = hit[^score]*
*score_s = > json.stringify value=`score`*
1. not `score_s`
  *score_s = "-"*
1. `score_s` == "null"
  *score_s = "-"*
*ex = hit[^excerpt]*
*ex1 = > 单行摘要 text=`ex`*
**"| " + `path` + " | " + `score_s` + " | " + `ex1` + " |"**

## 笔记条目
    + `row`=None

1. not `row`
  **""**
*title = row[^title]*
1. not `title`
  *title = "（无标题）"*
*slug = row[^slug]*
1. not `slug`
  *slug = "-"*
*sum = row[^summary]*
*sum1 = > 单行摘要 text=`sum`*
**"| " + `title` + " | " + `slug` + " | " + `sum1` + " |"**

## 证据表
    + `hits`=None

*head = "| 路径 | 相关度 | 摘要 |\n|------|--------|------|\n"*
1. not `hits`
  **`head` + "| （无命中） | - | - |\n"**
*n = > len value=`hits`*
1. `n` < 1
  **`head` + "| （无命中） | - | - |\n"**
*body = `head`*
*l = > 证据条目 hit=hits[^1]*
*body = `body` + `l` + "\n"*
1. `n` >= 2
  *l = > 证据条目 hit=hits[^2]*
  *body = `body` + `l` + "\n"*
1. `n` >= 3
  *l = > 证据条目 hit=hits[^3]*
  *body = `body` + `l` + "\n"*
1. `n` >= 4
  *l = > 证据条目 hit=hits[^4]*
  *body = `body` + `l` + "\n"*
1. `n` >= 5
  *l = > 证据条目 hit=hits[^5]*
  *body = `body` + `l` + "\n"*
1. `n` >= 6
  *l = > 证据条目 hit=hits[^6]*
  *body = `body` + `l` + "\n"*
1. `n` >= 7
  *l = > 证据条目 hit=hits[^7]*
  *body = `body` + `l` + "\n"*
1. `n` >= 8
  *l = > 证据条目 hit=hits[^8]*
  *body = `body` + `l` + "\n"*
**`body`**

## 笔记表
    + `rows`=None

*head = "| 标题 | 标识 | 摘要 |\n|------|------|------|\n"*
1. not `rows`
  **`head` + "| （无笔记） | - | - |\n"**
*n = > len value=`rows`*
1. `n` < 1
  **`head` + "| （无笔记） | - | - |\n"**
*body = `head`*
*l = > 笔记条目 row=rows[^1]*
*body = `body` + `l` + "\n"*
1. `n` >= 2
  *l = > 笔记条目 row=rows[^2]*
  *body = `body` + `l` + "\n"*
1. `n` >= 3
  *l = > 笔记条目 row=rows[^3]*
  *body = `body` + `l` + "\n"*
1. `n` >= 4
  *l = > 笔记条目 row=rows[^4]*
  *body = `body` + `l` + "\n"*
1. `n` >= 5
  *l = > 笔记条目 row=rows[^5]*
  *body = `body` + `l` + "\n"*
1. `n` >= 6
  *l = > 笔记条目 row=rows[^6]*
  *body = `body` + `l` + "\n"*
1. `n` >= 7
  *l = > 笔记条目 row=rows[^7]*
  *body = `body` + `l` + "\n"*
1. `n` >= 8
  *l = > 笔记条目 row=rows[^8]*
  *body = `body` + `l` + "\n"*
**`body`**

## 整理文稿
    + `query`=""
    + `day`=""
    + `hits`=None
    + `rows`=None

*ev = > 证据表 hits=`hits`*
*notes = > 笔记表 rows=`rows`*
**"---\ntitle: 笔记整理 · " + `query` + "\ndescription: PARA 风格主题索引（不改写历史 runs）\nupdated: " + `day` + "\nquery: " + `query` + "\n---\n\n# 说明\n\n本页是可读索引，不是原始 JSON。历史 data/runs 保持不变；可将稳定结论晋升到 skills 或用户画像。\n\n组织参考：PARA（项目 / 领域 / 资源 / 归档）+ 原子笔记摘要。\n\n# 检索主题\n\n关键词：" + `query` + "\n\n# 相关证据\n\n" + `ev` + "\n\n# 近期笔记\n\n" + `notes` + "\n\n# 建议动作\n\n1. 把重复主题合并为一条 Resource 笔记（写进 data/kb）\n2. 把稳定偏好写回 data/kb/用户画像.mq.md 对应维度\n3. 过时或干跑笔记在笔记库中归档，勿继续当作权威\n4. 需要执行的事项记入 Projects；长期职责记入 Areas\n"**

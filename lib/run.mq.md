---
markup: occlusion
title: lib/run
description: 求道运行沉淀 — 把一次捕捉写成 data/runs/*.mq.md，并可同步到笔记库。
import:
  fs: lib/fs.mq.md
  time: lib/time.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  data: ext/data/db.mq.md
---

## 数据根

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
2. *
  *"data"*

## 确保目录

**root = > 数据根**
> fs.make_dir path=`root`
> fs.make_dir path=`root` + "/runs"
> fs.make_dir path=`root` + "/kb"
> fs.make_dir path=`root` + "/kb/changes"
> fs.make_dir path=`root` + "/kb/concepts"
> fs.make_dir path=`root` + "/kb/concepts/notes"
> fs.make_dir path=`root` + "/kb/concepts/areas"
> fs.make_dir path=`root` + "/kb/resources"
> fs.make_dir path=`root` + "/skills"
> fs.make_dir path=`root` + "/sessions"
> fs.make_dir path=`root` + "/tmp"
*root*

## 新标识

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
*"run-" + `s`*

## 装配正文
    + `title`
    + `task`
    + `result`
    + `slug`
    + `surface`=""
    + `session_id`=""

把一次执行写成**契约形态**的 `.mq.md`：叙述节给人读，`# main` 给机器跑。

契约（与 `execution/docgate.mq.md` 一致）：`---` frontmatter → `# 任务`（叙述）
→ `# 结果`（叙述）→ `# main`（无副作用，回声本次 run 标识）→ `# 元数据`。
叙述行以文字开头，执行语句只在 `# main` 内，因此该笔记既能 `marqdo view`
阅读，也能 `marqdo run` 跑通退出码 0。

**qt = "\u{22}"**
**star = "\u{2a}"**
**pipe = "\u{7c}"**
**fm = "---\ntitle: " + `title` + "\ndescription: qdagent run " + `slug`**
1. `surface`
  **fm = `fm` + "\nsurface: " + `surface`**
1. `session_id`
  **fm = `fm` + "\nsession_id: " + `session_id`**
**fm = `fm` + "\n---\n\n# 任务\n\n" + `task` + "\n\n# 结果\n\n" + `result` + "\n"**
**main_s = "\n# main\n\n> print text=" + `qt` + `slug` + `qt` + "\n" + `star` + "None" + `star` + "\n"**
**meta_s = "\n# 元数据\n\n" + `pipe` + " field " + `pipe` + " value " + `pipe` + "\n" + `pipe` + "------" + `pipe` + "-------" + `pipe` + "\n" + `pipe` + " slug " + `pipe` + " " + `slug` + " " + `pipe` + "\n" + `pipe` + " surface " + `pipe` + " " + `surface` + " " + `pipe` + "\n"**
**fm = `fm` + `main_s` + `meta_s`**
*fm*

## 写出
    + `title`
    + `task`
    + `result`=""
    + `slug`=""
    + `surface`=""
    + `session_id`=""

落盘 `data/runs/<slug>.mq.md`，返回相对路径。

**root = > 确保目录**
1. `slug` == ""
  **slug = > 新标识**
**`body` = > 装配正文 title=`title` task=`task` result=`result` slug=`slug` surface=`surface` session_id=`session_id`**
**path = `root` + "/runs/" + `slug` + ".mq.md"**
> fs.write_text path=`path` text=`body`
*path*

## 库行
    + `slug`
    + `title`
    + `summary`
    + `body`

组装插入 `runs` 表的一行（GFM 表）。

`row` =

| slug | title | summary | body |
|------|-------|---------|------|
| `slug` | `title` | `summary` | `body` |

*`row`*

## 沉淀
    + `store`
    + `title`
    + `task`
    + `result`=""
    + `slug`=""
    + `surface`=""
    + `session_id`=""
    + `summary`=""

写盘 + 写入笔记库索引；返回路径。列表摘要优先用短 `summary`，避免把长正文塞进卡片。

1. `slug` == ""
  **slug = > 新标识**
**`path` = > 写出 title=`title` task=`task` result=`result` slug=`slug` surface=`surface` session_id=`session_id`**
**`body` = > fs.read_text path=`path`**
**sum = `summary`**
1. not `sum`
  **sum = `task`**
1. not `sum`
  **sum = `result`**
**parts = > split value=`sum` sep="\n"**
**sum1 = [1](access(parts, "1"))**
1. not `sum1`
  **sum1 = `sum`**
**n = > len value=`sum1`**
1. `n` > 140
  **sum1 = `sum1` + "…"**
**`row` = > 库行 slug=`slug` title=`title` summary=`sum1` body=`body`**
> `store`.insert table=runs rows=`row`
*`path`*

## 同步库
    + `store`

把库里每条 run 的 `body` 写回 `data/runs/<slug>.mq.md`（Web 表单写入后可再跑一次）。

**root = > 确保目录**
**rows = > `store`.select table="runs" limit=500 order="-created_at"**
- [r](遍历 rows 为 r)
  **slug = [slug](access(r, "slug"))**
  **body = [body](access(r, "body"))**
  1. `slug`
    1. `body`
      > fs.write_text path=`root` + "/runs/" + `slug` + ".mq.md" text=`body`
*root*

## 从盘重建
    + `store`

把 `data/runs/*.mq.md` 写回笔记库索引（磁盘 → `runs` 表）。
`同步库` 的反向：库空或丢索引时用。已有同 `slug` 行则更新 title/summary/body。
跳过 `*.answer.mq.md`（workbook 应答，不是笔记卡）。

**root = > 确保目录**
**dir = `root` + "/runs"**
**names = > fs.list_dir path=`dir`**
**n = 0**
- [name](遍历 names 为 name)
  **ok_ext = > text.ends_with text=`name` suffix=".mq.md"**
  **is_ans = > text.ends_with text=`name` suffix=".answer.mq.md"**
  1. `ok_ext`
    1. not `is_ans`
      **slug = > text.replace text=`name` old=".mq.md" new=""**
      **path = `dir` + "/" + `name`**
      **body = > fs.read_text path=`path`**
      **title = `slug`**
      **sum1 = `slug`**
      **parts = > split value=`body` sep="\n"**
      - [line](遍历 parts 为 line)
        **has_t = > text.starts_with text=`line` prefix="title: "**
        1. `has_t`
          1. `title` == `slug`
            **title = > text.replace text=`line` old="title: " new=""**
            **title = > text.replace text=`title` old="\r" new=""**
        **has_d = > text.starts_with text=`line` prefix="description: "**
        1. `has_d`
          1. `sum1` == `slug`
            **sum1 = > text.replace text=`line` old="description: " new=""**
            **sum1 = > text.replace text=`sum1` old="\r" new=""**
      **sn = > len value=`sum1`**
      1. `sn` > 140
        **sum1 = `sum1` + "…"**
      `where` =

      | 字段 | 操作 | 值 |
      |------|------|-----|
      | slug | = | `slug` |

      **exist = > `store`.select table="runs" where=`where` limit=1**
      1. `exist`
        **hit = [1](access(exist, "1"))**
        **hid = [id](access(hit, "id"))**
        `urow` =

        | title | summary | body |
        |-------|---------|------|
        | `title` | `sum1` | `body` |

        > `store`.update table=runs id=`hid` row=`urow`
      2. *
        **`row` = > 库行 slug=`slug` title=`title` summary=`sum1` body=`body`**
        > `store`.insert table=runs rows=`row`
      **n = `n` + 1**
*`n`*

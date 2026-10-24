---
markup: occlusion
title: execution/docgate
description: >-
  Document Gate — 智能体输出与沉淀笔记的 marqdo 文档契约门禁（v0.3 语法）。
  Contract: `---` frontmatter → `# 任务` / `# 结论`（叙述）→ `# main`（执行）→
  `# 验证` / `# 元数据`（叙述）。叙述行禁止行首 数字 / '-' / '>' / '|' / '*' /
  '[' / '#' / '+'（行内代码与围栏块豁免）；执行代码只允许出现在 `# main`。
  Verify: ext/ai/sandbox CoW 试跑（exec/net/plugin 关闭），exit 0 才放行。
  依据：markdown-mapping-v0.3.md · user-site.md（.mq.md 必须 run 退出码 0）。
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  txt: lib/text.mq.md
  sandbox: ext/ai/sandbox.mq.md
---

## 原始禁区表

Documentation echo of the prefix list (unbound table is narration data).

| p |
|---|
| "0" |
| "1" |
| "2" |
| "3" |
| "4" |
| "5" |
| "6" |
| "7" |
| "8" |
| "9" |
| "-" |
| ">" |
| "\|" |
| "**" |
| "*" |
| "[" |
| "#" |
| "+" |

## 叙述禁区

The machine-usable list. A bound single-column table IS a List (v0.3
table geometry) — no copy loop needed.

Measured on 1.5.2: only leading DIGIT and leading `+` are rejected as
statement syntax; `-` / `>` / `|` / `[` in narration are safe (they do
not form a complete statement, so the parser skips them as prose).
Blocking them would reject legitimate prose, so they are NOT listed here.
See marqdo doc/tutorial/15-常见陷阱.md §1.3.

`pres` =

| p |
|---|
| "0" |
| "1" |
| "2" |
| "3" |
| "4" |
| "5" |
| "6" |
| "7" |
| "8" |
| "9" |
| "**" |
| "*" |
| "#" |
| "+" |

*pres*

## 提取
    + `text`

Extract the `.mq.md` document from raw agent output: raw doc starting with
`---`, or the first fenced block containing it.
Returns `{ ok, doc, error }`.

**t = > txt.str_trim s=`text`**
1. not `t`
  `none` =

  | ok | doc | error |
  |----|-----|-------|
  | False | "" | empty_output |

  *none*
**lines = > split value=`t` sep="\n"**
**first = > at value=`lines` index=0**
**fenced = > txt.starts_with text=`first` prefix="\u{60}\u{60}\u{60}"**
1. `fenced`
  **doc = ""**
  **in_fence = False**
  **seen_open = False**
  - [ln](遍历 lines 为 ln)
    1. `in_fence`
      **is_close = > txt.starts_with text=`ln` prefix="\u{60}\u{60}\u{60}"**
      1. `is_close`
        **in_fence = False**
      2. *
        **doc = `doc` + `ln` + "\n"**
    2. not `seen_open`
      **is_open = > txt.starts_with text=`ln` prefix="\u{60}\u{60}\u{60}"**
      1. `is_open`
        **in_fence = True**
        **seen_open = True**
  **doc = > txt.str_trim s=`doc`**
2. *
  **doc = `t`**
**starts_fm = > txt.starts_with text=`doc` prefix="---"**
1. `starts_fm`
  `out` =

  | ok | doc | error |
  |----|-----|-------|
  | True | `doc` | "" |

  *out*
2. *
  `no_fm` =

  | ok | doc | error |
  |----|-----|-------|
  | False | `doc` | missing_frontmatter |

  *no_fm*

## 违规行
    + `row`

Append a `{ line, rule, text }` violation row to `viol` (caller-owned name
is passed via `row` already assembled here for uniform shape).

*`row`*

## 结构检查
    + `doc`

Section-aware narration rules (v0.3). Executable lines are allowed ONLY
inside `# main` (exactly `# main` after trim; until the next `# ` heading).
frontmatter and fenced blocks are exempt; whole-line `---` / `***` are
narration separators. Requires: frontmatter, `# main`, at least one
executable line in `# main`.
Returns `{ ok, violations }`; rows carry line / rule / text.

**lines = > split value=`doc` sep="\n"**
**n = > len value=`lines`**
**viol = > table.empty_list**
**in_fm = False**
**fm_done = False**
**in_fence = False**
**in_main = False**
**saw_main = False**
**main_exec = 0**
**i = 0**
- `i` < `n`
  **ln = > at value=`lines` index=`i`**
  **trimmed = > txt.str_trim s=`ln`**
  1. `in_fence`
    **is_close = > txt.starts_with text=`trimmed` prefix="\u{60}\u{60}\u{60}"**
    1. `is_close`
      **in_fence = False**
  2. `in_fm`
    **is_end = > txt.starts_with text=`trimmed` prefix="---"**
    1. `is_end`
      **in_fm = False**
      **fm_done = True**
  3. not `fm_done`
    **is_start = > txt.starts_with text=`trimmed` prefix="---"**
    1. `is_start`
      **in_fm = True**
  4. *
    **is_fence = > txt.starts_with text=`trimmed` prefix="\u{60}\u{60}\u{60}"**
    **is_sep = `trimmed` == "---" or `trimmed` == "***"**
    1. `is_fence`
      **in_fence = True**
    2. `is_sep`
      **_ = 1**
    3. not `trimmed`
      **_ = 1**
    4. `in_main`
      **is_bold = > txt.starts_with text=`trimmed` prefix="**"**
      **is_call = > txt.starts_with text=`trimmed` prefix=">"**
      **is_ret = > txt.starts_with text=`trimmed` prefix="*"**
      1. `is_bold`
        **main_exec = `main_exec` + 1**
      2. `is_call`
        **main_exec = `main_exec` + 1**
      3. `is_ret`
        **main_exec = `main_exec` + 1**
    5. *
      **is_h1 = > txt.starts_with text=`trimmed` prefix="# "**
      1. `is_h1`
        **is_main = `trimmed` == "# main"**
        1. `is_main`
          **in_main = True**
          **saw_main = True**
      2. *
        **is_h2 = > txt.starts_with text=`trimmed` prefix="##"**
        1. `is_h2`
          **row = > table.empty_map**
          **row = > table.put in=`row` at="line" value=`i`**
          **row = > table.put in=`row` at="rule" value="h2_outside_main"**
          **row = > table.put in=`row` at="text" value=`trimmed`**
          **viol = > table.append list=`viol` item=`row`**
        2. *
          **in_main = False**
          **bad = > 叙述违规 line=`ln`**
          1. `bad`
            **row = > table.empty_map**
            **row = > table.put in=`row` at="line" value=`i`**
            **row = > table.put in=`row` at="rule" value="narration_marker"**
            **row = > table.put in=`row` at="text" value=`trimmed`**
            **viol = > table.append list=`viol` item=`row`**
  **i = i + 1**
1. not `fm_done`
  **row = > table.empty_map**
  **row = > table.put in=`row` at="line" value=-1**
  **row = > table.put in=`row` at="rule" value="missing_frontmatter"**
  **row = > table.put in=`row` at="text" value=""**
  **viol = > table.append list=`viol` item=`row`**
1. not `saw_main`
  **row = > table.empty_map**
  **row = > table.put in=`row` at="line" value=-1**
  **row = > table.put in=`row` at="rule" value="missing_main"**
  **row = > table.put in=`row` at="text" value=""**
  **viol = > table.append list=`viol` item=`row`**
2. `main_exec` == 0
  **row = > table.empty_map**
  **row = > table.put in=`row` at="line" value=-1**
  **row = > table.put in=`row` at="rule" value="empty_main"**
  **row = > table.put in=`row` at="text" value=""**
  **viol = > table.append list=`viol` item=`row`**
**nv = > len value=`viol`**
1. `nv` == 0
  `pass` =

  | ok | violations |
  |----|------------|
  | True | `viol` |

  *pass*
2. *
  `fail` =

  | ok | violations |
  |----|------------|
  | False | `viol` |

  *fail*

## 叙述违规
    + `line`

True when the narration line starts with an execution marker.
Heading (`# `) lines are handled by the caller and never reach here.

**t = > txt.str_trim s=`line`**
1. not `t`
  *False*
**pres = > 叙述禁区**
- [p](遍历 pres 为 p)
  **hit = > txt.starts_with text=`t` prefix=`p`**
  1. `hit`
    *True*
*False*

## 沙箱试跑
    + `doc`
    + `root`=""

CoW trial: write the doc into a sandbox session and `sandbox.run` it
(exec / net / plugin denied; fs via CoW — the host tree is untouched).
Returns `{ ok, stdout, error }`.

1. `root`
  **s = > sandbox.open root=`root`**
2. *
  **s = > sandbox.open**
**id = [id](access(s, "id"))**
> sandbox.write id=`id` path="docgate.mq.md" text=`doc`
**r = > sandbox.run id=`id` path="docgate.mq.md"**
> sandbox.discard id=`id`
**rok = [ok](access(r, "ok"))**
**stdout = > table.get map=`r` key="stdout"**
**err = > table.get map=`r` key="error"**
1. not `stdout`
  **stdout = ""**
1. not `err`
  **err = ""**
`out` =

| ok | stdout | error |
|----|--------|-------|
| `rok` | `stdout` | `err` |

*out*

## 门禁
    + `text`
    + `root`=""

Full gate over raw agent output: 提取 → 结构检查 → 沙箱试跑.
Returns the doc plus evidence; `ok=False` carries the stage that failed.

**ext = > 提取 text=`text`**
**eok = [ok](access(ext, "ok"))**
**eerr = [error](access(ext, "error"))**
1. not `eok`
  `out` =

  | ok | stage | doc | violations | stdout | error |
  |----|-------|-----|------------|--------|-------|
  | False | extract | "" | "" | "" | `eerr` |

  *out*
**doc = [doc](access(ext, "doc"))**
**chk = > 结构检查 doc=`doc`**
**cok = [ok](access(chk, "ok"))**
**viol = [violations](access(chk, "violations"))**
1. not `cok`
  `out` =

  | ok | stage | doc | violations | stdout | error |
  |----|-------|-----|------------|--------|-------|
  | False | structure | `doc` | `viol` | "" | "" |

  *out*
**v = > 沙箱试跑 doc=`doc` root=`root`**
**vok = [ok](access(v, "ok"))**
**stdout = [stdout](access(v, "stdout"))**
**verr = [error](access(v, "error"))**
1. not `vok`
  `out` =

  | ok | stage | doc | violations | stdout | error |
  |----|-------|-----|------------|--------|-------|
  | False | sandbox | `doc` | `viol` | `stdout` | `verr` |

  *out*
`pass` =

| ok | stage | doc | violations | stdout | error |
|----|-------|-----|------------|--------|-------|
| True | "" | `doc` | `viol` | `stdout` | "" |

*pass*

## 修复提示
    + `gate_out`

Turn a failed gate result into a concise structured repair instruction
(feed back to the agent for one more round).

**stage = [stage](access(gate_out, "stage"))**
**viol = [violations](access(gate_out, "violations"))**
**verr = [error](access(gate_out, "error"))**
**msg = "输出不满足 marqdo 文档契约，请修复后重新输出完整文档。"**
1. `stage` == "extract"
  **msg = `msg` + " 未找到文档：必须以 --- frontmatter 开头，或为单个代码围栏包裹的完整 .mq.md。"**
2. `stage` == "structure"
  **msg = `msg` + " 结构问题："**
  - [v](遍历 viol 为 v)
    **rule = [rule](access(v, "rule"))**
    **text = [text](access(v, "text"))**
    **msg = `msg` + "[" + `rule` + "] " + `text` + "；"**
  **msg = `msg` + " 契约：--- frontmatter → # 任务 / # 结论（叙述）→ # main（执行）→ # 验证 / # 元数据。叙述行以文字开头，禁止行首数字、-、>、|、*、[、#、+；执行代码只允许写在 # main 内，且 # main 至少一条可执行语句。"**
3. `stage` == "sandbox"
  **msg = `msg` + " 沙箱运行失败：" + `verr` + " 请修正 marqdo 语法后重新输出完整文档。"**
*msg*

## 写入沉淀
    + `doc`
    + `path`

Persist a gate-passed document to its final location
(`data/runs/<slug>.mq.md` / `data/kb/<name>.mq.md` / workbook path).

> fs.write_text path=`path` text=`doc`
*`path`*

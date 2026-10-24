---
markup: occlusion
title: knowledge/import
description: >-
  TXT/Markdown → document.extract → drafts → check → publish into kb_root/knowledge/.
  PDF/OCR explicitly fail via Marqdo extract contract (no silent empty success).
  Layout: corpus/ · drafts/ · knowledge/ · tests/ · evidence/ · .marqdo/
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  time: lib/time.mq.md
  ctx: context.mq.md
---

## resolve_kb_root
    + `kb_root`=""

Prefer explicit kb_root, then QDAGENT_KB_ROOT, else project root (not data/).

1. `kb_root`
  *kb_root*
**env = > sys.env_get name="QDAGENT_KB_ROOT"**
1. `env`
  *env*
*> ctx.resolve_root root="."*

## ensure_layout
    + `kb_root`=""

Create gaps/03 §5 layout under kb_root.

**kb = > resolve_kb_root kb_root=`kb_root`**
> fs.make_dir path=`kb` + "/corpus"
> fs.make_dir path=`kb` + "/drafts"
> fs.make_dir path=`kb` + "/knowledge"
> fs.make_dir path=`kb` + "/tests"
> fs.make_dir path=`kb` + "/evidence"
> fs.make_dir path=`kb` + "/.marqdo"
`out` =

| ok | kb_root | corpus | drafts | knowledge |
|----|---------|--------|--------|-----------|
| True | `kb` | `kb` + "/corpus" | `kb` + "/drafts" | `kb` + "/knowledge" |

*out*

## mlsp_extract
    + `path`
    + `format`=""

Call `marqdo mlsp` document.extract. Returns parsed result map (or ok=False).

1. `format`
  **req = "{\"method\":\"document.extract\",\"params\":{\"path\":\"" + `path` + "\",\"format\":\"" + `format` + "\"}}"**
2. *
  **req = "{\"method\":\"document.extract\",\"params\":{\"path\":\"" + `path` + "\"}}"**
> sys.env_set name="QDAGENT_EXTRACT_REQ" value=`req`
`args` =

| a |
|---|
| "-c" |
| MQ="${MARQDO_BIN:-marqdo}"; f="${TMPDIR:-/tmp}/qd-mlsp-ext.json"; printf '%s\n' "$QDAGENT_EXTRACT_REQ" > "$f"; "$MQ" mlsp < "$f" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = access(proc, "code")**
**stdout = access(proc, "stdout")**
1. not `stdout`
  `fail` =

  | ok | error | code |
  |----|-------|------|
  | False | extract_no_stdout | `code` |

  *fail*
**resp = > json.parse text=`stdout`**
**rok = > json.get value=`resp` key="ok"**
1. `rok` == False
  **err = > json.get value=`resp` key="error"**
  `fail2` =

  | ok | error | response |
  |----|-------|----------|
  | False | `err` | `resp` |

  *fail2*
**result = > json.get value=`resp` key="result"**
1. not `result`
  **result = `resp`**
`ok` =

| ok | result | path |
|----|--------|------|
| True | `result` | `path` |

*ok*

## draft_from_extract
    + `path`
    + `kb_root`=""
    + `title`=""
    + `format`=""

Extract → write drafts/<stem>.mq.md knowledge candidate source. Uploaded .mq.md
is static-checked only (never auto-executed here).

**lay = > ensure_layout kb_root=`kb_root`**
**kb = access(lay, "kb_root")**
**ext = > mlsp_extract path=`path` format=`format`**
**eok = access(ext, "ok")**
1. not `eok`
  *ext*
**result = access(ext, "result")**
**fmt = > json.get value=`result` key="format"**
**status = > json.get value=`result` key="status"**
1. `status` == "failed"
  `failed` =

  | ok | error | format | result |
  |----|-------|--------|--------|
  | False | extract_failed | `fmt` | `result` |

  *failed*
**segs = > json.get value=`result` key="segments"**
**body_text = ""**
1. `segs`
  **body_text = > json.stringify value=`segs`**
2. *
  **body_text = > json.get value=`result` key="text"**
  1. not `body_text`
    **body_text = ""**
1. not `title`
  **title = `path`**
**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
**stem = "import-" + `s`**
**draft = `kb` + "/drafts/" + `stem` + ".mq.md"**
**src_digest = > json.get value=`result` key="extractor_version"**
**doc = "---\nmarkup: occlusion\ntitle: " + `title` + "\ndescription: imported from " + `path` + "\nsource_path: " + `path` + "\nsource_digest: " + `src_digest` + "\nstatus: draft\n---\n\n# 任务\n\n从资料导入并沉淀为可执行知识草稿。\n\n# 结论\n\n待审阅。来源格式 " + `fmt` + "。\n\n# main\n\n> print text=import-draft-" + `stem` + "\n\n# 验证\n\n待验证\n\n# 元数据\n\n| 字段 | 值 |\n|------|----|\n| source | " + `path` + " |\n| extract | " + `src_digest` + " |\n"**
> fs.write_text path=`draft` text=`doc`
**ev = `kb` + "/evidence/" + `stem` + ".extract.json"**
**raw = > json.stringify value=`result`**
> fs.write_text path=`ev` text=`raw`
`out` =

| ok | draft | evidence | kb_root | format | stem |
|----|-------|----------|---------|--------|------|
| True | `draft` | `ev` | `kb` | `fmt` | `stem` |

*out*

## check_draft
    + `draft`

Static `marqdo check` only — never auto-run uploaded .mq.md.

> sys.env_set name="QDAGENT_DRAFT" value=`draft`
`args` =

| a |
|---|
| "-c" |
| marqdo check "$QDAGENT_DRAFT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = access(proc, "code")**
**stdout = access(proc, "stdout")**
**ok = False**
1. `code` == 0
  **ok = True**
`out` =

| ok | code | draft | stdout |
|----|------|-------|--------|
| `ok` | `code` | `draft` | `stdout` |

*out*

## publish_draft
    + `draft`
    + `kb_root`=""
    + `product_gate_ok`=True

Move checked draft into kb_root/knowledge/ and recompile EKC. Refuses when
product_gate_ok is false. Does not execute the draft as a program.

1. not `product_gate_ok`
  `deny` =

  | ok | error |
  |----|-------|
  | False | product_gate_ok=false |

  *deny*
**chk = > check_draft draft=`draft`**
**cok = access(chk, "ok")**
1. not `cok`
  *chk*
**lay = > ensure_layout kb_root=`kb_root`**
**kb = access(lay, "kb_root")**
**body = > fs.read_text path=`draft`**
**name = > text.replace text=`draft` old="/" new="_"**
**dest = `kb` + "/knowledge/" + `name` + ".mq.md"**
1. `body`
  **body = > text.replace text=`body` old="status: draft" new="status: published"**
> fs.write_text path=`dest` text=`body`
> sys.env_set name="QDAGENT_EKC_ROOT" value=`kb`
> sys.env_set name="QDAGENT_EKC_OUT" value=`kb` + "/.marqdo"
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = access(proc, "code")**
**compile_ok = False**
1. `code` == 0
  **compile_ok = True**
2. *
  > fs.remove path=`dest`
  `fail` =

  | ok | error | code |
  |----|-------|------|
  | False | compile_failed | `code` |

  *fail*
`out` =

| ok | published | kb_root | compile_ok |
|----|-----------|---------|------------|
| True | `dest` | `kb` | `compile_ok` |

*out*

## import_txt
    + `path`
    + `kb_root`=""
    + `title`=""
    + `publish`=False
    + `product_gate_ok`=True

End-to-end TXT/Markdown import. Set publish=True after human review.

**d = > draft_from_extract path=`path` kb_root=`kb_root` title=`title` format="text"**
**ok = access(d, "ok")**
1. not `ok`
  **d = > draft_from_extract path=`path` kb_root=`kb_root` title=`title` format="markdown"**
  **ok = access(d, "ok")**
  1. not `ok`
    *d*
**draft = access(d, "draft")**
**chk = > check_draft draft=`draft`**
1. `publish`
  **pub = > publish_draft draft=`draft` kb_root=`kb_root` product_gate_ok=`product_gate_ok`**
  *pub*
`out` =

| ok | draft | check | published |
|----|-------|-------|-----------|
| True | `draft` | `chk` | False |

*out*

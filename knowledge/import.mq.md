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
| MQ="${MARQDO_BIN:-marqdo}"; f="${TMPDIR:-/tmp}/qd-mlsp-ext-$$-$RANDOM.json"; printf '%s\n' "$QDAGENT_EXTRACT_REQ" > "$f"; "$MQ" mlsp < "$f"; rc=$?; rm -f "$f"; exit $rc |

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

Q-R6: Extract → write drafts/<stem>.mq.md with substantive knowledge body (R08).
Stores original_digest / extracted_text_digest / extractor_version separately.
Uploaded .mq.md is static-checked only (never auto-executed here).

**lay = > ensure_layout kb_root=`kb_root`**
**kb = access(lay, "kb_root")**
**orig = > fs.read_text path=`path`**
1. not `orig`
  **orig = ""**
**orig_len = > len value=`orig`**
**original_digest = "sha-len:" + `orig_len`**
**ext = > mlsp_extract path=`path` format=`format`**
**eok = access(ext, "ok")**
1. not `eok`
  *ext*
**result = access(ext, "result")**
**fmt = > json.get value=`result` key="format"**
**status = > json.get value=`result` key="status"**
1. `status` == "failed"
  `failed` =

  | ok | error | format | result | original_digest |
  |----|-------|--------|--------|-----------------|
  | False | extract_failed | `fmt` | `result` | `original_digest` |

  *failed*
**extractor_version = > json.get value=`result` key="extractor_version"**
1. not `extractor_version`
  **extractor_version = "unknown"**
**segs = > json.get value=`result` key="segments"**
**body_text = ""**
1. `segs`
  **body_text = > json.get value=`result` key="text"**
  1. not `body_text`
    **body_text = > json.stringify value=`segs`**
2. *
  **body_text = > json.get value=`result` key="text"**
  1. not `body_text`
    **body_text = `orig`**
1. not `body_text`
  **body_text = `orig`**
**ext_len = > len value=`body_text`**
**extracted_text_digest = "sha-len:" + `ext_len`**
1. not `title`
  **title = `path`**
**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**stem = "import-" + `s` + "-" + `nonce`**
**draft = `kb` + "/drafts/" + `stem` + ".mq.md"**
**candidate_digest = "cand-" + `stem` + "-" + `extracted_text_digest`**
**snippet = `body_text`**
**snip_n = > len value=`snippet`**
1. `snip_n` > 4000
  **snippet = `snippet` + "…"**
**doc = "---\nmarkup: occlusion\ntitle: " + `title` + "\ndescription: imported from " + `path` + "\nsource_path: " + `path` + "\noriginal_digest: " + `original_digest` + "\nextracted_text_digest: " + `extracted_text_digest` + "\nextractor_version: " + `extractor_version` + "\ncandidate_digest: " + `candidate_digest` + "\nstatus: draft\n---\n\n# 任务\n\n从资料导入并沉淀为可执行知识草稿。\n\n# 结论\n\n来源格式 " + `fmt` + "。以下正文来自提取结果，供复用与验证。\n\n# 知识正文\n\n" + `snippet` + "\n\n# main\n\n> print text=" + `candidate_digest` + "\n\n# 验证\n\n| 断言 | 期望 |\n|------|------|\n| candidate_digest | " + `candidate_digest` + " |\n| original_digest | " + `original_digest` + " |\n\n# 元数据\n\n| 字段 | 值 |\n|------|----|\n| source | " + `path` + " |\n| original_digest | " + `original_digest` + " |\n| extracted_text_digest | " + `extracted_text_digest` + " |\n| extractor_version | " + `extractor_version` + " |\n"**
> fs.write_text path=`draft` text=`doc`
**ev = `kb` + "/evidence/" + `stem` + ".extract.json"**
**raw = > json.stringify value=`result`**
> fs.write_text path=`ev` text=`raw`
`out` =

| ok | draft | evidence | kb_root | format | stem | original_digest | extracted_text_digest | extractor_version | candidate_digest |
|----|-------|----------|---------|--------|------|-----------------|----------------------|-------------------|------------------|
| True | `draft` | `ev` | `kb` | `fmt` | `stem` | `original_digest` | `extracted_text_digest` | `extractor_version` | `candidate_digest` |

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
**u2 = > time.now_unix**
**s2 = > time.format unix=`u2` pattern="%Y%m%d-%H%M%S"**
**base = "published-" + `s2` + ".mq.md"**
**dest = `kb` + "/knowledge/" + `base`**
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
Top-level ok reflects check when not publishing (Q-R6 — no fake ok).

**d = > draft_from_extract path=`path` kb_root=`kb_root` title=`title` format="text"**
**ok = access(d, "ok")**
1. not `ok`
  **d = > draft_from_extract path=`path` kb_root=`kb_root` title=`title` format="markdown"**
  **ok = access(d, "ok")**
  1. not `ok`
    *d*
**draft = access(d, "draft")**
**evidence = access(d, "evidence")**
**original_digest = access(d, "original_digest")**
**extracted_text_digest = access(d, "extracted_text_digest")**
**extractor_version = access(d, "extractor_version")**
**candidate_digest = access(d, "candidate_digest")**
**chk = > check_draft draft=`draft`**
**cok = access(chk, "ok")**
1. `publish`
  1. not `cok`
    `blocked` =

    | ok | error | draft | check |
    |----|-------|-------|-------|
    | False | check_failed_before_publish | `draft` | `chk` |

    *blocked*
  **pub = > publish_draft draft=`draft` kb_root=`kb_root` product_gate_ok=`product_gate_ok`**
  *pub*
1. not `cok`
  `needs` =

  | ok | draft | check | evidence | original_digest | extracted_text_digest | extractor_version | candidate_digest | published | status |
  |----|-------|-------|----------|-----------------|----------------------|-------------------|------------------|-----------|--------|
  | True | `draft` | `chk` | `evidence` | `original_digest` | `extracted_text_digest` | `extractor_version` | `candidate_digest` | False | needs_input |

  *needs*
`out` =

| ok | draft | check | evidence | original_digest | extracted_text_digest | extractor_version | candidate_digest | published | status |
|----|-------|-------|----------|-----------------|----------------------|-------------------|------------------|-----------|--------|
| True | `draft` | `chk` | `evidence` | `original_digest` | `extracted_text_digest` | `extractor_version` | `candidate_digest` | False | draft_ready |

*out*

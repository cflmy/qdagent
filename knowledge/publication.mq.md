---
markup: occlusion
title: knowledge/publication
description: >-
  Q-R7 real publish: journal → stage → check → compile → CURRENT switch.
  DB status is projection; manifest/CURRENT is authority (R07).
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
  eng_imp: import.mq.md
  run: ../lib/run.mq.md
---

## current_path
    + `kb_root`=""

**lay = > eng_imp.ensure_layout kb_root=`kb_root`**
**kb = access(lay, "kb_root")**
**cur = `kb` + "/.marqdo/CURRENT"**
`out` =

| kb_root | current |
|---------|---------|
| `kb` | `cur` |

*out*

## read_generation
    + `kb_root`=""

**paths = > current_path kb_root=`kb_root`**
**cur = access(paths, "current")**
**exists = > fs.exists path=`cur`**
1. not `exists`
  *"0"*
**raw = > fs.read_text path=`cur`**
1. not `raw`
  *"0"*
**gen = > text.str_trim s=`raw`**
1. not `gen`
  *"0"*
*`gen`*

## publish
    + `draft`
    + `kb_root`=""
    + `candidate_digest`=""
    + `expected_generation`=""
    + `import_job_id`=""
    + `product_gate_ok`=True

Publish draft into knowledge/ with generation journal and CURRENT pointer.
Refuses when product_gate_ok is false or expected_generation mismatches.

1. not `product_gate_ok`
  `deny` =

  | ok | error |
  |----|-------|
  | False | product_gate_ok=false |

  *deny*
1. not `draft`
  `need` =

  | ok | error |
  |----|-------|
  | False | draft required |

  *need*

**paths = > current_path kb_root=`kb_root`**
**kb = access(paths, "kb_root")**
**cur = access(paths, "current")**
**current_gen = > read_generation kb_root=`kb`**
1. `expected_generation`
  1. not `expected_generation` == `current_gen`
    `conflict` =

    | ok | error | code | current_generation | expected_generation |
    |----|-------|------|--------------------|---------------------|
    | False | generation conflict | revision.conflict | `current_gen` | `expected_generation` |

    *conflict*

**chk = > eng_imp.check_draft draft=`draft`**
**cok = access(chk, "ok")**
1. not `cok`
  `gate` =

  | ok | error | check |
  |----|-------|-------|
  | False | publication.gate_failed | `chk` |

  *gate*

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
**nonce = > sys.env_get name="RANDOM"**
1. not `nonce`
  **nonce = `u`**
**generation = "gen-" + `s` + "-" + `nonce`**
**pub_dir = `kb` + "/.marqdo/publications/" + `generation`**
> fs.make_dir path=`pub_dir`
**journal = `pub_dir` + "/journal.json"**
`jbody` =

| phase | draft | candidate_digest | expected_generation | import_job_id | created_at |
|-------|-------|------------------|---------------------|---------------|------------|
| staging | `draft` | `candidate_digest` | `current_gen` | `import_job_id` | `u` |

**js = > json.stringify value=`jbody`**
> fs.write_text path=`journal` text=`js`

**body = > fs.read_text path=`draft`**
1. not `body`
  `empty` =

  | ok | error |
  |----|-------|
  | False | empty draft |

  *empty*
**body = > text.replace text=`body` old="status: draft" new="status: published"**
**base = "published-" + `generation` + ".mq.md"**
**dest = `kb` + "/knowledge/" + `base`**
**stage_dest = `pub_dir` + "/source.mq.md"**
> fs.write_text path=`stage_dest` text=`body`

> sys.env_set name="QDAGENT_EKC_ROOT" value=`kb`
> sys.env_set name="QDAGENT_EKC_OUT" value=`kb` + "/.marqdo"
`args` =

| a |
|---|
| "-c" |
| marqdo knowledge "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" |

**proc = > sys.exec cmd="sh" args=args capture=True**
**code = access(proc, "code")**
1. not `code` == 0
  `jfail` =

  | phase | error | code |
  |-------|-------|------|
  | aborted | compile_failed | `code` |

  **jfs = > json.stringify value=`jfail`**
  > fs.write_text path=`journal` text=`jfs`
  `fail` =

  | ok | error | code |
  |----|-------|------|
  | False | compile_failed | `code` |

  *fail*

> fs.write_text path=`dest` text=`body`

1. not `candidate_digest`
  **candidate_digest = "cand-" + `generation`**
`manifest` =

| schema | schema_version | generation | previous_generation | published | candidate_digest | draft | import_job_id | kb_root | committed_at |
|--------|----------------|------------|---------------------|-----------|------------------|-------|---------------|---------|--------------|
| PublicationManifestV1 | 1 | `generation` | `current_gen` | `dest` | `candidate_digest` | `draft` | `import_job_id` | `kb` | `u` |

**manifest_path = `pub_dir` + "/manifest.json"**
**ms = > json.stringify value=`manifest`**
> fs.write_text path=`manifest_path` text=`ms`

**tmp_cur = `cur` + ".tmp-" + `generation`**
> fs.write_text path=`tmp_cur` text=`generation`
> fs.write_text path=`cur` text=`generation`
> fs.remove path=`tmp_cur`

`jok` =

| phase | generation | manifest | committed_at |
|-------|------------|----------|--------------|
| committed | `generation` | `manifest_path` | `u` |

**joks = > json.stringify value=`jok`**
> fs.write_text path=`journal` text=`joks`

`out` =

| ok | published | generation | manifest | kb_root | previous_generation |
|----|-----------|------------|----------|---------|---------------------|
| True | `dest` | `generation` | `manifest_path` | `kb` | `current_gen` |

*out*

## verify_published
    + `import_job_id`=""
    + `manifest`=""
    + `kb_root`=""

Confirm published status only when manifest file exists and CURRENT matches.

1. `manifest`
  **exists = > fs.exists path=`manifest`**
  1. not `exists`
    `bad` =

    | ok | verified | reason |
    |----|----------|--------|
    | False | False | manifest_missing |

    *bad*
  **raw = > fs.read_text path=`manifest`**
  **man = > json.parse text=`raw`**
  **gen = > json.get value=`man` key="generation"**
  **cur = > read_generation kb_root=`kb_root`**
  1. `gen`
    1. not `gen` == `cur`
      `stale` =

      | ok | verified | reason | generation | current |
      |----|----------|--------|------------|---------|
      | False | False | current_mismatch | `gen` | `cur` |

      *stale*
  `ok` =

  | ok | verified | generation | manifest |
  |----|----------|------------|----------|
  | True | True | `gen` | `manifest` |

  *ok*
`nf` =

| ok | verified | reason |
|----|----------|--------|
| False | False | no_manifest |

*nf*

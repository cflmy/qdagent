---
markup: occlusion
title: execution/promote
description: >-
  Knowledge Candidate → Promote / Reject.
  Verify-before-Promote: L3 must pass; never promote without Evidence.
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  time: lib/time.mq.md
  verify: verify.mq.md
  ctx: ../knowledge/context.mq.md
  plugin: lib/plugin.mq.md
---

## data_root

**root = > sys.env_get name="QDAGENT_DATA"**
1. `root`
  *root*
2. *
  *"data"*

## candidates_dir

**root = > data_root**
*`root` + "/candidates"*

## knowledge_dir
    + `kind`="decisions"

1. `kind` == "constraint"
  *"knowledge/constraints"*
2. `kind` == "constraints"
  *"knowledge/constraints"*
3. `kind` == "failure"
  *"knowledge/failures"*
4. `kind` == "failures"
  *"knowledge/failures"*
5. `kind` == "capability"
  *"knowledge/capabilities"*
6. `kind` == "capabilities"
  *"knowledge/capabilities"*
7. *
  *"knowledge/decisions"*

## type_label
    + `kind`="decision"

1. `kind` == "constraint"
  *"Constraint"*
2. `kind` == "constraints"
  *"Constraint"*
3. `kind` == "failure"
  *"Failure"*
4. `kind` == "failures"
  *"Failure"*
5. `kind` == "capability"
  *"Capability"*
6. `kind` == "capabilities"
  *"Capability"*
7. *
  *"Decision"*

## cand_paths
    + `slug`

**dir = > candidates_dir**
`paths` =

| mq | meta |
|----|------|
| `dir` + "/" + `slug` + ".mq.md" | `dir` + "/" + `slug` + ".json" |

*paths*

## write_meta
    + `slug`
    + `capability`
    + `evidence`
    + `verification`
    + `status`="candidate"
    + `task`=""
    + `path`=""
    + `kind`="decision"
    + `artifact_digest`=""
    + `source_digest`=""
    + `exception`=""

**paths = > cand_paths slug=`slug`**
**meta_path = access(paths, "meta")**
`meta` =

| slug | capability | evidence | verification | status | task | path | kind | artifact_digest | source_digest | exception |
|------|------------|----------|--------------|--------|------|------|------|-----------------|---------------|-----------|
| `slug` | `capability` | `evidence` | `verification` | `status` | `task` | `path` | `kind` | `artifact_digest` | `source_digest` | `exception` |

**raw = > json.stringify value=`meta`**
> fs.write_text path=`meta_path` text=`raw`
*meta_path*

## list
    + `status`=""

List candidate slugs (optionally filter by status via sidecar json).

**dir = > candidates_dir**
**exists = > fs.exists path=`dir`**
1. not `exists`
  **none = > json.parse text=[]**
  `empty` =

  | ok | candidates |
  |----|------------|
  | True | `none` |

  *empty*

**names = > fs.list_dir path=`dir`**
**slugs = > json.parse text=[]**

- [name](遍历 `names` 为 `name`)
  **parts = > split value=`name` sep=".mq.md"**
  **n = > len value=`parts`**
  1. `n` == 2
    **slug = > at value=`parts` index=0**
    1. `status`
      **paths = > cand_paths slug=`slug`**
      **mp = [meta](access(paths, "meta"))**
      **has = > fs.exists path=`mp`**
      1. `has`
        **raw = > fs.read_text path=`mp`**
        **m = > json.parse text=`raw`**
        **st = > json.get value=`m` key="status"**
        1. `st` == `status`
          **slugs = > json.append list=`slugs` item=`slug`**
      2. *
        **_ = 1**
    2. *
      **slugs = > json.append list=`slugs` item=`slug`**

`out` =

| ok | candidates |
|----|------------|
| True | `slugs` |

*out*

## read
    + `slug`

**paths = > cand_paths slug=`slug`**
**mq = [mq](access(paths, "mq"))**
**mp = [meta](access(paths, "meta"))**
**has = > fs.exists path=`mq`**
1. not `has`
  `fail` =

  | ok | error |
  |----|-------|
  | False | missing_candidate |

  *fail*

**body = > fs.read_text path=`mq`**
`meta` =

| slug |
|------|
| `slug` |

**has_meta = > fs.exists path=`mp`**
1. `has_meta`
  **raw = > fs.read_text path=`mp`**
  **meta = > json.parse text=`raw`**

`out` =

| ok | slug | body | meta | path |
|----|------|------|------|------|
| True | `slug` | `body` | `meta` | `mq` |

*out*

## knowledge_body
    + `title`
    + `kind`="decision"
    + `capability`
    + `evidence`
    + `verification`
    + `task`=""
    + `source_slug`=""

**ty = > type_label kind=`kind`**
**body = "---\ntitle: " + `title`**
**body = `body` + "\ntype: " + `ty`**
**body = `body` + "\nstatus: stable"**
**body = `body` + "\ncapability: " + `capability`**
**body = `body` + "\nsource_candidate: " + `source_slug`**
**body = `body` + "\n---\n\n"**
**body = `body` + "# " + `ty` + "\n\n" + `title` + "\n\n"**
**body = `body` + "## Capability\n\n" + `capability` + "\n\n"**
**body = `body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**body = `body` + "## Verification\n\n" + `verification` + "\n\n"**
**body = `body` + "## Task\n\n" + `task` + "\n\n"**
**body = `body` + "## Promotion\n\nPromoted from Knowledge Candidate "**
**body = `body` + `source_slug` + " after Verify-before-Promote.\n"**
*body*

## slugify
    + `text`

Fallback file stem from capability text (keep alnum / hyphen).

**u = > time.now_unix**
**s = > time.format unix=`u` pattern="%Y%m%d-%H%M%S"**
*"promoted-" + `s`*

## promote
    + `slug`
    + `kind`="decision"
    + `title`=""
    + `capability`=""
    + `evidence`=""
    + `verification`=""
    + `root`="."
    + `out`=".marqdo"
    + `force`=False
    + `product_gate_ok`=True
    + `artifact_id`=""
    + `artifact_digest`=""
    + `source_digest`=""

Promote one candidate into authored L4 under knowledge/. Staging write → compile →
activate. `force` records `exception_force` and never pretends tests passed.
Compile failure keeps previous active version (staging discarded).

**exception = ""**
1. `force`
  **exception = "exception_force"**
2. *
  **v = > verify.run root=`root` out=`out` l1_ok=True artifact_digest=`artifact_digest` source_digest=`source_digest`**
  **passed = access(v, "passed")**
  1. not `passed`
    `blocked` =

    | ok | error | verify |
    |----|-------|--------|
    | False | verify_before_promote | `v` |

    *blocked*
  **gate = > eng_publish_gate_safe project=`root` artifact_id=`artifact_id` product_gate_ok=`product_gate_ok`**
  **may_promote = access(gate, "may_promote")**
  1. `may_promote` == False
    `gate_block` =

    | ok | error | publish_gate |
    |----|-------|--------------|
    | False | publish_gate_blocked | `gate` |

    *gate_block*

**cand = > read slug=`slug`**
**ok = access(cand, "ok")**
1. not `ok`
  *cand*

**meta = access(cand, "meta")**
**body = access(cand, "body")**
**ev0 = > json.get value=`meta` key="evidence"**
**ver0 = > json.get value=`meta` key="verification"**
**dig0 = > json.get value=`meta` key="artifact_digest"**
1. not `artifact_digest`
  **artifact_digest = `dig0`**
1. not `source_digest`
  **source_digest = > json.get value=`meta` key="source_digest"**
1. not `force`
  1. not `ev0`
    `no_ev` =

    | ok | error | slug |
    |----|-------|------|
    | False | evidence_required | `slug` |

    *no_ev*
  1. not `ver0`
    `no_ver` =

    | ok | error | slug |
    |----|-------|------|
    | False | verification_record_required | `slug` |

    *no_ver*
  **has_adj = > text.contains text=`ver0` sub="adjudicate"**
  **has_l3 = > text.contains text=`ver0` sub="L3"**
  **has_pass = > text.contains text=`ver0` sub="passed"**
  **has_bound = > text.contains text=`ver0` sub="artifact_digest"**
  1. not `has_adj`
    1. not `has_l3`
      1. not `has_pass`
        1. not `has_bound`
          `no_proof` =

          | ok | error | slug | verification |
          |----|-------|------|--------------|
          | False | structured_verification_required | `slug` | `ver0` |

          *no_proof*

**st = > json.get value=`meta` key="status"**
1. `st` == "stable"
  `already` =

  | ok | error | slug |
  |----|-------|------|
  | False | already_stable | `slug` |

  *already*
1. `st` == "rejected"
  `rej` =

  | ok | error | slug |
  |----|-------|------|
  | False | already_rejected | `slug` |

  *rej*

1. not `capability`
  **capability = > json.get value=`meta` key="capability"**
1. not `evidence`
  **evidence = > json.get value=`meta` key="evidence"**
1. not `verification`
  **verification = > json.get value=`meta` key="verification"**
1. not `capability`
  **capability = `slug`**
1. not `evidence`
  **evidence = "see candidate " + `slug`**
1. not `verification`
  1. `force`
    **verification = "exception_force — human override; tests not claimed"**
  2. *
    **verification = "L3 re-verified on promote"**
1. not `title`
  **title = `capability`**

**task = > json.get value=`meta` key="task"**
1. not `task`
  **task = ""**

**kdir = > knowledge_dir kind=`kind`**
> fs.make_dir path=`kdir`
> fs.make_dir path=`kdir` + "/.staging"
**file_stem = > slugify text=`capability`**
**kpath = `kdir` + "/" + `file_stem` + ".md"**
**staging = `kdir` + "/.staging/" + `file_stem` + ".md"**
**prev = `kpath` + ".prev"**
**kbody = > knowledge_body title=`title` kind=`kind` capability=`capability` evidence=`evidence` verification=`verification` task=`task` source_slug=`slug`**
> fs.write_text path=`staging` text=`kbody`

Write candidate to active path after backing up any previous version; restore on compile fail.

**had_prev = > fs.exists path=`kpath`**
1. `had_prev`
  > fs.copy_file src=`kpath` dst=`prev`
> fs.write_text path=`kpath` text=`kbody`

**root = > ctx.resolve_root root=`root`**
**out = > ctx.resolve_out out=`out` root=`root`**
> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`
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
  1. `had_prev`
    > fs.remove path=`prev`
2. *
  1. `had_prev`
    > fs.copy_file src=`prev` dst=`kpath`
    > fs.remove path=`prev`
  2. *
    > fs.remove path=`kpath`
  `compile_fail` =

  | ok | error | slug | staging | compile_ok |
  |----|-------|------|---------|------------|
  | False | compile_failed_previous_kept | `slug` | `staging` | False |

  *compile_fail*

**cpath = access(cand, "path")**
**final_status = "stable"**
1. `force`
  **final_status = "stable_exception"**
**new_body = "---\ntype: Knowledge Candidate\nstatus: " + `final_status`**
**new_body = `new_body` + "\npromoted_to: " + `kpath` + "\n---\n\n"**
**new_body = `new_body` + "# Knowledge Candidate\n\n"**
**new_body = `new_body` + "## Capability\n\n" + `capability` + "\n\n"**
**new_body = `new_body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**new_body = `new_body` + "## Verification\n\n" + `verification` + "\n\n"**
**new_body = `new_body` + "## Task\n\n" + `task` + "\n\n"**
**new_body = `new_body` + "## Status\n\n" + `final_status` + "\n\n"**
1. `exception`
  **new_body = `new_body` + "## Exception\n\n" + `exception` + "\n\n"**
**new_body = `new_body` + "## Promoted To\n\n" + `kpath` + "\n"**
> fs.write_text path=`cpath` text=`new_body`
> write_meta slug=`slug` capability=`capability` evidence=`evidence` verification=`verification` status=`final_status` task=`task` path=`cpath` kind=`kind` artifact_digest=`artifact_digest` source_digest=`source_digest` exception=`exception`

`ret` =

| ok | slug | status | knowledge_path | compile_ok | exception | artifact_digest |
|----|------|--------|----------------|------------|-----------|-----------------|
| True | `slug` | `final_status` | `kpath` | `compile_ok` | `exception` | `artifact_digest` |

*ret*

## eng_publish_gate_safe
    + `project`="."
    + `artifact_id`=""
    + `product_gate_ok`=True
    + `candidate_only`=False

Call Marqdo `agent_eng_publish_gate` when the agent plugin is loadable; otherwise
defer to product_gate_ok only (still refuses when product_gate_ok=false).

1. `product_gate_ok` == False
  `deny` =

  | may_promote | reason |
  |-------------|--------|
  | False | product_gate_ok=false |

  *deny*
1. not `artifact_id`
  `defer` =

  | may_promote | reason |
  |-------------|--------|
  | True | no_artifact_id_deferred |

  *defer*
**p = > plugin.native_path name="agent"**
1. `p`
  > plugin.load path=`p`
  **gate = > agent_eng_publish_gate project=`project` artifact_id=`artifact_id` candidate_only=`candidate_only` product_gate_ok=`product_gate_ok`**
  1. `gate`
    *gate*
`fallback` =

| may_promote | reason |
|-------------|--------|
| True | plugin_unavailable_product_ok |

*fallback*

## reject
    + `slug`
    + `reason`="rejected"

**cand = > read slug=`slug`**
**ok = [ok](access(cand, "ok"))**
1. not `ok`
  *cand*

**meta = [meta](access(cand, "meta"))**
**capability = > json.get value=`meta` key="capability"**
**evidence = > json.get value=`meta` key="evidence"**
**verification = > json.get value=`meta` key="verification"**
**task = > json.get value=`meta` key="task"**
1. not `capability`
  **capability = `slug`**
1. not `evidence`
  **evidence = ""**
1. not `verification`
  **verification = ""**
1. not `task`
  **task = ""**

**cpath = [path](access(cand, "path"))**
**new_body = "---\ntype: Knowledge Candidate\nstatus: rejected"**
**new_body = `new_body` + "\nreason: " + `reason` + "\n---\n\n"**
**new_body = `new_body` + "# Knowledge Candidate\n\n"**
**new_body = `new_body` + "## Capability\n\n" + `capability` + "\n\n"**
**new_body = `new_body` + "## Evidence\n\n" + `evidence` + "\n\n"**
**new_body = `new_body` + "## Verification\n\n" + `verification` + "\n\n"**
**new_body = `new_body` + "## Task\n\n" + `task` + "\n\n"**
**new_body = `new_body` + "## Status\n\nrejected\n\n"**
**new_body = `new_body` + "## Reason\n\n" + `reason` + "\n"**
> fs.write_text path=`cpath` text=`new_body`
> write_meta slug=`slug` capability=`capability` evidence=`evidence` verification=`verification` status="rejected" task=`task` path=`cpath`

`ret` =

| ok | slug | status | reason |
|----|------|--------|--------|
| True | `slug` | rejected | `reason` |

*ret*

---
markup: occlusion
title: execution/verify
description: >-
  Verification gate — L1 product success, L3 EKC verify + duplicate --fail +
  knowledge adjudicate --fail. Conflicts/stale exit 0 alone never prove pass.
  Verification records bind digest / runner / result for promote.
import:
  sys: lib/sys.mq.md
  run: run.mq.md
  ctx: ../knowledge/context.mq.md
  json: lib/json.mq.md
---

## knowledge_checks
    + `root`="."
    + `out`=".marqdo"

Structural L3 suite. `passed` requires verify + duplicate --fail + adjudicate --fail.
Do **not** treat conflicts/stale exit 0 as proof (Marqdo may report issues with code 0).

**root = > ctx.resolve_root root=`root`**
**out = > ctx.resolve_out out=`out` root=`root`**

> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`

`a_verify` =

| a |
|---|
| "-c" |
| marqdo verify "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p1 = > sys.exec cmd="sh" args=a_verify capture=True**
**c1 = access(p1, "code")**

`a_dup` =

| a |
|---|
| "-c" |
| marqdo duplicate --fail "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p2 = > sys.exec cmd="sh" args=a_dup capture=True**
**c2 = access(p2, "code")**

`a_adj` =

| a |
|---|
| "-c" |
| marqdo knowledge adjudicate --fail --policy business "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p3 = > sys.exec cmd="sh" args=a_adj capture=True**
**c3 = access(p3, "code")**

Informational only — never decide pass from these codes alone.

`a_conf` =

| a |
|---|
| "-c" |
| marqdo conflicts "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" 2>&1 | head -c 4000 |

**p4 = > sys.exec cmd="sh" args=a_conf capture=True**
**c4 = access(p4, "code")**
**conf_out = access(p4, "stdout")**

`a_stale` =

| a |
|---|
| "-c" |
| marqdo stale "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" 2>&1 | head -c 4000 |

**p5 = > sys.exec cmd="sh" args=a_stale capture=True**
**c5 = access(p5, "code")**
**stale_out = access(p5, "stdout")**

**passed = False**
1. `c1` == 0
  1. `c2` == 0
    1. `c3` == 0
      **passed = True**

`report` =

| ok | passed | verify_code | duplicate_code | adjudicate_code | conflicts_code | stale_code | conflicts_snip | stale_snip |
|----|--------|-------------|----------------|-----------------|----------------|------------|----------------|------------|
| True | `passed` | `c1` | `c2` | `c3` | `c4` | `c5` | `conf_out` | `stale_out` |

*report*

## bind_digest
    + `artifact_digest`=""
    + `source_digest`=""
    + `inputs`=""
    + `assertions`=""
    + `runner`=""
    + `result`=""
    + `passed`=False

Structured verification record for promote (digest-bound; not free text).

1. not `runner`
  **runner = > sys.env_get name="MARQDO_BIN"**
  1. not `runner`
    **runner = "marqdo"**
**ver_s = > sys.env_get name="QDAGENT_MARQDO_VERSION"**
1. not `ver_s`
  **ver_s = "unknown"**

`rec` =

| artifact_digest | source_digest | inputs | assertions | runner | runner_version | result | passed |
|-----------------|---------------|--------|------------|--------|----------------|--------|--------|
| `artifact_digest` | `source_digest` | `inputs` | `assertions` | `runner` | `ver_s` | `result` | `passed` |

*rec*

## run
    + `slug`=""
    + `root`="."
    + `out`=".marqdo"
    + `l1_ok`=True
    + `artifact_digest`=""
    + `source_digest`=""
    + `inputs`=""
    + `assertions`=""
    + `result`=""

Full verification. Without L1 success + L3 adjudicate, promotion is forbidden.
Binds digests into workbook Verification section when slug is set.

**report = > knowledge_checks root=`root` out=`out`**
**passed = access(report, "passed")**
1. not `l1_ok`
  **passed = False**

**bound = > bind_digest artifact_digest=`artifact_digest` source_digest=`source_digest` inputs=`inputs` assertions=`assertions` result=`result` passed=`passed`**

1. `slug`
  **summary = > json.stringify value=`bound`**
  > run.append_section slug=`slug` section="Verification" content=`summary`
  1. `passed`
    > run.append_section slug=`slug` section="Evidence" content="L3 verify+duplicate+adjudicate passed"
    > run.set_status slug=`slug` status="verifying"
  2. *
    > run.append_section slug=`slug` section="Evidence" content="verification incomplete — do not promote"
    > run.set_status slug=`slug` status="verifying"

**promote_allowed = `passed`**
`out` =

| ok | passed | promote_allowed | report | bound |
|----|--------|-----------------|--------|-------|
| True | `passed` | `promote_allowed` | `report` | `bound` |

*out*

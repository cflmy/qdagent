---
title: execution/verify
description: >-
  Verification gate — L1 exit, L2 tests (when available), L3 knowledge
  (marqdo verify / duplicate / conflicts / stale). Verify before Promote.
import sys:lib/sys.mq.md
import run:run.mq.md
---

## knowledge_checks
    + `root`="."
    + `out`=".marqdo"

Run Marqdo L3 knowledge verification suite. Returns exit codes only (no huge dumps).

> sys.env_set name="QDAGENT_EKC_ROOT" value=`root`
> sys.env_set name="QDAGENT_EKC_OUT" value=`out`

`a_verify` =

| a |
|---|
| "-c" |
| marqdo verify "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p1 = > sys.exec cmd="sh" args=a_verify capture=True**
**c1 = [code](p1)**

`a_dup` =

| a |
|---|
| "-c" |
| marqdo duplicate "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p2 = > sys.exec cmd="sh" args=a_dup capture=True**
**c2 = [code](p2)**

`a_conf` =

| a |
|---|
| "-c" |
| marqdo conflicts "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p3 = > sys.exec cmd="sh" args=a_conf capture=True**
**c3 = [code](p3)**

`a_stale` =

| a |
|---|
| "-c" |
| marqdo stale "$QDAGENT_EKC_ROOT" -o "$QDAGENT_EKC_OUT" >/dev/null |

**p4 = > sys.exec cmd="sh" args=a_stale capture=True**
**c4 = [code](p4)**

**passed = False**
1. `c1` == 0
  1. `c2` == 0
    1. `c3` == 0
      1. `c4` == 0
        **passed = True**

`report` =

| ok | passed | verify_code | duplicate_code | conflicts_code | stale_code |
|----|--------|-------------|----------------|----------------|------------|
| True | `passed` | `c1` | `c2` | `c3` | `c4` |

*report*

## run
    + `slug`=""
    + `root`="."
    + `out`=".marqdo"
    + `l1_ok`=True

Full verification. Without Evidence (passed=false) promotion is forbidden.

**report = > knowledge_checks root=`root` out=`out`**
**passed = [passed](report)**
1. not `l1_ok`
  **passed = False**

1. `slug`
  **summary = "passed=" + `passed`**
  > run.append_section slug=`slug` section="Verification" content=`summary`
  1. `passed`
    > run.append_section slug=`slug` section="Evidence" content="L3 knowledge checks passed"
    > run.set_status slug=`slug` status="verifying"
  2. *
    > run.append_section slug=`slug` section="Evidence" content="verification incomplete — do not promote"
    > run.set_status slug=`slug` status="verifying"

**promote_allowed = `passed`**
`out` =

| ok | passed | promote_allowed | report |
|----|--------|-----------------|--------|
| True | `passed` | `promote_allowed` | `report` |

*out*

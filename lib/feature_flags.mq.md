---
markup: occlusion
title: lib/feature_flags
description: >-
  Q-R9 deployment feature switches. UI must follow capability responses —
  hiding controls does not bypass backend gates.
import:
  sys: lib/sys.mq.md
  json: lib/json.mq.md
---

## get
    + `name`

Read flag from env QDAGENT_FF_<NAME> (1/true/on → true). Default false
except task_runtime_v2 and import_pipeline_v2 default true after Q-R0.

**env_name = "QDAGENT_FF_" + `name`**
**raw = > sys.env_get name=`env_name`**
1. `raw` == "1"
  *True*
1. `raw` == "true"
  *True*
1. `raw` == "on"
  *True*
1. `raw` == "0"
  *False*
1. `raw` == "false"
  *False*
1. `raw` == "off"
  *False*
1. `name` == "task_runtime_v2"
  *True*
1. `name` == "import_pipeline_v2"
  *True*
1. `name` == "publication_manifest_required"
  *True*
1. `name` == "reader_version_strict"
  *True*
*False*

## snapshot

`flags` =

| task_runtime_v2 | import_pipeline_v2 | publication_manifest_required | reader_version_strict |
|-----------------|--------------------|-------------------------------|-----------------------|
| True | True | True | True |

**a = > get name="task_runtime_v2"**
**b = > get name="import_pipeline_v2"**
**c = > get name="publication_manifest_required"**
**d = > get name="reader_version_strict"**
`out` =

| task_runtime_v2 | import_pipeline_v2 | publication_manifest_required | reader_version_strict |
|-----------------|--------------------|-------------------------------|-----------------------|
| `a` | `b` | `c` | `d` |

*out*

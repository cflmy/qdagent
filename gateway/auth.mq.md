---
title: gateway/auth
description: >-
  Gateway authentication + request-tracing surface (design §20 lists the
  module; §46 specifies the tracing headers). Credentials are gated against the
  QDAGENT_API_KEY env (default "qdagent-local" for local dogfood — same key the
  /v1 compat path in lib/api uses, so one secret covers both surfaces). The
  X-QDAgent-{Run,Context,Knowledge-Version} headers let Cursor / IDE trace a
  request through Context → Run → Knowledge. Auth is a qdagent product concern
  (§4); Marqdo owns the runtime, not product auth.
import sys:lib/sys.mq.md
import json:lib/json.mq.md
import table:lib/table.mq.md
import text:lib/text.mq.md
---

## resolve_key

The expected credential. Falls back to "qdagent-local" so single-machine
dogfood works with no config; a remote deployment MUST set QDAGENT_API_KEY.

**k = > sys.env_get name="QDAGENT_API_KEY"**
1. not `k`
  *"qdagent-local"*
*k*

## extract_token
    + `authorization`=""
    + `api_key`=""

Normalize the presented credential from either an `api_key` arg or a
`Bearer <token>` / raw Authorization header.

**token = ""**
1. `api_key`
  **token = `api_key`**
2. `authorization`
  **has_b = > text.starts_with text=`authorization` prefix="Bearer "**
  1. `has_b`
    **parts = > text.str_split s=`authorization` sep="Bearer "**
    **token = > at value=`parts` index=1**
  2. *
    **token = `authorization`**
*token*

## check
    + `authorization`=""
    + `api_key`=""
    + `payload`=None
    + `run_id`=""
    + `context_id`=""
    + `knowledge_version`=""

Gateway gate. Reads credential + tracing headers from `payload` when the HTTP
layer passes the whole request map; explicit args win. Denies on credential
mismatch; never reaches the Agent. Tracing headers are echoed back on success
so the handler can stamp the workbook / response.

1. `payload`
  **a = > json.get value=`payload` key="authorization"**
  1. `a`
    **authorization = `a`**
  **k = > json.get value=`payload` key="api_key"**
  1. `k`
    **api_key = `k`**
  **rid = > json.get value=`payload` key="x_qdagent_run_id"**
  1. `rid`
    **run_id = `rid`**
  **cid = > json.get value=`payload` key="x_qdagent_context_id"**
  1. `cid`
    **context_id = `cid`**
  **kv = > json.get value=`payload` key="x_qdagent_knowledge_version"**
  1. `kv`
    **knowledge_version = `kv`**
**expect = > resolve_key**
**token = > extract_token authorization=`authorization` api_key=`api_key`**
1. `token` != `expect`
  `deny` =

  | ok | authorized | reason | run_id | context_id | knowledge_version |
  |----|------------|--------|--------|------------|-------------------|
  | False | False | unauthorized | `run_id` | `context_id` | `knowledge_version` |

  *deny*
`allow` =

| ok | authorized | reason | run_id | context_id | knowledge_version |
|----|------------|--------|--------|------------|-------------------|
| True | True | ok | `run_id` | `context_id` | `knowledge_version` |

*allow*

---
title: db/index
description: Open sqlite, init runs table, seed, sync bodies to data/runs/*.mq.md.
import web:ext/web/web.mq.md
import runs:runs.mq.md
import run:../lib/run.mq.md
---

## open

*root = > run.确保目录*
*db_url = "sqlite:" + `root` + "/qdagent.db"*
*store = > web.db url=`db_url`*
*fields = > runs.schema*
> `store`.init name=runs fields=`fields`
*rows = > store.select table="runs" limit=1*
1. `rows`
  > run.同步库 store=`store`
  **store**
2. *
  *seed = > runs.seed*
  > `store`.insert table=runs rows=`seed`
  > run.同步库 store=`store`
  **store**

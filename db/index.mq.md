---
title: db/index
description: Open sqlite; init runs + settings; seed; sync run bodies to disk.
import web:ext/web/web.mq.md
import runs:runs.mq.md
import settings:settings.mq.md
import run:../lib/run.mq.md
---

## open

*root = > run.确保目录*
*db_url = "sqlite:" + `root` + "/qdagent.db"*
*store = > web.db url=`db_url`*

*run_fields = > runs.schema*
> `store`.init name=runs fields=`run_fields`
*set_fields = > settings.schema*
> `store`.init name=settings fields=`set_fields`

*run_rows = > store.select table="runs" limit=1*
1. not `run_rows`
  *seed = > runs.seed*
  > `store`.insert table=runs rows=`seed`

*set_rows = > store.select table="settings" limit=1*
1. not `set_rows`
  *sseed = > settings.seed*
  > `store`.insert table=settings rows=`sseed`

> run.同步库 store=`store`
**store**

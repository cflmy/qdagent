---
类型: 端点
方法: POST
路径: /api/store/run
请求: json
响应: json
鉴权: user
title: api/store/run
description: Capture Endpoint — 沉淀一次对话/结论为 data/runs/*.mq.md。
导入 api:lib/api.mq.md
---

# main

请求 JSON 可含 `title` / `task` / `result` / `summary` / `slug` / `surface` / `session_id`（经 Binding 注入；亦接受整包 `payload`）。

*> api.capture payload=`payload` title=`title` task=`task` result=`result` summary=`summary` slug=`slug` surface=`surface` session_id=`session_id`*

---
markup: occlusion
title: 小模型记忆投影金样
import:
  memory: ../ext/root-skill/runtime/memory.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，不创建会话身份，也不执行模型输出。它直接调用生产 memory.render，检查从根状态投影的唯一 Markdown 摘录包含目标和最新用户输入，同时没有第二轮历史内容。由官方 Marqdo 编译器而非另外的 Python 提示解析器执行。

**state = > json.parse text="{\"revision\":7,\"phase\":\"intent\",\"goal\":\"设计求道小模型\",\"history\":[{\"id\":\"h0\",\"text\":\"旧历史不再回放\"},{\"id\":\"h1\",\"text\":\"最新用户要求简化上下文\"}],\"intent_tasks\":[{\"id\":\"research\",\"mode\":\"research\"}],\"pending\":null}"**.
**rendered = > memory.render state=`state`**.
We **good = text.contains(text=`rendered`,sub="设计求道小模型")**.
We **recent = text.contains(text=`rendered`,sub="最新用户要求简化上下文")**.
We **leaked = text.contains(text=`rendered`,sub="旧历史不再回放")**.
We **_ = test.assert(condition=`good`,message="missing goal")**.
We **_ = test.assert(condition=`recent`,message="missing latest input")**.
We **_ = test.assert(condition=(not `leaked`),message="old history leaked")**.
Return *"small-model-memory-projection-ok"*.

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

投影对应 docs/small-model-native-agent.mq.md 的 memory 约定：每个任务只有一份关键状态文稿，跨轮默认只注入它的有界摘录与最新输入。金样故意在历史里放置一条旧输入"旧历史不再回放"——若实现退回六轮历史拼接，leaked 断言会立即失败；这把"历史只供审计、不默认回灌"的约束变成可执行断言，而不是提示词里的口头约定。

state 由 json.parse 构造，字段与真实根状态一致：revision、phase、goal、history、intent_tasks 与 pending 都来自 state.mq.md 的真实保存结构。断言只检查文本包含与排除，不解析内部格式，因此任何等价的投影实现都能通过；真正的执行证据由 sync 的 ABI 原子写负责，本金样不重复那份验证。

运行方式与验收边界：`marqdo run tests/small-model-memory.mq.md --emit-result`，返回值必须逐字为 small-model-memory-projection-ok。这份金样不验证 token 预算、真实 Web 多轮恢复或 1B 模型成功率——那些属于 rollout 文档 G3/G6 关口的后续实测；静态契约由 tests/test_small_model_contract.py 另行把守。

**state = > json.parse text="{\"revision\":7,\"phase\":\"intent\",\"goal\":\"设计求道小模型\",\"history\":[{\"id\":\"h0\",\"text\":\"旧历史不再回放\"},{\"id\":\"h1\",\"text\":\"最新用户要求简化上下文\"}],\"intent_tasks\":[{\"id\":\"research\",\"mode\":\"research\"}],\"pending\":null}"**.
**rendered = > memory.render state=`state`**.
We **good = text.contains(text=`rendered`,sub="设计求道小模型")**.
We **recent = text.contains(text=`rendered`,sub="最新用户要求简化上下文")**.
We **leaked = text.contains(text=`rendered`,sub="旧历史不再回放")**.
We **_ = test.assert(condition=`good`,message="missing goal")**.
We **_ = test.assert(condition=`recent`,message="missing latest input")**.
We **_ = test.assert(condition=(not `leaked`),message="old history leaked")**.
Return *"small-model-memory-projection-ok"*.

---
markup: occlusion
title: 根调度依赖门禁金样
import:
  index: ../ext/root-skill/runtime/index.mq.md
  json: lib/json.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，不启动子任务进程，只调用生产 runtime/index.mq.md 的 dependencies_ready，核对有界 DAG 调度的依赖门禁语义。由官方 Marqdo 编译器执行，不另写 Python 调度模拟。

规范来自 docs/function-section-concurrency.mq.md 与宪法"最少但充分"：运行依赖不等于开发顺序，普通函数依据公开契约并行编写；研究和报告等必须取得真实资料的职责等待前置证据，前置缺失时不消耗模型请求，也不编造材料。金样把这三条约束变成可执行断言，而不是口头约定。

state 由 json.parse 构造，字段与真实根状态的 units 结构一致。依赖身份 data 故意没有任何证据记录：若实现把缺失的前置当成空数据继续调度，断言 research_blocked 会立即失败；若实现把普通函数也串行等待，assert code_parallel 会失败。无依赖的 document 单元必须与其它单元同一波就绪，assert document_ready 防止实现引入隐式串行。

本金样不验证 attempted 集合、八波上限、真实取消传播与多模型并发——那些需要真实子任务运行与用户并发设置，属于 rollout 文档 G5 的宿主实测部分；本样只固定调度门禁的纯函数语义。

**state = > json.parse text="{\"revision\":9,\"phase\":\"refine\",\"goal\":\"有界DAG\",\"units\":[{\"id\":\"writer\",\"mode\":\"code\",\"depends_on\":[\"data\"]},{\"id\":\"research\",\"mode\":\"research\",\"depends_on\":[\"data\"]},{\"id\":\"summary\",\"mode\":\"document\",\"depends_on\":[]}]}"**.
**ctx = > json.parse text="{\"id\":\"golden\",\"owner\":\"tester\",\"project\":\"/tmp\",\"root\":\"/tmp/golden-root\",\"workspace\":\"/tmp/golden-ws\"}"**.
**writer_item = > json.parse text="{\"id\":\"writer\",\"mode\":\"code\",\"depends_on\":[\"data\"]}"**.
**research_item = > json.parse text="{\"id\":\"research\",\"mode\":\"research\",\"depends_on\":[\"data\"]}"**.
**summary_item = > json.parse text="{\"id\":\"summary\",\"mode\":\"document\",\"depends_on\":[]}"**.
**writer = > index.dependencies_ready(context=`ctx`,state=`state`,item=`writer_item`)**.
**research = > index.dependencies_ready(context=`ctx`,state=`state`,item=`research_item`)**.
**summary = > index.dependencies_ready(context=`ctx`,state=`state`,item=`summary_item`)**.
We **_ = test.assert(condition=`writer`,message="code unit must not wait for runtime dependencies")**.
We **_ = test.assert(condition=(not `research`),message="research must wait when upstream evidence is missing")**.
We **_ = test.assert(condition=`summary`,message="independent unit must stay parallel")**.
Return *"root-dag-scheduling-ok"*.

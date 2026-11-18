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

三个单元的模式选择各有含义：writer（code）代表按公开契约即可动工的实现工作，research 代表必须拿到真实资料的职责，summary（document）代表无前置的独立产物。这正是小模型现场的常态——同一波里混合三类职责，只有"等待证据"这一类需要串行。金样同时把三个单元的判定的输入都设为同一份 state 快照，验证门禁是纯函数：不读文件、不发请求、不改状态，因此可以离线执行，也可以在真实宿主里逐波复用。

模式的语义边界也值得固定：mode 的判定表在 dependencies_ready 内部实现（code/document 立即就绪，research 及未知模式需要前置证据就绪）。若未来增加新模式或调整等待语义，必须先修改本段叙述与断言，再改实现——保持这份金样作为调度门禁的单一事实源。断言只检查布尔结果，不依赖错误消息文本，实现可以自由改进诊断，只要判定语义不变。

本金样不验证 attempted 集合、八波上限、真实取消传播与多模型并发——那些需要真实子任务运行与用户并发设置，属于 rollout 文档 G5 的宿主实测部分；本样只固定调度门禁的纯函数语义。八波上限与 attempted 集合属于波次推进器（主方案的执行层），不在 dependencies_ready 的输入里：这份门禁回答"这个单元现在能否开工"，波次推进器回答"下一波开工哪些、何时终止"。两层分离使门禁可以独立离线验证，也让波次推进器的实测故障不会污染门禁语义。

对宿主实测的承诺在此预登记：当 G5 的真实并发与取消传播在部署环境验证后，本样将追加"门禁判定与真实波次一致"的对照记录；在此之前，rollout 文档中 G5 的这两项保持"待实测"状态，不因本金样通过而宣布完成。这份克制来自宪法"真实失败保留未完成"——离线金样证明的是纯函数语义，不是真实模型环境的全部行为。执行方式与其它金样一致：`marqdo run tests/root-dag-scheduling.mq.md --emit-result`，返回值必须逐字为 root-dag-scheduling-ok。

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

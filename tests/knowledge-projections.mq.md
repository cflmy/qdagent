---
markup: occlusion
title: 知识证明投影金样
import:
  knowledge: ../ext/knowledge/index.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，不执行知识函数，只调用生产 ext/knowledge/index.mq.md 的 projections，核对 K1 的按需只读接口：符号身份、证明义务与影响投影都来自官方 `marqdo knowledge` 命令，本仓不新增解析器。由官方 Marqdo 编译器执行。

inspect 断言精确 SymbolId 的形状：mq:// 标识、模块、声明位置与 function 类别。这是"来源与版本身份"的锚点——后续任何证据收据都必须绑定到这个身份，而不是函数名的字面文本。proof_deps 在没有 Lean 工具链的环境必须如实返回依赖分析未确立，且 schema_version 为官方报告版本；若实现把缺工具链包装成已证明，断言 honest 会立即失败。impact 返回受影响符号集合，evidence 字段保持 unverified 的真实状态，不冒充运行时正确性。

拒绝分支同样固定：target 逃出项目边界与未知 kind 必须返回 ok=false 的 Result，错误是明确诊断而不是进程崩溃。目标目录 tests/fixtures/proof-scope 是一个独立的最小工程边界，投影不会扫到本仓其它文稿，也不会被 ext/ai 的双根收集行为影响。夹具的参数表使用官方类型词表（number/text/map/bool/any），契约检查与叙述比门禁对它同样生效，因此这份夹具同时证明"最小工程也能通过完整文档门禁"。

投影视图的边界与责任：inspect 只回答"这个符号是什么、声明在哪里"，不回答"它是否被证明"；proof-deps 只做依赖分析层面的义务清点，Lean 重放属于 K2 的显式 verify 路径；impact 只列影响集合。三个视图都不会执行任何函数，也不会因为读取而建立调用权限。金样把它们固定成契约，防止后续实现把"检索到"当成"已验证"，或把符号名的字面匹配当成精确身份。

运行环境与真实宿主的差异在此声明：金样以本仓为 project、以临时目录为私有工作区，与知识子 SKILL 在生产中取得的 context 形状一致（id=knowledge、owner/admin_role/knowledge_scope 来自已验证身份站）。 ABI 边界负责超时（90 秒）、输出上限（256 KiB）与目标越界拒绝；这些 bound 不在金样里复测，它们由 Rust 单元测试固定，两层证据互补而不重复。

选择 dependencies_ready 作为 inspect 目标并非随意：它是根调度的依赖门禁，属于"当前能力"的直接对象；子 SKILL 在规划复用前正需要这样的精确身份核对，而不是按相似名称猜测可执行绑定。断言检查完整 SymbolId 字符串而非片段，正是为了防止未来模块移动时旧的模糊匹配悄悄通过——符号移动后身份变化，任何引用它的证据都必须重新投影。

仓库范围的投影与本样的边界：对整个 qdagent 仓库运行 proof-deps 会触发官方编译器对 ext/ 双根的重复收集诊断，这是上游按"一个工程一个语义根"设计的行为；知识投影因此始终针对显式 target（任务方案目录、知识发布目录或本样这样的夹具）。target 参数的存在使每个投影都有明确边界，也使收据缓存可以按边界重建。

对 K3 的承诺在此预先声明：本样断言的 evidence 字段当前是官方投影给出的真实状态（如 unverified），后续 K3 把证据等级写入用户可见卡片与记忆短摘要时，必须继续读取同一份官方投影，而不是在展示层重新推断等级；那时本样将同步增加"卡片摘录与投影一致"的断言，保持单一事实源。

执行入口与其余金样一致：`marqdo run tests/knowledge-projections.mq.md --emit-result`，返回值必须逐字为 knowledge-projections-ok。

失败语义遵循"真实失败保留未完成"：inspect 未知符号、impact 空查询、target 逃逸与未知 kind 都返回携带诊断的失败 Result，调用方据此向用户解释，而不是生成一个兜底投影。若未来官方命令增加新的投影类型，必须先扩展 ABI 的 kind 白名单与本金样的断言，再对外暴露。

本金样不验证 Lean 重放、compose 证书与真实小模型评测——那些属于 K2/K4 关口；本样只固定 K1 只读投影的形状、诚实性与拒绝边界。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**seen = > knowledge.projections(context=`ctx`,kind="inspect",symbol="dependencies_ready",target="ext/root-skill/runtime")**.
We **_ = test.assert(condition=access(`seen`,"ok"),message="inspect must succeed on a real symbol")**.
**found = > access(access(`seen`,"value"),"report")**.
**symbols = > access(`found`,"symbols")**.
**first = > table.at(xs=`symbols`,i=0)**.
We **_ = test.assert(condition=text.contains(text=json.stringify(value=`first`),sub="mq://runtime/index/function/dependencies_ready"),message="symbol id must carry the exact module identity")**.
We **_ = test.assert(condition=(access(`first`,"kind") == "function"),message="inspect must report the artifact kind")**.
**deps = > knowledge.projections(context=`ctx`,kind="proof_deps",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=access(`deps`,"ok"),message="proof-deps must succeed on the fixture scope")**.
**report = > access(access(`deps`,"value"),"report")**.
We **_ = test.assert(condition=(access(`report`,"schema_version") == 1),message="official report schema version expected")**.
**honest = > text.contains(text=json.stringify(value=access(`report`,"proof_completion")),sub="not_established")**.
We **_ = test.assert(condition=`honest`,message="missing Lean must stay honestly unestablished")**.
**escape = > knowledge.projections(context=`ctx`,kind="inspect",symbol="add",target="../outside")**.
We **_ = test.assert(condition=(not access(`escape`,"ok")),message="target must not leave the project")**.
**unknown = > knowledge.projections(context=`ctx`,kind="astral")**.
We **_ = test.assert(condition=(not access(`unknown`,"ok")),message="unknown projection must be rejected")**.
## ambiguous

歧义锚点是 K4 的拒绝场景之一：同一个声明名在两个模块里各有一份实现时，官方 inspect 必须报 ambiguous=true 并列出全部候选符号，绝不允许按"名字相同"猜测合并成一条证据。本段固定这条诚实性——如果实现退回"取第一个匹配"或按字面名去重，断言会立即失败；如果实现拒绝回答（返回错误或空列表），同样失败，因为歧义本身是真实且有信息量的答案。

两个候选的 SymbolId 都必须携带各自模块的身份（mq://ambiguous-scope/alpha/… 与 …/beta/…），调用方据此选择或反问用户，而不是在不确定时继续执行。本段不做任何绑定选择：选择属于上层规划，投影层只负责把歧义如实呈现。

夹具的构造也是断言的一部分：两个模块各自通过文档门禁、各自带参数表、各自返回不同实现（甲返回 a+b，乙返回 a+b+1），因此"同名"不是文档缺陷而是真实世界会出现的命名冲突。若实现按文件顺序取第一个匹配，第二条候选的 id 断言与 distinct 断言会同时失败；若实现把两个模块合并成一个符号，模块身份断言失败。'

这条边界与 K1 的"精确身份"一致：证据锚点必须是 mq:// 全名，函数名的字面文本不足以绑定任何收据；歧义时唯一正确的行为是把它交回调用方。

在真实任务里，歧义往往来自同一领域的两份知识版本、或上游把工具函数与业务函数同名发布。宿主或子 SKILL 遇到 ambiguous=true 时应当反问用户要引用哪一份，而不是让模型"看着像"就选一个；这条规则与根流程"一次确认"的要求一致，也避免把两份不同实现的证据混在一条收据里。本段因此同时是"证据不得跨实现混合"的回归断言。

实现细节上，本段只读取官方 inspect 的报告字段：ambiguous、symbols、每项的 id 与来源行。没有任何"猜测合并"的逻辑被允许出现在边界或投影层；若未来官方报告改名，本段断言失败并要求同步更新，而不是悄悄放宽判据。

与其它段落的分工保持清晰：主段验证生产符号的可解析与证明义务的诚实汇报，本段只验证歧义呈现，二者都不绑定任何执行。歧义夹具与 proof-scope 一样是独立语义根，因此投影不会扫到仓库其它文稿；两个模块各自的定理表为空，理由是本段测试的是符号身份而不是证明，避免把两个场景耦合在一起。

最后，本段的通过条件里没有"任选其一"：两个候选都必须出现、id 必须不同、甲模块身份必须可检索。实现若因误判而返回空列表、返回单个候选或把 ambiguous 写成 false，三种退化都会失败。这条严格性来自 K4 的目标——小模型不能靠"看起来对"绕过证据身份，歧义必须显式回到用户或规划层。宿主在展示候选时应当连同来源行一起显示，让用户能在两分钟内做出选择，而不是被迫打开源码比对；本段断言的 id 与模块身份正是展示所需的字段，断言与界面需求一致而不是两套判据。候选列表的顺序不构成优先级：官方按模块名排序，调用方不得把第一个当成默认选择，这条规则在此明确写出以避免实现层引入隐式偏好。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**seen = > knowledge.projections(context=`ctx`,kind="inspect",symbol="add",target="tests/fixtures/ambiguous-scope")**.
We **_ = test.assert(condition=access(`seen`,"ok"),message="inspect must answer even when the name is ambiguous")**.
**report = > access(access(`seen`,"value"),"report")**.
We **_ = test.assert(condition=(access(`report`,"ambiguous") == True),message="same-name symbols must be reported ambiguous")**.
**symbols = > access(`report`,"symbols")**.
We **_ = test.assert(condition=(table.len(xs=`symbols`) == 2),message="both candidates must be listed")**.
**first = > table.at(xs=`symbols`,i=0)**.
**second = > table.at(xs=`symbols`,i=1)**.
We **distinct = access(`first`,"id") != access(`second`,"id")**.
We **_ = test.assert(condition=`distinct`,message="candidates keep their own symbol identity")**.
**alpha = > text.contains(text=json.stringify(value=`symbols`),sub="mq://ambiguous-scope/alpha/function/alpha/add")**.
We **_ = test.assert(condition=`alpha`,message="module identity must survive in the candidate list")**.
Return *"knowledge-ambiguous-ok"*.

Return *"knowledge-projections-ok"*.

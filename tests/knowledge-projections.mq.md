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
Return *"knowledge-projections-ok"*.

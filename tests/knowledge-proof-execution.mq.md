---
markup: occlusion
title: 知识证明执行金样
import:
  knowledge: ../ext/knowledge/index.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  time: lib/time.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，也不强制要求安装 Lean 工具链。它通过生产 ext/knowledge/index.mq.md 的 lean_environment、compose_proof、replay_proof 与 proof_job 驱动真实 ABI 边界，并按环境实际分支：有 Lean 时断言三模块组合证书被内核复核且可独立重放；无 Lean 时断言官方诊断逐字上浮、绝不包装成成功或占位证书。由官方 Marqdo 编译器执行。

组合夹具 tests/fixtures/proof-modular 照搬上游三模块可证形状：叶模块纯算术加一、复合模块两次顺序调用、调用方带正负分支，三个定理都需要 Lean 内核判定。等级词表与判定全部来自官方命令输出，本边界只做超时、输出上限、越界拒绝与缓存隔离，不新增任何证明相关解析器。

拒绝语义在两层环境都固定四个可注入面：replay 缺失证书明确失败；证书路径越出私有缓存被拒绝（禁止任意文件读取）；compose 目标越出项目被拒绝；未知作业身份明确失败。这正是"拒绝先于证据"的体现：任何证书先证明自己来自受控边界，才有资格被重放。K4 的"篡改源码后重放被拒"由实际改动夹具内容复现，属于 K4 场景，本样不破坏仓库文件。

环境探测只回答"能否启动 lean"，不声称任何定理成立；分支的选择由这个事实决定，而不是由调用方希望的结果决定。若探测本身失败，金样立即失败——边界的不确定性不能变成"按未安装处理"的兜底。两段证据路径各自独立成段，主段只保留共享拒绝项，避免任何一段的代码量掩盖另一段的断言。

共享拒绝项的断言顺序也有含义：先 replay 缺失证书，再 replay 越界路径，最后 compose 越界目标与未知作业。越界检查先于文件存在性，因此 "../../etc/passwd" 这类路径在触碰任何内容之前就被拒绝；缺失证书使用缓存内相对路径，证明"路径合法但文件不存在"也是明确失败而不是静默返回空报告。这两条合起来固定了证书注入面的边界：既不能读任意文件，也不能把缺失当成未验证通过。

执行方式：`marqdo run tests/knowledge-proof-execution.mq.md --emit-result`，返回值必须逐字为 knowledge-proof-execution-ok。金样不验证 1B/3B 模型决策与真实浏览器交互，那些属于 K4 与部署验收。

组合夹具本身也是证据：三个模块各自携带定理、彼此以 import 声明依赖，调用方包含正负分支；这与真实知识编译产物的形状一致，而不是为测试特制的单文件玩具。因此在这份夹同上通过的 compose/replay，证明的是"受限 ABI 能驱动官方组合证明"，而不是"本仓能对某个特例造假"。缓存目录由宿主工作区派生，同一次运行的所有证书都落在私有路径内，可随时删除重建。

主段最后一条约束针对复用：共享拒绝项只断言一次，两段环境路径各自断言完整证据，避免同一断言散落在多处而在修改时遗漏。若后续增加新的拒绝面（例如作业身份大小写或路径规范化差异），应加入主段而不是分支段——拒绝语义与环境无关，证据语义才按环境分支。这条组织规则也约束未来重构：新增环境维度（例如另一个证明后端）时，应新增独立分支段而不是在主段内堆叠条件，使每段证据都能被单独阅读与验证。

主段同时是"入口唯一"的体现：金样只从 `## main` 进入，环境分支通过同文档函数调用完成，不新增命令别名或参数协议；这与生产根入口的约束一致——模型只看到入口函数，分支语义由文稿内部表达。共享拒绝项放在分支之后执行，保证无论走哪条环境路径，越界与缺失证书都不会被跳过。四类拒绝项的断言文本都直接引用边界给出的诊断，而不是重新描述错误原因，因此实现改进诊断时金样无需跟着改文案。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**env = > knowledge.lean_environment(context=`ctx`)**.
We **_ = test.assert(condition=access(`env`,"ok"),message="lean detection must answer without error")**.
We **installed = access(access(`env`,"value"),"installed")**.
1. `installed`
  **proved = > proof_with_lean(context=`ctx`)**.
  We **_ = test.assert(condition=`proved`,message="Lean-composition proof path must pass")**.
2. *
  **honest = > proof_without_lean(context=`ctx`)**.
  We **_ = test.assert(condition=`honest`,message="no-Lean honest-failure path must pass")**.
**missing = > knowledge.replay_proof(context=`ctx`,certificate="absent/certificate.json",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`missing`,"ok")),message="replay of a missing certificate must fail clearly")**.
**escape = > knowledge.replay_proof(context=`ctx`,certificate="../../etc/passwd",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`escape`,"ok")),message="certificate paths must stay inside the private cache")**.
**unknown = > knowledge.compose_proof(context=`ctx`,target="../../outside")**.
We **_ = test.assert(condition=(not access(`unknown`,"ok")),message="compose target must not leave the project")**.
**ghost = > knowledge.proof_job(context=`ctx`,action="status",job="job-ghost")**.
We **_ = test.assert(condition=(not access(`ghost`,"ok")),message="unknown job identity must fail clearly")**.
Return *"knowledge-proof-execution-ok"*.

## proof_with_lean

Lean 环境下的成功路径：compose 必须对三模块夹具产出 status=lean_kernel_proved_model、grade=model_proved 的证书；replay 必须独立复核出 kernel_replayed=true 并确认当前源码一致；同一证书不能套用到另一个语义根。等级词表与判定全部来自官方命令输出，本段只断言"不退化"：若实现停止调用官方 compose、改写状态词表或把空结果冒充证明，这里的断言会立即失败。

组合证书的产物路径由官方报告给出，位于私有缓存目录内；replay 通过 ABI 接受缓存内绝对路径，越出缓存的路径先被拒绝再谈内容。`full_marqdo_runtime_semantics_proved` 必须为 false——任何组合证明都不得声称覆盖完整运行时语义。异步路径用 settle 有界轮询，作业以 done 结束时携带同形报告；若作业在固定轮次内未结束，断言失败暴露环境异常而不是静默通过。

`not_execution_authority` 为 true 的断言同样重要：证书只增加一个证据维度，不授予执行权，也不能绕过上传安全、人工确认与验收门禁。这段成功路径与无 Lean 段的失败路径互为镜像——同一个接口在两种环境下都必须如实反映能力，而不是由本仓推断。

断言分组按证据链的四段组织：shape_ok 检查报告外壳（schema 版本与"不声称完整运行时语义"）；kernel_ok 检查判定本身（官方状态词与证据等级）；authority_ok 检查权限维度（证书不是执行授权）；replay_ok 检查独立复核（重放成功且当前源码已验证）。四段任何一段退化都会让对应的组合条件失败，消息文本说明是哪一段；这种分组避免了二十条散乱断言淹没在代码里，也让每段断言与上方的叙述一一对应。

镜像之外的第三类断言是"错配拒绝"：同一份证书套用到另一个语义根（proof-scope 只含加一函数、没有组合依赖）必须失败。它证明 replay 不是只看证书内部自洽，而是把证书与当前语义根绑定；K4 的篡改源码场景正是这一条的强化版，由实际改动夹具内容在部署环境复现。异步 done 断言则证明作业面与同步面共享同一套官方判定，而不是另一条未经证明的捷径。

断言为何不能只看"命令退出码为零"：官方 compose 在结果为空时也返回零，把空结果当成功会让本段在无证明能力的环境里误报通过。因此 shape_ok 之外还必须断言 results 非空、首个结果的状态词与等级词，以及 full_marqdo_runtime_semantics_proved 为 false——三者合起来才能区分"真证明"与"零结果"。证书内容本身由官方命令负责校验，本样只断言边界如实转述，不复制官方判定逻辑。

replay 的断言同样分两层：先断言 ABI 调用成功，再断言报告里的 kernel_replayed 与 current_source_verified 为 true。前者只说明命令跑通，后者才说明内核复核真实发生；两层都用官方字段而不是本仓推断。若未来官方报告字段改名，本段断言失败并要求同步更新文档与实现，而不是让边界悄悄跟随上游漂移。

这段成功路径与无 Lean 段共同构成"环境完备性"：同一份源码、同一份接口、两种工具链状态，各自得到可复核的答案。任何环境缺失都不会被静默降级为"看起来通过"——这正是小模型场景最需要的性质，因为模型无法判断"为空"与"通过"的区别，只能依赖边界的如实转述。组合证明的产物只写入私有缓存，不进入已发布知识，也不改变任何门禁的放行与否；证据等级与执行权限的分离由 authority_ok 单独固定。

最后说明本段在 K2 验收中的位置：K2 要求"只有有可信输出才填证书字段"。本段的每一项断言都只读取官方输出，没有任何字段由本仓补写；compose 的空结果、replay 的失败都与成功一样被如实转述。因此本段通过不等于任何具体知识的正确性被证明，只意味着该边界在 Lean 环境下的证明与重放链路按官方语义工作。

超时与预算同样属于本段契约的一部分：compose 与 replay 都传入 240 秒上限，ABI 再把输出截断在 256 KiB 并拒绝越界路径；因此本段在慢机器上会以真实超时失败而不是无限等待，在恶意夹具上会以边界拒绝失败而不是读取任意文件。把这些参数显式写进金样，是为了让"证明执行有界"成为可复核的事实，而不是部署时的口头约定。

同一份上下文契约在本段被复用为身份边界：context 由金样构造但形状与生产宿主一致（id=knowledge、owner、admin_role、knowledge_scope、project、workspace），ABI 只接受这份上下文里的 project/workspace，模型提交的路径无法越过项目根。证明执行的权限因此不高于阅读：compose 只能写私有缓存，replay 只能读私有缓存内的证书，两者都不能修改已发布知识或根状态。

如果未来扩展证明后端（例如另一个内核），本段的期望形状应保持"官方状态词 + 官方证据等级 + 独立重放"三件套不变，仅新增对应的环境分支；这保证金样不会因为后端变化而整体失效，也不会让新后端绕过证据与权限的分离。每次改动都必须先更新本段叙述，再改实现与断言——文档先行是本仓的既定规则。证据等级永远只是数据属性：同一份证书在不同权限的调用者眼里等级相同，可执行范围仍由插件与用户授权决定。证书里记录的源码摘要与闭包摘要同时把证据绑定到具体版本：源码一旦变化，旧证书在重放时被拒绝，而不是继续以旧等级示人。同一份证书在不同语义根之间的错配也被拒绝，二者合起来说明证据具有作用域，而非全局有效。作用域之外的一律按未验证处理，这条规则由官方 replay 独立执行，边界只负责把结论如实带回。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**composed = > knowledge.compose_proof(context=`ctx`,target="tests/fixtures/proof-modular",timeout=240)**.
We **_ = test.assert(condition=access(`composed`,"ok"),message="compose with Lean must succeed")**.
**report = > access(access(`composed`,"value"),"report")**.
**results = > access(`report`,"results")**.
**first = > table.at(xs=`results`,i=0)**.
**evidence = > access(`first`,"evidence")**.
We **shape_ok = access(`report`,"schema_version") == 1 and access(`report`,"full_marqdo_runtime_semantics_proved") == False**.
We **kernel_ok = access(`first`,"status") == "lean_kernel_proved_model" and access(`evidence`,"grade") == "model_proved"**.
We **authority_ok = access(`evidence`,"not_execution_authority") == True**.
We **_ = test.assert(condition=`shape_ok`,message="report schema version expected and no full-semantics claim")**.
We **_ = test.assert(condition=`kernel_ok`,message="official proof status and grade must be kernel-proved")**.
We **_ = test.assert(condition=`authority_ok`,message="evidence must not claim execution authority")**.
**artifact = > access(`first`,"artifact")**.
**replayed = > knowledge.replay_proof(context=`ctx`,certificate=`artifact`,target="tests/fixtures/proof-modular",timeout=240)**.
We **_ = test.assert(condition=access(`replayed`,"ok"),message="certificate must replay independently")**.
**replay_report = > access(access(`replayed`,"value"),"report")**.
We **replay_ok = access(access(`replay_report`,"evidence"),"kernel_replayed") == True and access(`replay_report`,"current_source_verified") == True**.
We **_ = test.assert(condition=`replay_ok`,message="replay must show kernel_replayed on the current source")**.
**mismatch = > knowledge.replay_proof(context=`ctx`,certificate=`artifact`,target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`mismatch`,"ok")),message="a certificate must not apply to a different semantic root")**.
**started = > knowledge.proof_job(context=`ctx`,action="start",proof="compose",target="tests/fixtures/proof-modular")**.
We **_ = test.assert(condition=access(`started`,"ok"),message="async start must succeed")**.
**job = > access(access(`started`,"value"),"job")**.
**state = > settle(context=`ctx`,job=`job`)**.
We **_ = test.assert(condition=(`state` == "done"),message="async compose with Lean must land in done")**.
Return *True*.

## proof_without_lean

无 Lean 环境下的诚实失败路径：compose 与异步作业都必须以官方 proof.compose_lean_missing 诊断失败，缺工具链是环境事实而不是被隐藏的错误。诊断逐字包含官方错误码，而不是本仓改写的提示——错误码是契约，部署环境的自动化与用户界面都按官方码分支，边界改写或吞掉它会让"无 Lean"与其它失败不可区分。

同一环境下的降级行为也固定：不产出部分证书、不写入任何占位证明、异步作业以 failed 结束并携带同一诊断。若实现把缺 Lean 包装成成功或返回空报告冒充完成，本段的断言与有 Lean 段的成功断言会从两个方向同时失败。

诊断原文比错误类别更能约束实现：断言检查子串 compose_lean_missing，而不是笼统的"失败"或自定义文案。官方错误码是部署自动化的分支依据，也是用户看到的解释来源；改写它等于把"缺 Lean"降级成不可区分的未知错误。异步作业的同一诊断同样必须原样传递，证明作业面没有自己的错误改写层。

本段与有 Lean 段共享同一个 context 契约（id=knowledge、owner、admin_role、knowledge_scope、project、workspace）：身份和数据边界由宿主注入，模型或金样都不能自带更高权限。两段合起来构成 K2 的环境完备性证据：同一份接口在两种环境下给出相反但不矛盾的诚实答案。

无 Lean 时的可用能力也被清晰限定：依赖分析（proof-deps）仍可运行并报告未解义务，compose/replay 明确不可用，异步作业如实失败。用户因此看到的是"能做什么、缺什么"的完整图景，而不是一个笼统的"不可用"。这段语义与部署文档中的"未验证"清单一一对应：装好 Lean 之后，同一份声明自动升级为可验证，而不是需要重新设计接口。宿主层若要在界面上展示证明状态，应直接读取这些官方状态词，不在前端重新推断等级。异步作业的 failed 态携带 err 尾部，因此用户能看到官方给出的缺失原因原文，而不是本仓的一句"证明失败"；这条与有 Lean 段的 done 态对称，构成作业面在两个环境下的完整语义。若宿主需要向用户解释"为什么不能证明"，应引用这段原文而不是重新措辞；重新措辞会掩盖真实原因，也与官方错误码的分支逻辑冲突。本段因此同时是"诊断不被改写"的回归测试。

同步与异步两条失败路径的断言内容刻意保持同形：同一诊断、同一状态词、同一错误通道；这样实现若只修好其中一条，另一条会立刻暴露。金样不以"至少一条路径正确"为通过条件，而是要求两条路径都引用官方原文——异步层不允许把失败改写成"作业未知"或"超时"，同步层也不允许把缺 Lean 折叠成通用错误。

环境分支的读取顺序在此明确：先探测、再分支、最后执行共享拒绝项。探测失败即金样失败，不会因为"读不到环境"而误走无 Lean 路径；分支函数返回布尔值，主段对其断言，因此分支内部的失败不会被吞掉。这条顺序使金样在任何机器上都给出确定结论：要么 Lean 路径完整通过，要么无 Lean 路径完整通过，不存在部分通过的状态。部署 CI 若同时要覆盖两种环境，应分别在有无 Lean 的镜像里运行同一份金样，而不是修改金样本身——金样是契约，环境是变量；同一份断言文本在两种镜像里必须逐字运行，而不是各自维护一份分叉副本。

**ctx = > json.parse text="{\"id\":\"knowledge\",\"owner\":\"tester\",\"admin_role\":\"admin\",\"knowledge_scope\":\"public\",\"project\":\"/workspace/qdagent\",\"workspace\":\"/tmp/golden-knowledge\",\"root\":\"/tmp/golden-knowledge\"}"**.
**composed = > knowledge.compose_proof(context=`ctx`,target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=(not access(`composed`,"ok")),message="compose without Lean must fail honestly")**.
**error = > access(`composed`,"error")**.
**diagnostic = > access(`error`,"message")**.
We **lean_missing = text.contains(text=`diagnostic`,sub="compose_lean_missing")**.
We **_ = test.assert(condition=`lean_missing`,message="official lean diagnostic must surface verbatim")**.
**started = > knowledge.proof_job(context=`ctx`,action="start",proof="compose",target="tests/fixtures/proof-scope")**.
We **_ = test.assert(condition=access(`started`,"ok"),message="async start must succeed")**.
**job = > access(access(`started`,"value"),"job")**.
**state = > settle(context=`ctx`,job=`job`)**.
**failed = > knowledge.proof_job(context=`ctx`,action="status",job=`job`)**.
We **job_error = access(access(`failed`,"value"),"error")**.
We **async_honest = text.contains(text=`job_error`,sub="compose_lean_missing")**.
We **_ = test.assert(condition=(`state` == "failed"),message="no-Lean async job must land in failed")**.
We **_ = test.assert(condition=`async_honest`,message="async failure must carry the official diagnostic")**.
Return *True*.

## settle

有界轮询一个证明作业直到它离开运行态：每次先睡 200 毫秒再查询，最多 `rounds` 轮，返回最终状态词（running/done/failed/cancelled 之一）。小模型按"一次一个动作"使用 proof_job，本函数只是金样的确定性等待器，不代替宿主轮询，也不解释状态含义。

睡眠属于 process.control 效应，金样在测试中显式使用；生产小模型不直接睡眠等待，而是由用户或调度恢复。若作业在轮次内未结束，返回 running 让调用方断言失败——环境异常必须暴露而不是静默通过。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信所有者 |
| job | text | required | 作业身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 最终状态词 |

Use `context`, `job`。

We **state = "running"**.
**rounds = > json.parse text="[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]"**.
- [有界轮询，最多三十次](for `rounds` as round)
  1. `state` == "running"
    We **_ = time.sleep_ms(ms=200)**.
    **polled = > knowledge.proof_job(context=`context`,action="status",job=`job`)**.
    We **state = access(access(`polled`,"value"),"state")**.
Return *`state`*.

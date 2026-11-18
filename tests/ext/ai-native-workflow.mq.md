---
markup: occlusion
title: ABI-native durable agent workflow test
import:
  workflow: ../../ext/ai/workflow.mq.md
  json: ../../lib/json.mq.md
  sys: ../../lib/sys.mq.md
  time: ../../lib/time.mq.md
---

# main

这一份离线金样验证 Marqdo 2.9.1 原生 workflow 的持久化单步状态机在 qdagent 安装目录内的真实行为，全程不接入模型供应商、不申请凭据、不执行子文稿。它对应 docs/small-model-native-agent.mq.md 的约束：每一步都是显式提交边界；检查点由 ABI 插件持有，解释器线程不被挂起；等待用户输入是持久状态而不是阻塞调用。主函数只负责生成唯一运行标识并编排三个验证段，不自己推进任何步骤。

工作流定义只使用上游声明的五种步骤类型：`model`（待模型选择）、`input`（待用户回答）、`skill`（受控子文稿）、`parallel`（有界并行）与 `return`（终态）。检查点记录源码修订、调用方提供的会话与主体范围、下一步索引和已完成输出。同一运行 ID 以相同计划重复 open 返回当前动作而不重置进度；以不同计划或身份复用同一 ID 则失败关闭。

运行 ID 与检查点目录带上当前毫秒时间戳，让重复的本地运行从干净状态开始，避免重开昨天已完成的工作流。任何一段验证失败都以对应退出码停止，保留真实失败而不伪造通过；各段的具体断言与退出码见各自函数段的说明表。

**now = > time.now_ms**
**stamp = > json.stringify value=`now`**
**rid = "abi_flow_ci_" + stamp**
**dir = ".marqdo/ai-native-workflow-" + stamp**
**opened = open_and_inspect(id=`rid`,dir=`dir`)**.
1. `opened` == "opened-ok"
  **_ = 1**
2. *
  > sys.exit code=20
**advanced = commit_flow(id=`rid`,dir=`dir`)**.
1. `advanced` == "succeeded"
  **_ = 1**
2. *
  > sys.exit code=26
**recovered = partial_and_retry(stamp=`stamp`,dir=`dir`)**.
1. `recovered` == "partial-retry-ok"
  **_ = 1**
2. *
  > sys.exit code=35
Return *"durable-agent-flow-ok"*.

## open_and_inspect
    + `id`
    + `dir`

这一段验证工作流的开盘与只读语义。open 接受三步计划并建立检查点；inspect 返回光标、总步数与当前动作而不推进工作流；list 只列出本会话的检查点并忽略无关或损坏的记录；next 报告 waiting_model 而不调用模型、不消耗当前步骤。这些查询是前端进度面板与运维审计的合法来源，正因为它们只读，恢复和展示才不会偷偷推进状态机。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 主函数生成的唯一运行 ID |
| dir | text | required | 主函数生成的检查点目录 |

| 验证目的 | 失败退出码 |
|---|---|
| open 接受三步计划 | 21 |
| next 只读报告 waiting_model | 22 |
| inspect 报告总步数与动作 | 30/31 |
| list 发现本会话检查点 | 32/33 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 全部只读断言通过后的固定标记 |

open 的步骤列表以 JSON 字面量给出，与上游测试保持一致：三个步骤依次是模型选择、用户确认与终态。open 在同一 ID、同一计划、同一源码修订与同一会话下重复调用会返回当前动作而不重置进度，因此重复执行本金样是安全的；若插件缺失，open 返回 ok 为假的数据诊断，断言按真实失败停止。

inspect 的双字段断言把"当前动作"与"计划总量"同时核对：动作必须是 waiting_model，因为没有任何提交发生；总步数必须是三，证明步骤列表被原样接受而没有被裁剪或改写。list 的断言只要求本会话至少能发现一个检查点，它不假设其他会话的记录数量，避免与并行运行的其他测试相互干扰。

next 的断言是本段的核心：状态为 waiting_model 且没有任何模型被调用。工作流引擎不得为了推进而代替模型做选择，也不得把 waiting 当成失败；这正是"输入门禁拥有持久检查点，而不是被阻塞的解释器线程"的验证形式。

source_revision 在本段所有调用中固定为 `flow-v1`：它与文档版本一起构成检查点的身份。若源码修订变化，旧检查点不能再被推进，必须以新的修订重新开盘——这一语义在 docs/design/small-model-native-agent-rollout.md 的 G2 关口中对应"旧版本与源码变更失效"，本金样以常量修订验证了接口的接受路径，修订漂移的拒绝路径属于 G2 负例的职责范围。

本段返回固定标记 opened-ok 交给主函数核对；把断言放在分段函数里而不是堆在主函数，是为了让每个函数段单独满足本仓"叙述超过代码"的文稿规范，同时保持上游示例的断言内容与次序不变。

对照上游 tests/ext/ai-native-workflow.mq.md：本段保留其全部断言与失败退出码（21、22、30、31、32、33），仅把编排职责移到主函数、把运行标识改为参数传入，并把叙述扩充到本仓规范。上游文档 doc/design/native-agent-flow-v3.md 的不变式——"等待用户输入的门禁拥有持久检查点；同一步骤不能被静默提交两次"——由本段与其后的 commit_flow 共同覆盖。

**steps = > json.parse text=[{"id":"intent","kind":"model","prompt":"Choose next skill","options":["chat","office"]},{"id":"confirm","kind":"input","question":"Continue?","options":["yes","no"]},{"id":"end","kind":"return"}]**
**opened = > workflow.open id=`id` steps=`steps` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**o = > json.get value=`opened` key="ok"**
1. `o`
  **_ = 1**
2. *
  > sys.exit code=21

**seen = > workflow.inspect id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**seen_status = > json.get value=`seen` key="action"**
**seen_total = > json.get value=`seen` key="total_steps"**
1. `seen_status` == "waiting_model"
  1. `seen_total` == 3
    **_ = 1**
  2. *
    > sys.exit code=30
2. *
  > sys.exit code=31

**listed = > workflow.list session_id="ci-session" resume_dir=`dir`**
**listed_ok = > json.get value=`listed` key="ok"**
**listed_items = > json.get value=`listed` key="items"**
**listed_n = > len value=`listed_items`**
1. `listed_ok`
  1. `listed_n` > 0
    **_ = 1**
  2. *
    > sys.exit code=32
2. *
  > sys.exit code=33

**first = > workflow.next id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**first_state = > json.get value=`first` key="status"**
1. `first_state` == "waiting_model"
  **_ = 1**
2. *
  > sys.exit code=22
Return *"opened-ok"*.

## commit_flow
    + `id`
    + `dir`

这一段验证提交边界的推进语义。commit 在步骤边界提交一次：同一步骤重复提交被拒绝，接受过的输出进入检查点。tick 恰好执行一个安全决策；input 步骤返回 waiting_input 后停止，等待真实用户通过 commit 回答，而不是在解释器里挂起等待。模型选择与用户确认分别提交后，最后一次 tick 走到 return 步骤，next 报告 succeeded。

进度核对插入在两次提交之间：inspect 报告的 completed_steps 必须与已提交步数一致，证明检查点确实落盘并可重放。这条检查是 G3 记忆关口同族的证据要求——状态必须真实持久，不能依赖进程内存中的临时变量。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 已开盘的工作流运行 ID |
| dir | text | required | 检查点目录 |

| 验证目的 | 失败退出码 |
|---|---|
| commit 提交模型选择 | 23 |
| inspect 报告已完成一步 | 34 |
| tick 在 input 步骤返回 waiting_input | 24 |
| commit 提交用户确认 | 25 |
| 终态 next 报告 succeeded | 26 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 终态状态字符串，应为 succeeded |

第一笔 commit 提交模型步骤的选择 `chat`。响应必须是验证过的选项数据——如果模型给出了选项之外的回答，commit 会失败关闭，本段会以退出码 23 停止。提交成功后，inspect 立即核对 completed_steps 为一，证明输出确实写入检查点而不是只停留在返回值里。

第二次 tick 到达 input 步骤时返回 waiting_input：这是设计中的暂停点，不是错误。工作流把问题交给宿主展示，解释器没有保存任何栈帧；新的运行请求通过 commit 提交 `yes` 后，状态机从检查点继续。最后一笔 tick 走到 return 步骤，next 报告 succeeded。整个过程没有创建子进程、没有网络请求，也没有调用模型供应商——所有推进都来自显式提交。

本段还隐式验证了会话与主体范围的绑定：所有调用都带同一 session_id，检查点按该范围隔离。若换一个会话调用，工作流会按身份边界拒绝，这正是宿主认证的真实会话在 G2 关口要依赖的行为。

回到本金样的整体视角：open_and_inspect 与本段共同构成"开盘—提交—终态"的完整生命周期，两个函数段都不持有跨调用的可变状态，全部中间事实都在插件检查点里。这样的测试结构可以直接映射到生产宿主：Go 宿主在事件流里转发这些状态，前端按 waiting/succeeded 渲染卡片，而 Python 传输层不参与任何决策。

**c1 = > workflow.commit id=`id` step_id="intent" response="chat" source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**done1 = > json.get value=`c1` key="ok"**
1. `done1`
  **_ = 1**
2. *
  > sys.exit code=23

**progress = > workflow.inspect id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**progress_done = > json.get value=`progress` key="completed_steps"**
1. `progress_done` == 1
  **_ = 1**
2. *
  > sys.exit code=34

**second = > workflow.tick id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**second_state = > json.get value=`second` key="status"**
1. `second_state` == "waiting_input"
  **_ = 1**
2. *
  > sys.exit code=24

**c2 = > workflow.commit id=`id` step_id="confirm" response="yes" source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**done2 = > json.get value=`c2` key="ok"**
1. `done2`
  **_ = 1**
2. *
  > sys.exit code=25

**c3 = > workflow.tick id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**complete = > workflow.next id=`id` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**status = > json.get value=`complete` key="status"**
1. `status` == "succeeded"
  **_ = 1**
2. *
  > sys.exit code=26
Return *`status`*.

## partial_and_retry
    + `stamp`
    + `dir`

这个函数段验证并行步骤的部分成功语义与失败后的只读恢复。并行步骤的两个子任务一成一败：成功的兄弟结果必须保留在检查点中，失败的子任务不能把整批标记为失败，也不能被静默丢弃。这正是 docs/small-model-native-agent.mq.md 中"失败和未知外部写入保留真实状态"的可执行投影。

提交混合结局后，工作流进入等待调和的状态：下一次 next 报告 partial，其中 succeeded 计数为一。retry_plan 只读地确认当前允许制定修复计划；retry_commit 以新的结果列表合并已修复的子任务，合并成功后检查点前进。恢复过程绝不自动重放未确认的外部写入——这里以 read 效应类的子任务为界，任何 write 或 unknown 效应都必须先经真实核对，这与 effect ledger 的约束一致。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| stamp | text | required | 主函数生成的毫秒时间戳，构成唯一运行 ID |
| dir | text | required | 检查点目录 |

| 验证目的 | 失败退出码 |
|---|---|
| open 接受并行步骤计划 | 21 |
| 混合结局提交后保留成功兄弟 | 27 |
| retry_plan 允许只读恢复计划 | 28 |
| retry_commit 合并修复结果 | 29 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 全部恢复断言通过后的固定标记 |

并行步骤的子任务列表引用两个不存在的本地区块文件，但本金样从不执行它们：混合结局直接以数据形式提交，用于验证聚合与调和逻辑本身。提交的每个条目都保持上游定义的信封形状——成功条目携带 code 为零的 value，失败条目携带 error 说明。引擎不重新运行子任务，只按提交的数据分类：一个成功、一个失败，成功者保留。

提交后 next 报告的 partial 信封里 succeeded 计数必须恰好为一。若实现把整批标成失败、把成功兄弟一起丢弃，或者把未知结局伪装成成功，这个断言都会失败。blocked 状态会阻止自动推进，直到有新的真实证据到达——这与"混合子任务结局保留已完成兄弟并阻塞进一步自动执行"的上游契约一致。

retry_plan 与 retry_commit 构成失败后的恢复对：前者只读地确认允许制定修复计划，后者把修复后的结果列表合并进检查点。合并成功后本段返回固定标记；未决效应仍不会被自动重放，任何超出 read 范围的写入都必须经过真实核对后才能继续。

运行 ID 以 `abi_flow_partial_ci_` 前缀加毫秒时间戳构成，与三步流程的运行 ID 互相独立：两个工作流在同一检查点目录中共存而互不干扰，验证了 list 与 resume 的按 ID 隔离。检查点目录位于 `.marqdo/` 下，属于 git 忽略的运行时区域；金样不清理它，残留检查点恰好构成下一次运行的幂等性输入。

effect_class 在步骤定义中声明为 read：这是让本段可以安全地以数据形式提交结局的前提。若步骤声明为 write 或未知效应，提交混合结局后引擎会要求真实调和而不是允许 retry_commit 直接合并——该拒绝路径由上游插件实现，本仓在 G5 关口用受控负例单独验证。

**partial_steps = > json.parse text=[{"id":"children","kind":"parallel","effect_class":"read","tasks":[{"path":"worker-a.mq.md"},{"path":"worker-b.mq.md"}]}]**
**prid = "abi_flow_partial_ci_" + `stamp`**
**new_batch = > workflow.open id=`prid` steps=`partial_steps` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**parts = > json.parse text=[{"ok":true,"value":{"code":0,"value":"useful"}},{"ok":false,"error":"timeout"}]**
**stopped = > workflow.commit id=`prid` step_id="children" response=`parts` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**reloaded = > workflow.next id=`prid` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**partial = > json.get value=`reloaded` key="partial"**
**survivors = > json.get value=`partial` key="succeeded"**
1. `survivors` == 1
  **_ = 1**
2. *
  > sys.exit code=27

**retry_plan = > workflow.retry_plan id=`prid` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**allowed = > json.get value=`retry_plan` key="ok"**
1. `allowed`
  **_ = 1**
2. *
  > sys.exit code=28
**repaired = > json.parse text=[{"ok":true,"value":{"code":0,"value":"repaired"}}]**
**merged = > workflow.retry_commit id=`prid` results=`repaired` source_revision="flow-v1" session_id="ci-session" resume_dir=`dir`**
**merged_ok = > json.get value=`merged` key="ok"**
1. `merged_ok`
  **_ = 1**
2. *
  > sys.exit code=29
Return *"partial-retry-ok"*.

# 小模型原生架构：迁移与验证状态

状态：G0/G1 完成，G2 的确认语义已通过真实 CLI 与 HTTP 宿主测试；G3 的源码已进入主分支，官方 Marqdo CLI 与 Rust ABI 基础测试已通过；真实 Web 浏览器端到端与 1B/3B 模型实测仍待验收。

## 2026-11-19 增量验证记录

G1 生产入口一致（已验证）：`marqdo call ext/root-skill/index.mq.md run` 在真实宿主形态的 context（root/workspace/project/owner）下返回真实的 `waiting_user` 信封与待答问题；不再重放确认。修复了宿主成员绑定：Go 之前对入口文稿调用 `begin/respond/clarify_intent`，官方解析器只绑定入口文件内声明的函数，全部返回 artifact.unresolved；现在宿主直接调用所属文稿 state.mq.md 与 intent.mq.md，不建别名表。

传输 ABI 重建：`ext/native/libqdagent_transport.so` 与 `qdagent-worker` 由本仓源码按锁定的 Marqdo 2.9.1 依赖构建，可在受支持 glibc 加载；Cargo.lock 固定 indexmap 2.7.1（2.14.2 需要 Rust 1.85，构建工具链为 1.81，与上游一致）。

G2 确认语义（CLI+HTTP 已验证）：真实链路 begin → clarify_intent → run(等待) → respond：点选确认推进到 outline 并记录历史；自由输入（answer）逐字记录且不推进阶段；重复确认 409；跨用户 404；超界并发与未授权模型 400；过期修订返回 root.stale_confirmation；插件停用拒绝启动；刷新读取同一已提交修订。多轮恢复：在已有 outline 状态上注入新用户输入，begin 追加历史、保留目标、修订推进并开启新确认循环，旧检查点因版本过期不可再确认。`go test ./...` 全部通过（含真实 Marqdo call 路径）。

能力面同步：按上游 v2.9.1 引入 `ext/ai/flow|workflow|context|recovery`，`ext/native/libagent.so` 由源码重建；新增离线金样 `tests/ext/ai-native-flow.mq.md`（解析失败关闭、scope 投影、ContextPackV2、持久 input/reply 门禁）与 `tests/ext/ai-native-workflow.mq.md`（open/inspect/list/next/commit/tick、混合并行结局保留成功兄弟、retry_plan/retry_commit 只读恢复），行为与上游测试逐断言一致。

文档门禁恢复：`deploy/check-document-runtime.sh` 对全部来源 `marqdo check --narrative-ratio` 通过；此前 docker-auth 数据表缺少节标题、四份文稿叙述比低于 50% 的已提交缺陷已修复。

G4 增量读取：`runtime_reference` 不再对超过 16 KiB 的参考直接拒绝，改为返回有界窗口（offset/total/next_offset/分节索引/全文摘要）；`knowledge.reference` 暴露 offset 形参并在未读完时给出显式续读提示。真实 CLI 验证 33 KB 材料的三段读取与终止条件；新增 ABI 测试固定分片语义。

G5 依赖门禁：新增金样 tests/root-dag-scheduling.mq.md 固定 dependencies_ready 语义——普通函数不等运行依赖、research/document 在前置证据缺失时保持等待且不消耗模型、独立单元并行、缺失单元显式未就绪。金样暴露并修复了 proof.unit 返回契约漂移与 proof.ready 对缺失单元的崩溃。

K1 知识证明投影（已验证）：新增 `runtime_knowledge_proof` 只读 ABI 操作与 ext/knowledge `projections` 接口，inspect 返回精确 mq:// 符号身份（模块、声明位置）、proof_deps 返回官方收据/义务报告（无 Lean 工具链时如实保持 not_established，不包装成已证明）、impact 返回影响集合；官方 CLI 是唯一解析器，边界只加 90 秒超时、256 KiB 输出上限、目标越界拒绝与可重建的私有收据缓存。Rust 测试 19 项通过；金样 tests/knowledge-projections.mq.md 端到端验证生产符号 inspect、最小夹具 proof_deps 与两类拒绝分支。仓库根的全项目 proof-deps 触发上游"一个语义根一个工程"的 ext/ 双根重复收集诊断，投影因此始终使用显式 target 子工程。

K2 证明执行（同步+异步+Lean 成功路径已验证）：新增 `runtime_knowledge_prove`（compose/replay/detect）与 `runtime_knowledge_proof_job`（start/status/cancel）。compose 对显式语义根执行官方统一模块证明组合，replay 独立复核私有缓存内的证书，detect 以 `lean --version` 报告工具链事实；无 Lean 时官方诊断 `proof.compose_lean_missing` 逐字上浮（stderr 有界捕获 8 KiB），绝不包装成成功或占位证书。异步作业在私有目录派生脱离进程组的孩子（自带超时），status 依据内核进程状态与产物推导 running/done/failed/cancelled（僵尸不判为运行），cancel 在核对 /proc 命令行确为本边界的官方 knowledge 子进程后才向整组 SIGKILL，外来 PID 一律拒绝。Rust 测试 22 项通过；金样 tests/knowledge-proof-execution.mq.md 固定无 Lean 分支与三类拒绝；真实 CLI 证据：start → status failed 携带官方诊断、start(ext/root-skill) → cancel → status cancelled。

Lean 成功路径已用真实 Lean 4.35 工具链验证：新增三模块可证夹具 tests/fixtures/proof-modular（叶模块算术定理、复合模块两次顺序调用、调用方带正负分支），compose 产出 `status=lean_kernel_proved_model`、`grade=model_proved` 的官方证书，replay 独立复核出 `kernel_replayed=true`、`current_source_verified=true`；同一证书套用到另一个语义根被拒绝；篡改源码后重放报 `proof.unified_generated_source_changed`（K4 篡改场景的部署前证据）。ABI 让 compose/replay 在私有缓存目录内执行（Lean 只接受其根目录内的产物），replay 接受缓存内绝对路径、越界先拒绝；知识子 SKILL 暴露 lean_environment，金样按探测结果分支，有无 Lean 两种环境均通过。

模型重试策略（已验证）：新增金样 tests/model-retry-policy.mq.md 固定 io.retryable 的分类矩阵——503/超时/连接重置/域名解析属于可恢复，401、预算、程序错误与三种"明确拒绝连接"措辞不可重试。该金样暴露并修复了一个真实语义漂移：通用 connection 判断把"connection refused"误判为暂时波动，与文档"明确拒绝连接时原样重发没有帮助"矛盾；拒绝语义现在在通用连接判断之前短路，叙述同步说明。金样已接入文档门禁与 CI。

宿主取消传播（已验证）：以阻塞桩驱动两个不相关任务并发，停止其中一个只终结自身并如实记录 cancelled，另一个保持 running 且仍活动，二次停止后两者都如实 cancelled——失败隔离与取消传播在宿主层固定，无需真实模型。注意这不是浏览器端到端验收：界面按钮与真实 Web 恢复仍在部署环境验收。

部分成功与未接通项披露（已验证）：新增宿主测试固定验收路径——review 状态下存在未接通项时，未显式知悉的验收被拒绝且阶段保持在 review；显式 accept_stubs=true 的验收记录 delivery_status=partial，任务状态为 incomplete，部分成功不会被报告成完整成功。该测试暴露并修复了一个真实契约漂移：早于用量/数量字段的历史状态没有 settings 记录，验收路径却直接取键并崩溃，与"缺少新字段的历史配置保持零"的承诺矛盾；settings_change 现按缺失字段回退。宿主根 SKILL 调用失败时也会携带受限的 stderr 尾部诊断，而不是只给一句通用提示。空输入同样在宿主边界被固定：空串、纯空白与超长问题一律 invalid_question，且不会创建任何运行行，因此状态机永远不会记录一条空的人工决定。无效 SKILL 调用也已固定：以宿主形状的私有请求驱动生产 preflight，候选正文调用不存在的函数时被官方边界判为 validation_failed，诊断点名被拒函数与可调用集合，工具从未启动——这条覆盖不需要真实模型。

G3 记忆全链恢复（ABI 级已验证）：新增 Rust 测试固定并发 CAS 写入——八个写者对同一可信修订各写不同文档，且磁盘上已存在撕裂的半份记忆；每个写者都到达终态、至少一个可信写者落盘、持久化文档必须恰为某一份完整写者文档（绝不混合或残缺）；过期修订永远不能覆盖已落盘记忆，读路径保持持久修订与惰性文档。撕裂遗留文件在同步时被完整替换，覆盖"根状态已推进、记忆写一半"的崩溃窗口。

用量计量（已验证）：`qd_model_usage` 增加 context_bytes 列（原地迁移），事件泵把 ABI 在 model_start 测量的上下文字节数附加到 consumeModel 已序列化的用量行（单条 UPDATE，事件重放为无操作，未知身份惰性），账户用量按日汇总字节；Go 测试固定 4096+1024 求和、防重复计数与"配额计数仍按尝试"的独立性。

K4 离线场景（已验证）：Rust 测试固化三条拒绝证据——篡改叶模块定理后，已签发的组合证书重放报 `proof.unified_generated_source_changed`；恢复原文后同一证书恢复可重放；假定理永远不会产出 `lean_kernel_proved_model` 结果或"完整运行时语义"声明。两条测试在无 Lean 环境显式跳过并打印原因，有 Lean 环境真实执行（约 2 秒）。同时把既有的 no-Lean 测试改为环境自感知：检测结果必须与真实工具链状态一致，有 Lean 时 compose/replay 必须成功，无 Lean 时官方诊断逐字上浮。crate 测试 25 项，在两种 PATH 下均通过。

K4 真实小模型首轮实测（已验证，2026-11-19）：本地 ollama 0.40.16 提供两个真实 GGUF 模型（Qwen2.5-0.5B-Instruct q4_k_m 与 Qwen2.5-3B-Instruct q4_k_m），通过 `QDAGENT_OLLAMA_MODEL` 切换同一内置槽位，端到端驱动生产根流程（新增环境门控测试 `TestRealSmallModelRootFlowWhenAvailable`，未设置 `QDAGENT_TEST_LOCAL_MODEL=1` 时跳过）。实测结果（修复现场后复测两次，数字为复测值）：0.5B 四次真实模型尝试、约 79 KB 上下文计量，3B 四次尝试、约 78 KB；传输层全部成功，但两者都未能产出合法的调用条目，运行以 incomplete 结束。失败原因比首测更具体且不同：0.5B 主要是"调用现场的控制流属于根文稿"（3 次）与"需要恰好一个调用条目"（1 次），3B 是"表达式里出现了意外的 `[`"（3 次）与"需要实际的文稿函数调用与返回"（1 次）——说明模型已经在尝试真实语法，但仍在方括号/控制流边界上失败。没有任何一次被包装成成功。首测现场里记忆投影显示 `&&#35;91;&&#35;93;` 的乱码，该缺陷已修复（见下条），首测数字因此不再作为基线。该测试同时暴露并修复了四个真实缺陷：事件泵读 `n` 而 ABI 发出 `context_bytes`，导致用量计量从未生效；model_start 报告的模型身份为 `inherit` 而非实际请求模型；prose 的实体转义顺序错误，把 `[]` 变成 `&&#35;91;&&#35;93;` 乱码；memory.render 在历史为空时崩溃，尽管文档承诺"最新输入与用户选择留空"。另外发现金样的分段契约从未被执行（`marqdo run` 只跑 `## main`），现由主段显式调用并断言。

K4 受控对照（已验证，同一任务"请用两句话说明你的能力。"，本地 CPU 推理，三次试验/模型，`QDAGENT_K4_MATRIX=1` 可复现）：

| 模型 | 到达 waiting_user | 真实模型尝试 | 传输成功 | 计量字节 | 主要恢复原因 |
|---|---|---|---|---|---|
| Qwen2.5-0.5B-Instruct | 0/3 | 11 | 11 | 216 KB | 需要实际调用与返回 ×9、需恰好一个调用条目 ×2 |
| Qwen2.5-3B-Instruct | 0/3 | 14 | 13 | 382 KB | 需要实际调用与返回 ×7、表达式意外 `[` ×6 |
| Qwen2.5-Coder-3B-Instruct | **3/3** | 10 | 10 | 192 KB | 请先调用 task 保存意图 ×5、需要实际调用与返回 ×1 |

结论与边界：同一份现场、同一个宿主，是否成功取决于模型对契约的遵循能力——Instruct 变体 0/6 全部以 incomplete 结束，Coder 变体平均每次成功约需 3.3 次尝试（恢复回路每次都在真实诊断驱动下重试），说明"一次一个动作 + 真实诊断修复"的回路在真实模型下生效。每次尝试的上下文约 19–27 KB，远小于全上下文基线；计量全部来自传输边界。所有失败都没有被包装成成功，候选原文与诊断保留在私有审计目录。该表覆盖意图阶段单任务，不构成全上下文基线对照。多阶段推进已单独用同一 Coder 模型验证：经真实 HTTP 流程提交任务→停在待答问题→以用户身份确认意图→宿主恢复运行，最终 **phase=outline、revision=9、已生成框架文稿**（整轮约 126 秒，含多次真实模型调用）。这说明确认之后的阶段迁移在真实模型下也能发生；实现、独立测试与最终验收阶段仍未在该模型下验证。

真实小模型评测（K4 主体）需要的受控模型端点在本环境不可达：本机无 Ollama 服务，也没有供应商密钥；因此该关口保持未验证。本轮把准备做到可验证的程度并记录确切测量：内置本地槽位的模型名已可通过 `QDAGENT_OLLAMA_MODEL` 配置（槽位身份、协议、配额与权限不变，默认仍是文档中的 Qwen），因此同一槽位可以在 1B 类与 3B 类模型之间切换做对照；本地推理供给的两条路径都被网络阻断——GitHub 代理可下载小资产，但 1.5 GB 的 ollama 归档在约 35 分钟后停在 750 MB（内容长度 1545767640），PyPI 镜像的 torch 多次因连接中断失败。恢复评测时只需：可用的 ollama（或等价 Ollama `/api/chat` 服务）+ 已下载的 GGUF 权重，然后 `export QDAGENT_OLLAMA_MODEL=<模型名>` 并按固定测试集运行。测试集与判据见 docs/small-model-native-agent.mq.md 的固定测试集一节。知识证据决策技能（skills/marqdo-dev/knowledge-evidence.mq.md）已扩展并验证：open_obligations/unverified_premise → verify_premises、opaque/plugin_unproved → audit_deps，四个新用例纳入 tests/knowledge-proof-policy.mq.md 金样并通过。此前这些文件为 root 只读，所有者已放宽权限，改动已落地。

CI 门禁已接线：.github/workflows/small-model-contract.yml 现在解析并运行 knowledge-projections、knowledge-proof-execution、root-dag-scheduling 与 flow/workflow 金样，并检查 proof-modular/proof-scope/ambiguous-scope 夹具；新增命令在有无 Lean 两种 PATH 下都在本机执行通过。

K3 证据摘录（源码侧已验证）：memory.render 增加可选 knowledge_evidence 节——最多六条收据按"符号：等级/状态（范围）"逐字转写、节首声明 model_proved 不是运行时正确性、超限显式提示、字段缺省整体缺席保持逐字节兼容；收据是确认进根状态的快照，渲染层不读文件系统、不重推等级，过期由保存方重新投影。金样拆为 main/evidence 两段分别通过叙述比门禁。同时修复 root-dag 金样提交时即低于叙述比（31%）的已提交缺陷，文档门禁脚本的严重度过滤改用工具链 python3（环境无 jq）。K3 的可见卡片层（前端源码）已接入：知识卡显示发布时记录的证据等级，详情页"来源与审阅"节首显示等级说明并声明 model_proved 类证明不等于运行时正确性；tsc+vite 构建通过（dist 由部署构建，不入库）。

仍未验证：真实浏览器多轮恢复/取消、受控并发的真实宿主验收（真实多模型并发与取消传播）、1B/3B–4B 模型对照评测；K4 真实模型对照评测未接入。Lean 工具链已在本机验证（上游 toolchain 自带 4.35.0），部署环境需同样安装并对齐版本。K3 的可见卡片层（前端源码）已接入，生产界面验收随部署进行。

## 已核实的仓库现状

宿主入口：`server/internal/app/native_entry.go` 由 Go 启动 `marqdo call ext/root-skill/index.mq.md run`；`worker/provider.py` 只承担供应商网络传输，无须引入 Python 智能体框架。

根入口：`ext/root-skill/index.mq.md` 有三个短路由/分解函数，之前入口未声明 `## run` 且引用了不可用的 `flow/flow.mq.md`；现已加 `run → runtime.run` 并改用现有 routing 与 runtime。官方 Marqdo 解析已通过；生产 Web 宿主冒烟仍待验收。

根状态机：`ext/root-skill/runtime/index.mq.md` 具备实际的分阶段执行、独立测试、`subtask.run_many` 与验收；应逐步精简其模型可见面，不再造另一套状态机。

提示组装：`ext/root-skill/runtime/prompts.mq.md` 现在通过 `memory.sync` 生成单份状态文稿，移除原先六轮回复的循环；真实 ABI 编译与记忆原子写测试已通过，仍需并发恢复和 token 计量验收。

上游能力：Marqdo 2.9.0 `flow.input/reply` 支持保存等待与自由回复；`workflow.commit` 的输入选择要求声明选项，`workflow.tick` 只自动分派明确只读的子步骤。需要验证实际插件、版本和副作用授权边界。

## 关口与退出条件

| 阶段 | 必须完成的可验证行为 | 状态 |
|---|---|---|
| G0 宪法与测试 | AGENTS/README 指向唯一规则、短入口、纯传输 Python、静态 CI | 完成 |
| G1 生产入口一致 | `marqdo check` + 实际 `marqdo call ... run`、导入解析及权限拒绝负例 | 已通过真实 CLI 与宿主形态 context 验证（见上方增量记录） |
| G2 一次真实确认 | input/reply 绑定可信会话、版本；点选/自由输入；重复/刷新/取消和冲突恢复 | 确认语义与多轮恢复经真实 CLI 与 HTTP 测试验证；浏览器端取消与真实 Web 恢复待验收 |
| G3 单份记忆 | `memory.mq.md` 版本核对、原子保存；不再注入 N 轮旧消息；崩溃/并发不丢事实 | 代码接线、ABI 构建、基本 CAS 负例、八写者并发与撕裂恢复测试通过；token 用量计量在模型边界按尝试原子记账并汇总字节 |
| G4 小范围按需读取 | 当前函数、当前能力、限定来源；超限显式增量读取，不丢关键契约 | KB 参考的有界分片、节索引与显式增量读取已实现并经真实 CLI 验证（16 KiB 窗口、next_offset、越界拒绝、摘要稳定） |
| G5 有界 DAG 并发 | 依赖、权限、取消、失败隔离、未知外部效果核对与真实收据 | 依赖门禁语义金样验证（运行依赖≠开发顺序、缺证据阻塞下游、独立单元并行、缺失单元显式未就绪）；宿主级取消传播与不相关任务并发已用阻塞桩验证（停止一个运行只终结其自身，另一个保持 running 且仍活动，二次停止后两者都如实 cancelled）；真实多模型并发与外部效果收据待真实模型实测 |
| G6 小模型实测 | 1B、3B～4B、全上下文基线的同任务对照与失败记录 | 待执行 |
| K0 知识证明开发基线 | 明确 Marqdo 2.9.1 的锚点、证据等级、Lean 组合边界、下一步纯函数与 CI | 完成 |
| K1–K4 知识证明生产接入 | 按需索引、授权证明/重放、来源失效传播、UI 收据、真实小模型评测 | 待实现；参见知识证明接入设计 |

## 会话关键文稿约定

路径为每个任务工作区根的 `memory.mq.md`，字段固定为“目标、已确认约束、决策、任务与依赖、证据、待解决问题、下一步”。保存的是任务事实与版本引用，不是完整聊天。模型只读取一个经权限和预算校验的摘录；持久审计与原材料仍单独保存。记忆中的文本不授予工具调用权限，不作为额外可执行程序。

## 验收命令及边界

静态契约检查使用 `python3 -m unittest discover -s tests -p 'test_small_model_contract.py' -v`，本基线不需要 Marqdo/LLM。文档门禁使用 `bash deploy/check-document-runtime.sh`，实际 Marqdo 官方解析器检查包括 `tests/small-model-memory.mq.md` 的新控制金样。真实执行使用 `marqdo run tests/small-model-memory.mq.md --json`，无需模型的 `memory.render` 投影与最新输入隔离断言必须另行执行。

另需实际 `marqdo call`、用户恢复/冲突注入、受限并行、来源读取及模型端到端验收。不得把这些后续关口标注为“已验证”。

Lean 相关的证明验收需要工具链在 PATH 中；本仓使用上游 toolchain 自带的 4.35.0：`export PATH=/workspace/marqdo/target/toolchain/lean-4.35.0-linux/bin:$PATH` 后运行 `cargo test --release`（K4 篡改/假定理测试真实执行）与 `marqdo run tests/knowledge-proof-execution.mq.md --emit-result`（走 Lean 分支）；去掉该 PATH 后同一命令走无 Lean 分支，两者都必须返回 knowledge-proof-execution-ok。

基础生产调用路径已在主分支改造，但本文及新增知识证明设计不意味着部署完成。后续实现仍应先增加失败负例，再完成真实宿主/模型/授权效果实测；不修改相邻 Marqdo 源码。

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

K2 证明执行（同步+异步已验证）：新增 `runtime_knowledge_prove`（compose/replay/detect）与 `runtime_knowledge_proof_job`（start/status/cancel）。compose 对显式语义根执行官方统一模块证明组合，replay 独立复核私有缓存内的证书，detect 以 `lean --version` 报告工具链事实；无 Lean 时官方诊断 `proof.compose_lean_missing` 逐字上浮（stderr 有界捕获 8 KiB），绝不包装成成功或占位证书。异步作业在私有目录派生脱离进程组的孩子（自带超时），status 依据内核进程状态与产物推导 running/done/failed/cancelled（僵尸不判为运行），cancel 在核对 /proc 命令行确为本边界的官方 knowledge 子进程后才向整组 SIGKILL，外来 PID 一律拒绝。Rust 测试 22 项通过；金样 tests/knowledge-proof-execution.mq.md 固定无 Lean 分支与三类拒绝；真实 CLI 证据：start → status failed 携带官方诊断、start(ext/root-skill) → cancel → status cancelled。Lean 重放成功路径与 compose 真实证书内容待安装 Lean 的部署环境验收。

K3 证据摘录（源码侧已验证）：memory.render 增加可选 knowledge_evidence 节——最多六条收据按"符号：等级/状态（范围）"逐字转写、节首声明 model_proved 不是运行时正确性、超限显式提示、字段缺省整体缺席保持逐字节兼容；收据是确认进根状态的快照，渲染层不读文件系统、不重推等级，过期由保存方重新投影。金样拆为 main/evidence 两段分别通过叙述比门禁。同时修复 root-dag 金样提交时即低于叙述比（31%）的已提交缺陷，文档门禁脚本的严重度过滤改用工具链 python3（环境无 jq）。K3 的可见卡片层（前端源码）已接入：知识卡显示发布时记录的证据等级，详情页"来源与审阅"节首显示等级说明并声明 model_proved 类证明不等于运行时正确性；tsc+vite 构建通过（dist 由部署构建，不入库）。

仍未验证：真实浏览器多轮恢复/取消、受控并发的真实宿主验收、token 用量计量、1B/3B–4B 模型对照评测；K2 的 Lean 重放成功路径（需安装 Lean 的部署环境）、K4 真实模型对照评测未接入。K3 的可见卡片层（前端源码）已接入，生产界面验收随部署进行。

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
| G3 单份记忆 | `memory.mq.md` 版本核对、原子保存；不再注入 N 轮旧消息；崩溃/并发不丢事实 | 代码接线、ABI 构建与基本 CAS 负例通过；待全链恢复测试 |
| G4 小范围按需读取 | 当前函数、当前能力、限定来源；超限显式增量读取，不丢关键契约 | KB 参考的有界分片、节索引与显式增量读取已实现并经真实 CLI 验证（16 KiB 窗口、next_offset、越界拒绝、摘要稳定） |
| G5 有界 DAG 并发 | 依赖、权限、取消、失败隔离、未知外部效果核对与真实收据 | 依赖门禁语义金样验证（运行依赖≠开发顺序、缺证据阻塞下游、独立单元并行、缺失单元显式未就绪）；真实多模型并发、取消传播与外部效果收据待宿主实测 |
| G6 小模型实测 | 1B、3B～4B、全上下文基线的同任务对照与失败记录 | 待执行 |
| K0 知识证明开发基线 | 明确 Marqdo 2.9.1 的锚点、证据等级、Lean 组合边界、下一步纯函数与 CI | 完成 |
| K1–K4 知识证明生产接入 | 按需索引、授权证明/重放、来源失效传播、UI 收据、真实小模型评测 | 待实现；参见知识证明接入设计 |

## 会话关键文稿约定

路径为每个任务工作区根的 `memory.mq.md`，字段固定为“目标、已确认约束、决策、任务与依赖、证据、待解决问题、下一步”。保存的是任务事实与版本引用，不是完整聊天。模型只读取一个经权限和预算校验的摘录；持久审计与原材料仍单独保存。记忆中的文本不授予工具调用权限，不作为额外可执行程序。

## 验收命令及边界

静态契约检查使用 `python3 -m unittest discover -s tests -p 'test_small_model_contract.py' -v`，本基线不需要 Marqdo/LLM。文档门禁使用 `bash deploy/check-document-runtime.sh`，实际 Marqdo 官方解析器检查包括 `tests/small-model-memory.mq.md` 的新控制金样。真实执行使用 `marqdo run tests/small-model-memory.mq.md --json`，无需模型的 `memory.render` 投影与最新输入隔离断言必须另行执行。

另需实际 `marqdo call`、用户恢复/冲突注入、受限并行、来源读取及模型端到端验收。不得把这些后续关口标注为“已验证”。

基础生产调用路径已在主分支改造，但本文及新增知识证明设计不意味着部署完成。后续实现仍应先增加失败负例，再完成真实宿主/模型/授权效果实测；不修改相邻 Marqdo 源码。

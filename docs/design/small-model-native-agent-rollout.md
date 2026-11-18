# 小模型原生架构：迁移与验证状态

**状态：G0 完成；G1/G3 已提交生产改造候选，尚待实际 CLI/ABI/宿主验收。** 未部署、未做真实小模型性能评测。

## 已核实的仓库现状

- `server/internal/app/native_entry.go` 由 Go 启动 `marqdo call ext/root-skill/index.mq.md run`；`worker/provider.py` 只承担供应商网络传输，无须引入 Python 智能体框架。
- `ext/root-skill/index.mq.md` 有三个短路由/分解函数，之前入口未声明 `## run` 且引用了不可用的 `flow/flow.mq.md`；本 PR 已加 `run → runtime.run` 并改用现有 routing 与 runtime。仍需实际 Marqdo 解析与宿主冒烟验证。
- `ext/root-skill/runtime/index.mq.md` 具备实际的分阶段执行、独立测试、`subtask.run_many` 与验收；应逐步精简其模型可见面，不再造另一套状态机。
- `ext/root-skill/runtime/prompts.mq.md` 现在通过 `memory.sync` 生成单份状态文稿，移除原先六轮回复的循环；仍需真实 ABI 编译、并发恢复和 token 计量验收。
- Marqdo 2.9.0 `flow.input/reply` 支持保存等待与自由回复；`workflow.commit` 的输入选择要求声明选项，`workflow.tick` 只自动分派明确只读的子步骤。需要验证实际插件、版本和副作用授权边界。

## 关口与退出条件

| 阶段 | 必须完成的可验证行为 | 状态 |
|---|---|---|
| G0 宪法与测试 | AGENTS/README 指向唯一规则、短入口、纯传输 Python、静态 CI | 本 PR |
| G1 生产入口一致 | `marqdo check` + 实际 `marqdo call ... run`、导入解析及权限拒绝负例 | 已修改源码；待实际 CLI 验收 |
| G2 一次真实确认 | input/reply 绑定可信会话、版本；点选/自由输入；重复/刷新/取消和冲突恢复 | 待执行 |
| G3 单份记忆 | `memory.mq.md` 版本核对、原子保存；不再注入 N 轮旧消息；崩溃/并发不丢事实 | 代码接线完成；待 ABI/冲突/恢复实测 |
| G4 小范围按需读取 | 当前函数、当前能力、限定来源；超限显式增量读取，不丢关键契约 | 待执行 |
| G5 有界 DAG 并发 | 依赖、权限、取消、失败隔离、未知外部效果核对与真实收据 | 待执行 |
| G6 小模型实测 | 1B、3B～4B、全上下文基线的同任务对照与失败记录 | 待执行 |
| K0 知识证明开发基线 | 明确 Marqdo 2.9.1 的锚点、证据等级、Lean 组合边界、下一步纯函数与 CI | 本 PR |
| K1–K4 知识证明生产接入 | 按需索引、授权证明/重放、来源失效传播、UI 收据、真实小模型评测 | 待实现；参见知识证明接入设计 |

## 会话关键文稿约定

路径为每个任务工作区根的 `memory.mq.md`，字段固定为“目标、已确认约束、决策、任务与依赖、证据、待解决问题、下一步”。保存的是任务事实与版本引用，不是完整聊天。模型只读取一个经权限和预算校验的摘录；持久审计与原材料仍单独保存。记忆中的文本不授予工具调用权限，不作为额外可执行程序。

## 验收命令及边界

- `python3 -m unittest discover -s tests -p 'test_small_model_contract.py' -v`：本 PR 的静态检查，不需要 Marqdo/LLM。
- `bash deploy/check-document-runtime.sh`：实际 Marqdo 官方解析器检查包括 `tests/small-model-memory.mq.md` 的新控制金样。
- `marqdo run tests/small-model-memory.mq.md --json`：真正执行无需模型的 `memory.render` 投影与最新输入隔离断言，必须另行执行。
- 另需实际 `marqdo call`、用户恢复/冲突注入、受限并行、来源读取及模型端到端验收。不得把这些后续关口标注为“已验证”。

当前 PR 不直接修改生产调用链、不替用户部署、不动相邻 Marqdo 源码。所有后续改动应先增加对应失败负例，再完成行为和实测。

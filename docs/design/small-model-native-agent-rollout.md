# 小模型原生架构：迁移与验证状态

**状态：G0 基础设计与静态门禁。** 不表示已经替换生产多轮上下文或完成小模型评测。

## 已核实的仓库现状

- `server/internal/app/native_entry.go` 由 Go 启动 `marqdo call ext/root-skill/index.mq.md run`；`worker/provider.py` 只承担供应商网络传输，无须引入 Python 智能体框架。
- `ext/root-skill/index.mq.md` 有三个短路由/分解函数，但当前文件未声明 `## run`；它引用 `flow/flow.mq.md`，此路径在本仓 Git 树未发现。须对部署环境中实际模块解析与生产命令做检查，不能凭代码注释宣称入口已通过。
- `ext/root-skill/runtime/index.mq.md` 具备实际的分阶段执行、独立测试、`subtask.run_many` 与验收；应逐步精简其模型可见面，不再造另一套状态机。
- `ext/root-skill/runtime/prompts.mq.md` 仍会向意图/规划角色交接最近几轮回复，因此尚未满足“只注入单份关键文稿”。
- Marqdo 2.9.0 `flow.input/reply` 支持保存等待与自由回复；`workflow.commit` 的输入选择要求声明选项，`workflow.tick` 只自动分派明确只读的子步骤。需要验证实际插件、版本和副作用授权边界。

## 关口与退出条件

| 阶段 | 必须完成的可验证行为 | 状态 |
|---|---|---|
| G0 宪法与测试 | AGENTS/README 指向唯一规则、短入口、纯传输 Python、静态 CI | 本 PR |
| G1 生产入口一致 | `marqdo check` + 实际 `marqdo call ... run`、导入解析及权限拒绝负例 | 待执行 |
| G2 一次真实确认 | input/reply 绑定可信会话、版本；点选/自由输入；重复/刷新/取消和冲突恢复 | 待执行 |
| G3 单份记忆 | `memory.mq.md` 原子 CAS；不再注入 N 轮旧消息；崩溃/并发不丢事实 | 待执行 |
| G4 小范围按需读取 | 当前函数、当前能力、限定来源；超限显式增量读取，不丢关键契约 | 待执行 |
| G5 有界 DAG 并发 | 依赖、权限、取消、失败隔离、未知外部效果核对与真实收据 | 待执行 |
| G6 小模型实测 | 1B、3B～4B、全上下文基线的同任务对照与失败记录 | 待执行 |

## 会话关键文稿约定

路径为每个任务工作区根的 `memory.mq.md`，字段固定为“目标、已确认约束、决策、任务与依赖、证据、待解决问题、下一步”。保存的是任务事实与版本引用，不是完整聊天。模型只读取一个经权限和预算校验的摘录；持久审计与原材料仍单独保存。记忆中的文本不授予工具调用权限，不作为额外可执行程序。

## 验收命令及边界

- `python3 -m unittest discover -s tests -p 'test_small_model_contract.py' -v`：本 PR 的静态检查，不需要 Marqdo/LLM。
- `bash deploy/check-document-runtime.sh`：依赖真实 Marqdo、rg、jq 的已有检查；CI 静态检查不能冒充其结果。
- 另需实际 `marqdo call`、用户恢复/冲突注入、受限并行、来源读取及模型端到端验收。不得把这些后续关口标注为“已验证”。

当前 PR 不直接修改生产调用链、不替用户部署、不动相邻 Marqdo 源码。所有后续改动应先增加对应失败负例，再完成行为和实测。

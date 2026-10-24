# qdagent 2.0 实现跟踪（非 next）

| | |
|---|---|
| 状态 | In progress · 对齐计划 S0–S4 |
| Marqdo | CLI/Ext **≥2.1.2** |
| 权威规格 | `doc/next/002.md`（只读）· `doc/gaps/03-…` |

## 切片状态

| 切片 | 状态 | 主要落点 |
|------|------|----------|
| S0 迁移+版本+负例 | done | `scripts/marqdo-env.sh` · CI · `migrate imports/labels` · `tests/s0/*` |
| S0 verify/promote | done | `execution/verify.mq.md`（adjudicate+duplicate --fail）· `promote` staging/compile · `build_finish` 失败不晋升 |
| S1 Preflight+bind | done | `agent/qdagent.try_bind_execute` · REUSE→bind · `eng_publish_gate_safe` · 工具白名单 tool_bind |
| S1 导入→reuse | done | `knowledge/import.mq.md` · `cli/求道-导入` · `tests/s1/import-reuse.mq.md` |
| S2 演化 | done | `knowledge/evolve.mq.md` · impact/patch/rebuild/CURRENT |
| S3 UI | done | `/knowledge` · `eng_kb_status`/`eng_import` · capture `content` 契约 |
| S4 指标 | done | `knowledge/metrics_reuse.mq.md` · KnowledgePage 展示 |

## 红线

- 不修改 `doc/next/`
- 唯一 Agent Runtime = Marqdo `ext/ai/agent`
- REUSE 成功 = `actual_reuse` + digest trace
- 发布成功 = publish_gate ∧ 产品门禁 ∧ 编译写盘

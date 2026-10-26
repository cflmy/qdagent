# 可靠工作台 Q-R0–R9 实施说明（2026-10-26）

| 项目 | 约定 |
|---|---|
| 状态 | Implemented（本仓）；以测试证据为准 |
| Marqdo | ≥2.1.4（ADR 0009 `runtime.isolated_execution`） |
| 设计 | [reliable-workbench-development-2026-10-26.md](../design/reliable-workbench-development-2026-10-26.md) |
| 路由清单 | [route-inventory-2026-10-26.md](../design/route-inventory-2026-10-26.md) |

## 已落地

| 包 | 要点 |
|---|---|
| Q-R0 | Marqdo 2.1.4 门闩、v2 envelope/route fixtures、`PLAYWRIGHT_REQUIRE_SERVER` |
| Q-R1 | `db.initialize` / `connect` / `sync_runs` 拆分；读路径不再全量 `run.同步库` |
| Q-R2 | `turns_cancel` → `execution/turns.cancel`；未知 turn 404；禁止占位插入 |
| Q-R3 | `ApiError`、request_id、SSE event_id 去重、取消先服务端后 abort |
| Q-R4 | DocumentView 传 revision/generation/node；唯一临时文件；HTML 按 format 渲染 |
| Q-R5 | 服务端 upload 路径；硬后缀校验；ImportJob digests |
| Q-R6 | 草稿含知识正文；digest 三分开；check 失败 → needs_input |
| Q-R7 | `knowledge/publication.mq.md` manifest/`CURRENT`；假发布阻断 |
| Q-R8 | usage revision 替换；profile 默认 confirmed |
| Q-R9 | feature flags、legacy_unverified 迁移、列 ALTER 迁移 |

## 功能开关

环境变量 `QDAGENT_FF_<name>`：`task_runtime_v2`、`import_pipeline_v2`、`publication_manifest_required`、`reader_version_strict`（默认 true）。探测：`GET /api/app/feature_flags`。

## 验收

```bash
python3 scripts/check-contracts.py
./scripts/probe-marqdo-capabilities.sh
./scripts/run-workbench-tests.sh
```

新增：`t19-cancel-unknown-404`、`t20-publication-manifest`。

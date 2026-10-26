# 工作台路由清单（Q-R0）

| 项目 | 约定 |
|---|---|
| 状态 | Accepted · 与 `contracts/fixtures/workbench/route-inventory.json` 同步 |
| 日期 | 2026-10-26 |
| 目的 | 每个用户操作映射唯一业务函数；测试必须打真实 HTTP 权威路径 |

## 权威入口

```text
serve.mq.md  →  lib/api.mq.md  →  业务实现
```

| HTTP | api.* | 权威实现 | 决策 |
|---|---|---|---|
| POST `/api/app/documents/read` | `app_documents_read` | `workbench.documents_read` | KEEP（传 revision/generation/node） |
| POST `/api/app/citations/resolve` | `app_citations_resolve` | `workbench.citations_resolve` | KEEP |
| POST `/api/app/uploads/create` | `app_uploads_create` | `workbench.uploads_create` | MERGE ← uploads 语义 |
| POST `/api/app/imports/start` | `app_imports_start` | `workbench.imports_start` | MERGE |
| POST `/api/app/imports/get` | `app_imports_get` | `workbench.imports_get` | KEEP |
| POST `/api/app/imports/publish` | `app_imports_publish` | `publication.publish` via workbench | REFACTOR |
| POST `/api/app/turns/cancel` | `app_turns_cancel` | `execution/turns.cancel` | MERGE；facade only |
| GET `/api/app/workspaces` | `app_workspaces` | `workbench.workspaces_list` | KEEP |
| GET `/api/app/models` | `app_models` | registry | KEEP |
| POST `/api/app/usage/query` | `app_usage_query` | `workbench.usage_query` | KEEP |

## 禁止

- 用 `lib/workspace` / `lib/uploads` / `execution/turns` 的兄弟实现冒充 HTTP 证据
- `turns_cancel` 对未知 turn 插入占位行
- `imports_publish` 仅改 DB status 而无 manifest/`CURRENT`

# 多提供商与知识工作台 — 发布说明（2026-10-25）

规格：`doc/design/multi-provider-and-knowledge-workbench-2026-10-25.md`  
依赖：Marqdo **≥2.1.3**（CLI / ext / native 对齐）+ `view.document` 能力探测。

## 适配器

| 适配器 | 状态 |
|--------|------|
| `openai-compatible` | 可用（注册表 + `llm.create` 冻结 ModelSnapshot） |
| 原生厂商专用适配器 | 设置页诚实标记 `unavailable`，不假装已接线 |

禁止用 `sys.env_set(OPENAI_*)` 做请求级模型选择；会话默认路径禁止 `llm.llm`。

## 用量可测性

- 账本表 `model_calls`：`(call_id, attempt_id)` 唯一；revision 替换；`null ≠ 0`
- `usage_state=unknown` 在 UI 显示「用量未知」，**永不**显示为 0
- `token_cost` 不当作货币或伪 tokens
- 查询：`POST /api/app/usage/query`

## 可提取格式（上传 / ImportJob）

| 格式 | 状态 |
|------|------|
| `.md` / `.txt` | 支持（multipart → 隔离路径 → draft） |
| PDF / 其它二进制 | 需外挂；失败显式错误码，不静默吞 |

生成（draft）≠ 发布（publish）。并发上传使用 per-job 临时文件（无共享 `qd-mlsp-ext.json`）。

## 历史版本与阅读

- 阅读路径：`view.document` / 静态 fallback；**永不**升级为执行或写回
- 引用链：知识 → 来源 → 返回滚动（ContextPanel `requestGen` 防晚到覆盖）
- 工作区文件树：授权根 + 拒绝 `..`

## 流式与取消

- 真逐字：`POST /v1/chat/completions` 且 `stream:true` → Marqdo web 自动 `sse-live`，LLM `delta` 经 EventBus 即时 flush；合同 `token-stream; marqdo-sse-live+EventBus`
- 回退：无 live 桥时仍可用 `evented-batch`（完成前单帧 delta）
- 客户端断开置 `MARQDO_CANCEL`；另须 `POST /api/app/turns/cancel` 置 `cancel_requested`
- 中断的 BUILD **不**自动重做

## 画像

仅 `confirmed` + 作用域匹配项可注入；`proposed` 确认前不进 standing。

## Schema / 迁移

- 旧单行 `settings.llm_*` → `prov-legacy-default` / `mdl-legacy-default`（T17 幂等）
- 能力探测：`scripts/probe-marqdo-capabilities.sh`

## 功能开关与回滚

- 工作台路由 `/api/app/*` 可整体回退到仅 OpenAI 兼容网关 + 旧 settings
- 前端：无 `msg.usage` 时脚注不硬编码 0；探测失败时 DocumentReader 显式「能力不可用」

## 验收闸

1. **MVP**：Q01–Q05 + Q09 最小可读性；T01–T05、T09–T11、T15–T17 自动化绿
2. **完整**：Q06–Q08 + T06–T08、T12–T14 + §11.3 读者任务

## §11.3 读者任务清单（人工，未宣称 verified）

固定语料含：中文长标题、复杂表格、普通笔记、可执行步骤、过期来源、长代码。五名未参与实现的读者，每项 ≥4/5 在 30s 无指导完成：

1. 辨认当前模型（ModelPicker / 脚注）
2. 找到本轮用量（UsageFooter；unknown ≠ 0）
3. 从引用跳到具体知识及来源（Citation → DocumentReader）
4. 分辨已保存 / 已发布 / 已验证（ImportJob draft vs publish）
5. 返回原对话并纠正画像（ContextPanel back + profile confirm）

记录失败原因后迭代；点击数与耗时优先于「看起来像聊天产品」。

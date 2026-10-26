# 多提供商与知识工作台：qdagent 应用实施设计

日期：2026-10-25。状态：**in_progress**（Wave0–4 交付闭合：registry/`llm.create`/usage/Workspace 阅读/引用/SSE evented-batch/cancel/上传隔离/画像注入/a11y Playwright；`scripts/run-workbench-tests.sh` 绿。完整闸读者任务 §11.3 与真逐字流式仍待人工/Marqdo M02；未宣称全部 verified）。

实施基线：Marqdo **≥2.1.3**（工作台 M00–M06：`view.document` / ModelSelection / usage null≠0 / cancel）；qdagent workbench 提交自 `13f8744` 起。审阅起点曾为 qdagent `643dd31`、Marqdo `dc853fb`（2.1.2）。本次目标是把模型选择、可追溯的知识阅读和持续沉淀组织成一个可读、可信、可持续开发的产品。

上位约束：[qdagent 2.0](qdagent-2.0.md)、只读的 [002](../next/002.md)。历史背景：[知识沉淀缺口审计](../gaps/03-knowledge-ingestion-and-sedimentation-2026-10-24.md)。框架配套规格：[Marqdo 多模型运行与嵌入式知识阅读支持](../../../marqdo/doc/design/qdagent-workbench-runtime-and-view-2026-10-25.md)。跨仓链接以当前兄弟工作区布局为准；单独 checkout 时可按仓库名和文件名查找。

## 1. 产品决策与交付范围

求道的主界面应帮助用户完成四件事：选择合适的模型，理解答案，查阅答案所依据的知识，把有价值的结果沉淀下来。文件、运行轨迹、图谱和用量是支持这些活动的上下文。

本阶段固定以下设计决定，实施 PR 若改变这些决定，需先更新本规格及对应验收项：

1. 一个提供商配置可拥有多个模型；同一厂商的两个账户或两个端点属于不同提供商实例。
2. 模型按会话选择、按轮冻结；正在执行的轮次不被界面切换或设置修改影响。
3. 页面显示实际调用身份与真实用量状态；缺失用量不显示为零，`token_cost` 不解释成金额。
4. 右侧栏是“上下文阅读器”：默认以 Marqdo View 阅读文档，引用能定位到特定版本、知识单元与来源；阅读不触发执行。
5. 笔记、知识、资料、用户画像有明确身份和生命周期；统一阅读器与视觉语言，不合并成一个不明含义的文件列表。
6. Marqdo 继续拥有唯一 Agent Runtime、语义解析、执行、验证与知识编译。qdagent 拥有配置、会话、权限、工作区、应用数据和交互。
7. 首批完整交付“多个兼容端点 × 每端点多个模型”、聊天切换、调用用量、只读知识侧栏、工作区隔离；原生非兼容协议依赖框架适配器。设置页必须诚实显示支持状态。

不把集成终端、完整 IDE、多人实时共同编辑、供应商余额查询作为首批完成条件。它们不应以空按钮占据正式导航。费用统计是本系统观测到的估算，不承诺替代供应商账单。

## 2. 最新变更与当前证据

### 2.1 本次同步带来的变化

qdagent 从 `a7754c6` 更新到 `643dd31`：增加 `knowledge/import`、`knowledge/evolve`、真实复用指标、`KnowledgePage`、接口 smoke；修复取元语法及若干 gateway 接线。Marqdo 从 `0b80ff8` 更新到 `dc853fb`：来源摘要进入闭包/句柄，增加裁决、实际绑定执行、文档提取和 View V0–V3 子集。

因此，上一轮“没有知识导入链”“静态 no-exec 先执行后清空”的判断不能原封不动当作当前缺口。现在需要补的是浏览器上传到导入链、可读的详情、引用导航、多模型调用及完整观测链。

### 2.2 可定位的应用缺口

| ID | 源码证据 | 当前行为及开发影响 |
|---|---|---|
| A01 | [settings schema](../../db/settings.mq.md)，[设置页](../../frontend/src/components/pages/SettingsPage.tsx) | 一条 settings 保存一套 `llm_base_url/llm_model/llm_api_key`；没有 Provider/Model 实体及选择关系 |
| A02 | [ensure_llm / make_agent](../../agent/qdagent.mq.md) | settings 回填进程环境后，构造默认 `llm.llm`；有环境密钥时甚至不再读取 settings。并发模型选择不能通过改环境变量实现 |
| A03 | [v1_chat_completions](../../lib/api.mq.md)，[gateway chat](../../gateway/openai.mq.md) | 从 messages 仅提取最后一条 user；model 用于响应字段，未沿 `qd.run` 显式传给模型；伪默认任务 `ping` 掩盖空消息 |
| A04 | [session store](../../frontend/src/stores/session-store.ts) | localStorage 会话无模型/用量/服务端绑定；全局 streaming；缓存旧 session 后追加空 assistant，再对旧数组 `slice(0,-1)`，存在丢掉最新用户消息的代码路径，需回归验证 |
| A05 | 同上及 [API client](../../frontend/src/lib/api.ts) | 流式消费只有 content delta；没有 event id、轮次身份、usage、citations；SSE 按单行处理、忽略坏包，无法可靠恢复终态 |
| A06 | [ChatPage](../../frontend/src/components/pages/ChatPage.tsx)，[NotesPage](../../frontend/src/components/pages/NotesPage.tsx) | 聊天正文直接输出字符串；笔记手工去 frontmatter、详情仍偏源码文本；聊天无 Markdown/知识语义阅读器 |
| A07 | [DesktopFrame](../../frontend/src/components/layout/DesktopFrame.tsx) | 右栏 notes 仅“查看全部”，files/workspace 为占位；无目标对象、锚点、版本、返回栈 |
| A08 | [KnowledgePage](../../frontend/src/components/pages/KnowledgePage.tsx) | 已有状态/导入入口，但输入服务器路径、列表只显示文件名；无浏览器文件上传、阅读详情和引用跳转；默认暴露 kb_root/CURRENT/manifest |
| A09 | [WorkspacePage](../../frontend/src/components/pages/WorkspacePage.tsx)，[knowledge context](../../knowledge/context.mq.md) | UI 是占位；后端存在项目 root 概念，但没有应用 Workspace 实体、授权映射与会话冻结 |
| A10 | [profile](../../lib/profile.mq.md)，[API](../../lib/api.mq.md) | 有画像正文、追加/重置提案及 apply 链；设置“记忆”页仍占位，画像主要依赖关键词追加，缺少条目来源/作用域/实际使用说明 |
| A11 | [Agent evidence](../../agent/qdagent.mq.md) | 已把部分 usage/token_cost/route 写 Workbook；还不是逐调用账本，ASK 的修复轮也需计入；不能据此宣称完整费用可见 |
| A12 | [serve](../../serve.mq.md)，[API](../../lib/api.mq.md) | `/v1` 返回完整结果后拼成一个 SSE 块；浏览器 abort 不等于框架停止；需端到端事件与取消契约 |

以上为源码审计，非线上负载或供应商实测。新实现不能用“页面能打开”代替 A02–A05/A11–A12 的行为验证。

### 2.3 已有能力的复用边界

继续复用 `execution/session` 的会话索引、runs/workbooks、changes 的提案流程、`knowledge/import/evolve`、Marqdo `artifact.inspect/link.resolve/artifact.verify` 和 `KnowledgePresentation`。应用数据库可存配置、会话索引、计量账本与阅读状态；不得复制一套有独立语义的 EKC 图谱。文档正文仍以原始文档为权威，缓存记录源摘要及生成版本，可从源重建。

## 3. 总体信息架构与默认可见内容

### 3.1 页面与导航

左栏从上到下为“当前工作区”“新对话/近期会话”“笔记”“知识库”“工作区文件”，底部为设置、画像与用量入口。工程检查作为工作区的“检查与运行”子页；插件放设置。只有功能已开放才显示入口。旧 `/eng`、`/plugins` 保留跳转，不制造第二组平行页面。

| 区域 | 默认展示 | 按需展示 | 不应默认展示 |
|---|---|---|---|
| 聊天头部 | 会话名、工作区、当前轮状态 | 会话用量、历史模型 | API URL、路径、路由调试 JSON |
| 输入区 | 可搜索模型选择器、模式 ASK/BUILD/LEARN、附件、发送/停止 | 允许的模型参数、上下文构成 | 未支持的工具按钮、静默自动路由 |
| 答案正文 | 可读结果、引用序号、文档入口 | 已执行动作摘要、模型/用量详情 | 完整 Workbook、模型内部推理文本、全量候选 |
| 右侧阅读器 | 当前文档正文、标题、版本提示、目录入口 | 来源/知识关系/实现/运行证据 | 全量 digest、目标 URI、全图、重复应用导航 |
| 笔记列表 | 标题、摘要、时间、沉淀状态、来源会话 | 标签、模型、适用范围 | frontmatter、源路径、执行日志 |
| 知识库 | 标题、用途、发布/证据状态、来源数 | 实现/验证详情、依赖 | `.marqdo`、CURRENT、manifest、指标原始键 |
| 工作区 | 文件/资料/知识范围、近期变更、索引状态 | Git diff、检查详情 | 默认终端、任意服务器路径 |
| 画像 | 已确认偏好、待审建议、作用域、是否启用 | 来源、变更历史、原文 | 推断的敏感属性、配置密钥、未确认内容被当作事实 |

内部信息不是删除，而是移入“技术详情”。没有内容时给出一项有效下一步，不展示成排“开发中”卡片。

### 3.2 桌面与窄屏布局

```text
┌──────────────┬───────────────────────────┬────────────────────────┐
│ 工作区选择   │ 对话标题   本会话用量      │ 文档标题  返回/展开/关 │
│ 新对话       │                           │ 目录  正文             │
│ 近期会话     │ 答案正文 [1] [2]           │ 标题、说明、知识步骤   │
│              │ 已沉淀：方案笔记 →         │                        │
│ 笔记         │                           │ [来源] [关系] [实现]   │
│ 知识库       │ 输入框                    │ 选中的步骤说明         │
│ 文件         │ 模型 ▼  ASK ▼  附件 发送  │ 返回原引用             │
│ 画像 / 设置  │                           │                        │
└──────────────┴───────────────────────────┴────────────────────────┘
```

桌面三列的条件由可用内容宽度决定：左栏 224–272px、聊天至少 480px、阅读器至少 360px。阅读器默认 440px，可在 360–720px 拖动；低于所需总宽度先折叠左栏，再把阅读器切为覆盖抽屉。768px 以下详情为独立全屏路由，保留返回聊天与输入草稿；不得把全文压进 280px。文档展开阅读使用同一阅读器、同一定位状态，增加正文宽度而不是再打开一个套壳网站。

1440px、1024px、768px、390px、200% 缩放作为交付截图尺寸。表格/代码局部横向滚动，页面不横向溢出。

## 4. 提供商、模型和选择策略

### 4.1 数据实体（新增、拟议）

| 实体 | 必要字段 | 不变量 |
|---|---|---|
| Provider | `id, display_name, adapter, base_url, credential_ref, auth_mode, enabled, revision, created_at, updated_at` | id 不随名称变化；一个配置实例可有多个 Model；凭证仅服务端解析 |
| Model | `id, provider_id, upstream_model_id, display_name, enabled, capabilities, limits, default_params, revision` | provider 内 upstream id 唯一；跨 provider 同名模型可并存 |
| ModelCapability | `input_modalities, tools, streaming, structured_output, reasoning_controls, source, checked_at` | 支持/不支持/未知三态；“列出来”不代表能力已验证 |
| PriceVersion | `id, model_id, currency, effective_at, rules, source, updated_at` | 可选；手工录入或经核验导入；不把未知价格默认为免费 |
| ModelSelection | `mode: manual|policy, model_id, policy_id?, revision` | manual 为默认；policy 必须明确启用并列出允许模型 |
| Credential | `ref, version, configured, owner_scope` | 写入/替换/清除分开，GET 仅返回 configured；不进浏览器持久存储 |

`adapter` 表示协议，不是厂商名称：首批 `openai-compatible` 和经验证的 `ollama-compatible`；`anthropic-native`、`gemini-native` 等待 Marqdo 适配及独立协议验收后开放。本文不锁定供应商当前型号、价格、原生 API 字段，也不把一个 base URL 替换描述为任意协议兼容。

配置中的 `base_url` 只由有配置权限的人编辑；聊天提交 `model_id`，不允许用请求覆盖端点/密钥。自托管可配置本地端点，云部署按管理策略控制可达范围；禁止凭证随跨源重定向转发。

### 4.2 设置与选择器交互

设置“模型”改为提供商列表 → 提供商详情 → 模型列表。创建提供商依次填名称、协议、地址、认证方式、密钥；“测试连接”与“发现模型”独立，前者标明是否产生计费调用。支持手动添加模型，发现结果只是待确认候选，不自动启用全部模型。测试失败保留表单并显示可操作原因。

同一提供商至少可配置两个模型；模型可设置别名、上下文/输出上限和可用参数。修改需 revision 条件更新，冲突返回 409；停用不删除历史关联。删除被引用的配置转为 tombstone，历史轮仍显示当时名称与实际模型。

凭证更新合同为 `credential_action: keep|replace|clear`，replace 必须携带新值且只在写请求出现；空字符串不暗示 clear，保存其他字段默认 keep。清除后重新验证 enabled/default 是否可用；若该提供商要求认证，选择器显示缺凭证并阻止新轮。移除默认模型要同时指定替代默认或进入未配置状态，禁止自动挑目录第一项。历史轮保存显示名和模型身份快照，不依赖已删除配置的 JOIN 才能显示。

聊天选择器按提供商分组，支持搜索、最近使用、默认标记、能力与不可用原因。格式示例：“团队网关 / 推理模型”；不显示密钥或地址。发送前若附件或模式不被模型支持，给出替换模型/去除附件选项，不静默丢弃内容。

### 4.3 生效与路由规则

优先级：本轮显式选择 → 会话默认 → 工作区默认 → 应用默认。发送时后端解析出不可变 `ModelSnapshot`，包括 provider/model id、版本、上游 id、适配器、参数、定价版本、凭证版本引用；响应中只返回去密快照。

运行中切换只影响下一轮；头部明确显示“下一条使用…”，当前消息保留旧模型。并行两个会话使用不同模型必须互不影响，禁止 `sys.env_set` 承担请求选择。

manual 模式固定所有需要 LLM 的生成/修复调用，知识复用路径仍可零模型调用；若需要辅助模型，必须在明确的 policy 中配置，并在用量详情列出。框架自动“复用还是生成”的决策不等于用户授权自动更换供应商。默认不静默 fallback；允许 fallback 时记录每次 attempt 及理由，消息展示实际使用模型。

## 5. 会话、历史上下文和轮次

### 5.1 权威数据及迁移方向

服务端会话为权威；浏览器保留草稿、展开状态和可重建缓存。扩展 `execution/session` 为关联索引，关联 messages/turns/runs/documents，不能把聊天历史重复写成独立知识库。

| 实体 | 核心字段 |
|---|---|
| Session | `id, owner_id, workspace_id, title, default_selection, revision, created_at, updated_at` |
| Message | `id, session_id, turn_id, parent_message_id?, role, parts[], created_at` |
| Turn | `id, session_id, workspace_id, request_id, state, requested_selection, resolved_models[], run_ids[], usage_state, context_snapshot_id` |
| ContextSnapshot | `message_ids, attachment_revisions, profile_revision, knowledge_generation, omitted_items, summary_ref?, token_budget` |

Message parts 至少支持 text、document_ref、citation_ref、attachment_ref；所有来源/运行链接用结构化对象。LLM 返回的 Markdown 文本不能自行创建可信 citation_ref。

轮次状态：`queued → running → completed|failed|cancelled|interrupted`。取消期间为 `cancelling`；沉淀状态另行记录，生成完成不等于知识已发布。刷新或断网后查询服务端终态，不能只看最后一个本地 assistant 字符串。

### 5.2 消息连续性与模型切换

后端按 message id 构造完整受限历史，最新用户消息必须出现且仅出现一次；连续发送用 session revision 控制竞争。角色和消息边界不被无分隔地拼接。Marqdo 如需要 prompt 字符串，由框架统一构造明确的角色分隔及上下文协议；应用不能重新实现 Agent loop。

换模型保留会话的可移植历史。若新模型上下文窗口较小，先给出“将使用摘要 + 最近 N 条，未包含 X 个附件”的说明；摘要有版本及原消息范围，不能覆盖原文；不可支持的模态阻止发送或由用户显式移除。用户能查看本轮实际纳入了哪些资料/偏好。

重新生成创建新的 Turn/assistant 分支，保留旧结果及旧用量；不能覆盖旧模型、引用和账本。旧版本 localStorage 导入需用户确认账户/工作区，按 legacy id 幂等导入并保留原数据备份；历史模型和用量未知时保持 unknown。

### 5.3 应用 API 与事件（拟议，不是现有接口）

首批沿用当前 Marqdo `调用表` 支持的 GET/POST 风格；以下 `/api/app/*` 是新增产品 API，与外部 `/v1/*` 分离。成功 envelope `{ok:true,schema_version:1,data:...}`，失败 `{ok:false,error:{code,message,retryable,details?},request_id}`。错误使用对应 HTTP 状态；流建立后用 terminal error event。统一修正当前 GET/POST 错误处理不一致。

| 方法/路径 | 输入与返回 | 要求 |
|---|---|---|
| GET `/api/app/providers` | 去密 Provider 列表及 models | 登录、scope 过滤 |
| POST `/api/app/providers/save` | create 或 `id,expected_revision,patch` | 凭证单独字段写入，不回显 |
| POST `/api/app/providers/probe` | provider id、测试种类 | 限流、返回 latency/capabilities/费用可能性 |
| POST `/api/app/providers/discover` | provider id | 返回待确认列表，支持无 discovery 的适配器 |
| POST `/api/app/models/save` | model/价格/停用更新及 revision | 能力来自框架与配置交集 |
| GET `/api/app/models` | 工作区可用模型目录 | 不从 `/v1/models` 推断供应商目录 |
| POST `/api/app/sessions/create` | workspace id、selection | 返回服务端 session |
| POST `/api/app/sessions/get` | id、分页 cursor | messages、turn summaries、revision |
| POST `/api/app/chat/turns` | 如下示例 | 幂等建立轮次，返回 202 + turn id/events URL |
| GET `/api/app/turns/:id/events` | `after_seq`/Last-Event-ID | SSE、有鉴权、事件可重放 |
| POST `/api/app/turns/get` | id | 轮次终态、引用、文档、用量 |
| POST `/api/app/turns/cancel` | id、request id | 幂等、确认运行时取消状态 |
| POST `/api/app/usage/query` | session/workspace/model、时间窗/cursor | 服务端聚合及 coverage，不读 localStorage 统计 |

若现有调用表暂不支持动态路径，可用 query `turn_id`，但 OpenAPI/前端 client 必须只有一份正式定义。SSE 持续输出依赖配套 M02；未到位期间可先轮询状态，界面写“处理中”，不宣称逐字流式。

```json
{
  "request_id": "req-unique-1",
  "session_id": "sess-1",
  "expected_revision": 7,
  "workspace_id": "ws-1",
  "selection": {"mode": "manual", "model_id": "mdl-2"},
  "message": {"id": "msg-8", "parts": [{"type": "text", "text": "解释这条知识的适用条件"}]},
  "attachment_ids": []
}
```

相同 request id + 相同规范化请求返回同一轮次；不同内容复用 request id 返回 409。服务端唯一约束负责防重，不依赖禁用按钮。

事件共同字段：`schema_version,event_id,seq,type,session_id,turn_id,workspace_id,created_at,payload`。类型为 `turn.started`、`model.resolved`、`message.delta`、`citation.available`、`document.available`、`usage.updated`、`turn.completed|failed|cancelled`。runtime/tool progress 可选独立事件，默认折叠。seq 在轮内单调，客户端按 event id 去重；done 只能由服务端终态产生。连接断开后重放事件不重新调用模型。

AbortController 仅断开传输；“停止”还要发 cancel。停止后保留可读部分并标“已停止”，用量可稍后结算为 final/partial/unknown。服务重启导致执行失联标 interrupted，不能自动重试有外部效果的 BUILD。

`/v1` 继续作为薄适配：`qdagent` 等产品别名显式映射策略；外部模型身份与产品别名不混淆。不能只把请求的 model 回显当作已使用该模型。messages 完整进入同一会话/上下文构造入口；未配置的别名明确报错。

## 6. 用量、费用与上下文可见性

### 6.1 逐调用账本

应用持久化框架发出的 `ModelCallUsageV1`（字段见配套文档），每个模型请求 attempt 一行：`call_id, attempt_id, run_id, turn_id, session_id, workspace_id, purpose, model_snapshot, status, input_tokens, output_tokens, total_tokens, cached_input_tokens, reasoning_output_tokens, usage_state, measurement_source, revision`。`purpose` 区分 answer/router/repair/summarize/learn/import/test。

唯一键 `(call_id, attempt_id)`，usage 更新按 revision 替换快照，不把累计流式计数重复相加。计量范围包含 ASK、BUILD、修复、笔记整理、知识导入中的 LLM、画像建议、连接测试和重试。后台调用可无 turn/session，但必须有 workspace 或管理 scope；对话里的子任务关联父 turn。一次重试是新 attempt，可实际收费；事件重放不是新 attempt。

保持三种不同的量：本轮消耗 tokens、当前上下文预计占用、费用估算。缓存 tokens/推理 tokens 通常是输入/输出的细分；根据适配器字段说明计算，不再与总 tokens 直接相加。数字为 null 时保留 null；部分已知总量显示“至少 X / 另有 N 次用量未知”。

纯知识复用且框架确认没有模型调用时显示“本轮未调用模型 · 0 tokens”，与“供应商未返回用量”不同。

### 6.2 费用口径

价格用带币种的定点十进制或最小货币单位，不用 JS 浮点累计。按调用时 PriceVersion 计算；对标准包含缓存子集的 token 计价，示意为：

`费用估算 = (非缓存输入 × 输入单价 + 缓存读取 × 缓存单价 + 输出 × 输出单价) / 1,000,000`

缓存写入、请求固定费用、多模态计价等按版本化规则另算；任一必需项未知则费用 unknown/partial，不强套公式。无价格配置显示“未设置价格”；多币种分开汇总，显式汇率及时间才允许换算。价格变动不回写历史金额；重新估算作为第二视图保留原版本。

`token_cost` 在当前 Marqdo Agent 中等于 tokens，绝不能显示成货币。RA/reuse_ratio 也不等同于真实省下的钱。费用只能覆盖本系统可观测调用，不包含供应商账户的其他消费。

### 6.3 展示层级

每条 assistant 底部低干扰展示“提供商 / 模型 · 完成/停止 · 用量详情”；展开看输入/输出/缓存、耗时、实际调用次数、修复及后台子任务。会话头可看累计，设置用量页按工作区、模型、日期过滤并导出。时区随用户设置，存储 UTC；时间范围采用半开区间 `[start,end)`。

选模型时可显示价格参考和上下文窗口；未知明确标“未配置/未知”。发出请求前的 token 估算不写成账单实测。预算功能首批可做提醒；后续硬限制必须在每次调用前预留并结算，不能仅在 UI 检查。

## 7. 右侧上下文阅读器

### 7.1 容器与状态

用 `ContextPanelStore` 替代仅三枚 tab 的 RightbarContext。结构：`open,width,mode,activeTarget,backStack,forwardStack,pinnedTarget,scrollByTarget,loading,error,selection`。target 为判别联合 `document|artifact|source|run|file|profile_item`，携带 workspace 和 revision；不能只有 path。

默认只有“阅读”与“相关”两个主入口。目录、来源、知识关系、实现、运行证据是当前文档的局部工具，不再每项生成一层右栏。阅读器可固定，后台新文档只加“有新结果”提示；未经点击不覆盖用户正在读的内容。

### 7.2 引用数据契约

```json
{
  "citation_id": "cite-1",
  "message_id": "msg-9",
  "workspace_id": "ws-1",
  "document_id": "doc-17",
  "document_revision": "sha256:example",
  "knowledge_generation": "generation-4",
  "artifact_id": "mq://project/example/function",
  "node_id": "stable-node-1",
  "locator": {"kind": "node", "value": "stable-node-1"},
  "relation": "cites",
  "label": "适用条件",
  "excerpt": "经过授权且版本一致时可复用",
  "resolution": "resolved"
}
```

上述值为结构示例。artifact/node 的真实值由 Marqdo 产生；应用只关联引用和消息。citation 关系枚举 `cites|supports|derived_from|executed`；`executed` 必须有绑定执行记录和 run id，不能由模型口头声称。前端显示的 `[1]` 只是当前消息的序号，不是稳定标识。

### 7.3 导航流程与版本语义

点击答案引用 → 后端鉴权并解析引用版本 → 打开文档正文 → 高亮节点 → 可进入该知识的说明/适用条件/来源 → 点来源回到对应片段 → 返回原引用及聊天滚动位置。

每次导航推入完整 target，不用浏览器整页跳走。深链可表达为 `#/workspace/:workspaceId/doc/:documentId?revision=...&node=...`；聊天的 panel 参数可用于恢复，敏感路径不进 URL。复制链接复制应用地址，不复制运行时私有 `mq://` URL。登出或工作区变化要清理不再可访问的缓存。

历史引用默认读取当时版本，页面提示“回答使用的版本”；用户可主动看最新版。若无法取回历史版本，显示“引用版本不可用”，列出最新版供选择，不能自动把高亮转到同名新知识。歧义候选由用户选择；无权限不泄漏标题/片段；未解析说明“尚未定位到具体知识”。纯文字引文仍可显示，但不冒充可导航的编译引用。

### 7.4 Marqdo View 的嵌入策略

正式路线：应用调用框架 `view.document`（拟议 M03）取得安全 HTML fragment + outline/nodes/refs，同源显示在共享 `DocumentReader`。qdagent 只负责容器、导航、样式映射和业务动作，不在 React 中重新解析 Marqdo 的遮蔽/执行语法。

普通 `.md/.txt` 由普通文档渲染服务处理，`.mq.md` 必须走 Marqdo document surface；二者共用阅读排版但保持语义区别。聊天 Markdown 可用独立 Markdown 组件，不能把 `[描述](实现)` 当作普通外链直接运行。

过渡期可用框架静态 `view output --no-exec`，仅展示经净化的正文片段；若确需 iframe，则独立只读嵌入壳、禁运行/表单/脚本，无法桥接引用时提供“在完整阅读页打开”。禁止直接 iframe 默认 live `marqdo view`：当前 live 构建路径仍可能执行文件，且嵌套导航在窄栏不可读。

打开文档/引用/来源、切主题、折叠目录不得触发执行、模型调用或写回。执行按钮只有进入明确的“运行”操作后才出现，由 qdagent 权限/产品门禁决定，并调用已有 Marqdo 执行协议；View 阅读请求永远不隐式升级。

### 7.5 阅读详情 API（拟议）

| 路径（POST） | 输入 | 输出 |
|---|---|---|
| `/api/app/documents/read` | workspace/document/revision/node | DocumentViewV1、应用标题/权限/沉淀状态 |
| `/api/app/citations/resolve` | message id、citation id | resolved/stale/unresolved/ambiguous/version_unavailable；服务端补全 target |
| `/api/app/artifacts/inspect` | workspace、artifact、generation | 框架事实 + 可见来源链接，保持验证多维状态 |
| `/api/app/sources/read` | 已授权 source id、locator、revision | 有界片段/原文、定位是否精确 |
| `/api/app/files/list` | workspace、directory id、cursor | 文件元数据及可读类型；不允许任意绝对路径 |

HTML 必须由服务端许可的渲染链净化；浏览器原始 Markdown/HTML 一律不获执行权限；`javascript:`、事件属性、危险嵌入被去除。错误有重试、返回、原文（有权限时）入口。大文件分页加载并标明剩余内容，不能无提示截断。

### 7.6 面板请求与一致性

导航状态为 `closed → loading(target,request_id) → ready|partial|error`；在 loading 时点击新引用立即创建新 request id，晚到的旧响应只能进入其缓存，不能更新当前面板。pin 状态不阻止主动导航，只阻止流式后台文档自动替换。

缓存键至少含 `owner/workspace/document/revision/generation/renderer_version`；服务端依据实际内容摘要返回 ETag/版本字段。用户只改“最新/历史”或跨工作区切换，都属于新 target。响应中的 source revision/generation 与请求不符时要求显式转换为最新版，不接受默认覆盖。

浏览器后退恢复完整页面/面板 target；面板内“返回”只退面板栈。全屏展开与收回只切 layout，保留同一节点、滚动和返回链。引用点击不自动把该资料添加进下一轮模型上下文；“加入上下文”是单独动作，显示范围、版本和预估占用。

## 8. 工作区：内容范围而非装饰性菜单

Workspace 必要字段：`id,owner_id,name,project_root_ref,kb_root_ref,data_namespace,default_selection,permissions,index_status,revision`。实际路径仅服务端配置保存，对 UI 暴露显示名和相对位置。首批单用户也要按 workspace 分区，以免以后迁移时会话、画像、用量已经串库。

会话建立时固定 workspace；切换左栏工作区不改变运行中的 session root。将会话复制到另一工作区必须是显式“新建分支”，重新处理附件和引用权限。模型 registry 可属账户，工作区有允许列表和默认选择；知识查询、View、文件、变更提案、用量查询全部校验 workspace。

文件浏览默认显示用户文档、资料、知识与相关代码；`.git`、密钥、生成缓存、依赖、二进制输出不出现在普通文件树中。支持查询标题/相对路径、类型、时间、索引状态，不把所有文件自动送入模型。每轮上下文清单解释实际读取了哪些文件。

首批支持只读文件树、文件阅读、检索、Git 状态与 diff；写操作通过既有 changes 提案，附 base digest 防止覆盖外部修改。工作区重命名不破坏引用；移除工作区先断开注册，不默认递归删除文件。离线工作区显示离线状态，保留已有会话与历史引用。

路径访问需规范化、拒绝穿越、校验 symlink 后最终路径在授权根；浏览器不能凭自填 root 越界。将现有 API 的 root/path 参数收束为 workspace/document id 解析，是正式开放工作区 UI 的前置条件。

工作区 API（新增）采用 `GET /api/app/workspaces`、`POST /api/app/workspaces/save|get|archive`。save 只允许具有配置权限的主体注册服务器根目录，普通读者只能选择被授权的 id；archive 仅断开注册。权限至少区分 read、run、edit/propose、publish、configure；单用户部署可全部授予本人，但判断仍放服务端。前端展示的 allowed_actions 是提示，不替代后端校验。session/message/usage/citation 的读取均沿 workspace 和 owner 过滤。

## 9. 笔记、知识库、上传与沉淀

### 9.1 分清对象与状态

| 对象 | 读者关注 | 状态与权威 |
|---|---|---|
| 原始资料 | 原文、出处、提取是否完整 | 上传/提取状态；源文件为权威 |
| 会话记录 / Run | 发生了什么 | 执行状态、模型用量、真实工具操作 |
| 笔记 | 结论、依据、适用范围、未决事项 | 草稿/已保存/待修订；原笔记文档 |
| 知识候选 | 可复用的知识是什么 | 草拟/待验证/验证失败/可发布 |
| 已发布知识 | 何时适用、依据、如何复用 | 生命周期与证据/验证分开；Marqdo 编译投影 |

“已保存笔记”“通过文档门禁”“已发布知识”“本次执行通过”是不同状态。答案中提示已沉淀时必须有 document id + revision + 服务端持久化成功证据；不能凭 LLM 文本或固定空态文案承诺每轮成功沉淀。

笔记列表用标题和两行摘要，不用去掉所有标点后的源码片段。详情第一屏显示结论、来源会话、适用范围/待确认点，后续展开推导、实现、验证记录和关联知识。普通手记允许简短，不强迫作者补内部 digest/治理字段。

### 9.2 沉淀流程及模型输出约束

`完成回答 → 可选/策略触发笔记候选 → 文档门禁 → 保存笔记 → 提取知识候选 → 校验/验证/去重 → 显式发布`。各步骤有独立 job/status；回复失败或取消也保留运行记录，但不自动发布半截知识。修复轮必须计入用量，失败显示可读原因和重试入口。

输出模板要求：标题、结论、依据、适用条件、未知/限制、相关知识；只有存在可执行内容才追加实现与验证。引用使用本轮 Context Pack 中可解析 id；不允许模型编造 artifact id、引用已验证、发布成功、用户偏好已确认。应用将机器部分保存为结构化元数据，读者正文保留自然语言。技术契约校验继续由 Marqdo/docgate 承担。

沉淀策略默认“自动保存有价值的笔记候选，发布知识需满足门禁”；用户可关闭自动候选。设置明确说明何时触发、用哪一个模型、可能产生额外用量；用户可手动选段沉淀。相同 turn + candidate kind 幂等生成；新修订使用新 revision 而不是复制多个不明笔记。

### 9.3 上传链闭合

当前输入服务器路径保留为高级管理入口；正式 UI 为拖拽/选择文件 → 上传进度 → 原资料卡 → 提取报告 → 草稿 View → 核验/修订 → 发布。首次只支持框架声明可提取的 TXT/Markdown；PDF/DOCX/OCR 在能力缺失时解释原因，原文件可保留但不显示已入库。

新增 `/api/app/uploads/create`（multipart，返回 upload/document id）及 `/api/app/imports/start|get|cancel`（JSON）。上传请求有体积/类型校验和幂等标识；服务端生成存储文件名，原名仅显示，目录由 workspace 决定。作业用 `upload_id`，不接客户端服务器路径；明确 ownership、过期与失败清理规则。

ImportJob：`uploaded → extracting → draft_ready → validating → ready_to_publish → publishing → published`，分支 failed/cancelled；`partial` 是提取完整性而非成功发布状态。发布记录 generation 和 draft revision；源变更后原知识标待复核，不把上传成功等同编译成功。进度按阶段和可测字节展示，不能虚构百分比。

并发导入要替换现有共享 `QDAGENT_EXTRACT_REQ` 环境变量和固定 `/tmp/qd-mlsp-ext.json` 桥接：请求局部参数/独立临时文件、正确 JSON 编码、作业独立工作目录。两份资料绝不能串内容或覆盖彼此请求。

## 10. 用户画像：可读、可纠正、有作用域

继续以画像文档为权威，通过 changes 提案修订；新增条目索引是可重建投影，不是第二套记忆真相。每项包含 `id,category,text,scope,status,source_refs,created_at,confirmed_at?,expires_at?,revision`。scope 为 user/workspace/session，status 为 proposed/confirmed/rejected/expired/disabled。

默认只把已确认且在作用域内的偏好纳入上下文；用户本轮明确指令优先。画像不是模型设置，API key/model URL 不属于画像。不能因为一句包含“喜欢”的引述、问题或临时要求就长期记住；推断建议显示“根据哪些对话提出”，确认前不生效。不主动推断敏感身份或以偏好覆盖知识验证事实。

界面分为“已生效”“待确认”“历史”，每项可编辑、禁用、确认、拒绝、查看来源；同属性冲突并列提示，以人工确认的新修订替代，不能无痕覆盖。重置预览 diff 并经已有提案流程，保留审计。

聊天上下文详情显示“本轮采用了 3 条偏好”，可逐条定位。删除/禁用后下一轮不再注入；历史运行记录只说明当时采用过该 revision。对不能追溯到来源的旧画像标 legacy，不自动伪造来源。若用户要清除历史副本，应单独说明缓存/日志保留范围并执行相应清理流程。

画像 API 增加 `/api/app/profile/get`（scope、revision）、`/api/app/profile/propose`（base revision、条目变更及 source refs），复用既有 change apply/reject。apply 需要 base digest 一致，冲突时返回新旧差异而非覆盖；get 返回投影条目和原文 document ref。既有 profile_update 的 task/result 兼容入口仅产生建议，不直接把关键词追加视为 confirmed。画像原文、投影缓存、提示词注入三者必须可用同一 revision 核对。

## 11. 统一前端系统与可读性标准

### 11.1 风格及组件边界

保留现有主题基础，收敛到应用语义 tokens，避免页面大量复制 inline style。统一中性底色、清晰正文、单一强调色；状态色用于状态而非装饰；明暗主题共用语义，Marqdo fragment 映射到同一 tokens。现有 `dsw-*` 暂作兼容实现，不再让业务组件直接依赖厂商品牌 token。

| 语义 token / 规则 | 初始设计值 |
|---|---|
| `--qd-font-body / --mq-font-body` | 系统无衬线 + 中文 fallback；代码单独等宽 |
| 阅读正文 | 桌面 16px / 1.75，窄屏至少 16px；中文宽度约 36–46 字，英文约 65–80ch |
| 交互文本 / 辅助文本 | 14px / 1.5；辅助 12–13px，不能承载唯一重要状态 |
| 标题 | 24/20/18px，靠层级与留白区分，不把任意字段放大成标题 |
| 间距 | 4/8/12/16/24/32/48px；段落和分节间距统一 |
| 颜色 | bg/surface/text/muted/border/accent/danger/warning/success；颜色之外有标签和图标 |
| 控件 | 常规 36px，移动点击目标至少 44px；可见 focus，disabled 有原因 |
| 阅读内容 | 正常文字不依赖低透明度灰色；摘要可截断，正文不省略 |

组件分层建议：`layout/AppShell, ContextPanel`；`chat/ModelPicker, MessageRenderer, UsageSummary, CitationLink`；`reader/DocumentReader, Outline, KnowledgeDetails, SourceExcerpt`；`knowledge/DocumentList, ImportProgress, LifecycleBadge`；`profile/ProfileItem, ChangeReview`。数据加载放 hooks/query/service，页面组合，不由 DesktopFrame 加载所有业务数据。

状态分开：server entities cache、session/turn 状态、reader 导航状态、view preference。`streaming` 改为 per-turn，局部忙碌不能锁死所有页面；旧流只更新其 turn/message id，不按“最后一条 assistant”盲写。

### 11.2 阅读与可访问性行为

Markdown 支持标题、列表、表格、链接、引用、代码；公式能力按实际渲染支持开放。流式时可用稳定分块渲染，完成后再完成文档布局；新 delta 不夺焦点、不强制滚到底，用户离开底部显示“新内容”。中文输入法 composing 时 Enter 不发送。

引用有明确可点击名称、键盘可达和返回焦点；模型选择器可键盘搜索；拖动边界同时提供键盘调整/重置；侧栏关闭恢复触发控件焦点。状态变化用适量 live region 通告，不能逐 token 朗读。表格有表头，outline 用真实层级，代码提供复制但正文选取不被阻断。

正常正文对比度设计目标至少 4.5:1，焦点/关键图形至少 3:1；需要实测。暗色主题不能出现黑色连接线/透明遮罩遮住文本。尊重 reduced motion，自动滚动和加载动画可减少。页面通用 loading/empty/error/partial/stale/offline 状态有统一组件；错误不能静默转为空列表。

### 11.3 可读性验收任务

用含中文长标题、复杂表格、普通笔记、可执行步骤、过期来源、长代码的固定语料测试。至少 5 名未参与实现的读者完成：辨认当前模型；找到本轮用量；从引用到具体知识及来源；分辨已保存/已发布/已验证；返回原对话；纠正画像。每项至少 4/5 在 30 秒内无指导完成作为初始目标，记录失败原因并迭代；点击数、耗时与访谈比“看起来像聊天产品”更能验证可读性。

## 12. 存储、兼容与逐步上线

配置存 `providers/models/credentials/price_versions`；运行索引存 `sessions/messages/turns/model_calls`；工作区 registry 与授权独立；内容继续在文档库中。为每张表定义 schema migration 版本，不能只靠 `init` 隐式假设字段升级成功。唯一约束、事务和 revision 冲突处理是交付条件。

可复用 Marqdo `ext/data/db.mq.md` 的 `migrate/exec/事务` 与现有 SQLite 后端；它已有版本迁移和事务原语，此处不是新的框架缺口。具体 schema 在 Q00 固化，至少包含以下约束/索引：

| 对象 | 必要约束或索引 |
|---|---|
| models | UNIQUE(provider_id, upstream_model_id)；外键 provider；历史快照不级联删除 |
| turns | UNIQUE(owner_id, request_id)；session/workspace 外键；索引(session_id, created_at, id) |
| messages | 稳定主键；索引(session_id, created_at, id)；属于明确 turn |
| model_calls | UNIQUE(call_id, attempt_id)；revision 单调；索引(workspace_id, started_at, model_id) |
| turn_events | UNIQUE(turn_id, seq) 及 UNIQUE(event_id)；按 seq 重放；有限保留策略 |
| document_refs | 关联 source revision/generation；索引(document_id, revision)；不存第二份独立知识语义 |
| proposals/import_jobs | owner/workspace、幂等 request id、base revision、状态与更新时间 |

建立轮次必须在同一事务提交 user message、Turn、context/model snapshot 与待执行 job；只有提交成功才启动运行时。usage 事件先幂等落库再通知 UI；轮次终态与最终消息/引用索引/终态事件原子落库。job claim 使用唯一执行租约，避免两 worker 同时执行同一轮；崩溃后未知执行状态设 interrupted，不能靠“重试 job”重复外部副作用。

文件保存和 SQLite 不是同一事务：正文写独立临时版本并校验 digest，再原子替换/发布；记录可恢复的 pending journal，最后更新索引。恢复时以实际文档版本和发布 manifest 为准，修复索引，不宣称分布式 exactly-once。只有持久化成功才发送 document.available/已保存提示。凭证单独服务端保护存储，数据库导出/日志/客户端状态不包含明文密钥。

迁移步骤：备份旧 settings → 事务创建 legacy provider/model/default → 将已有密钥转服务端 credential_ref → 校验可读 → 标记迁移版本。环境配置作为显式“环境托管提供商”导入，不静默覆盖 UI 配置；旧 ASR/TTS 配置暂留。迁移重复执行不得新增重复模型。

旧会话不伪填历史用量或模型；旧 profile 正文保留；旧路径通过授权映射为 document id。新字段不可用时允许只读旧页面，不能用回退隐藏真实错误。功能开关分别控制 model_registry/chat_v2/reader_v2/workspace_v2/profile_v2；回滚关闭新入口但保留新增账本及文档，禁止破坏式降库。

模型注册、会话上下文、知识引用 schema 通过合同 fixture 测试锁定；版本不兼容明确提示升级。部署同时核对 CLI、ext、native plugins 和支持能力，不能只依据 CLI≥2.1.2 就显示新功能已支持。

错误码最小集合：401 `auth.required`；403 `workspace.forbidden`；404 `resource.not_found`；409 `revision.conflict|request_id.conflict|reference.stale`；422 `model.unsupported_input|model.unavailable|document.unsupported_format`；429 `rate_limited`；503 `runtime.unavailable|provider.unavailable`。业务拒绝如验证未通过包含 phase、诊断和修复建议，不能被吞成空列表。事件流启动后的失败仍发送结构化 terminal event，并保留可查询状态。

## 13. 实施拆分、跨仓依赖与完成定义

| 任务 | 主要改动位置 | 依赖 | 可独立验收产物 |
|---|---|---|---|
| Q00 契约与基线 | 本文、API schema/fixtures、测试目录 | 无 | model/usage/view/citation 示例及错误矩阵，固定语料 |
| Q01 配置注册 | `db/*, lib/api, serve, SettingsPage`，新增 `model/*` | M01 基础 handle 已有，可先接现有兼容端点 | 两 provider 各两模型保存/选择/停用，迁移幂等 |
| Q02 会话与显式调用 | `execution/session, agent/qdagent, gateway/openai, session-store` | Q01、M01 参数/历史合同 | 最新消息及历史完整；两会话模型不串；旧 v1 兼容 |
| Q03 用量账本 | 新 `execution/usage`、db、消息页脚、用量页 | M01/M02 的逐调用事件 | 修复/后台/重试计量、去重、unknown、定价版本 |
| Q04 只读工作区与阅读器 | 新 workspace/reader 服务、DesktopFrame、WorkspacePage | M03 | 授权文件浏览；无执行 View；返回/深链/窄屏 |
| Q05 引用导航 | CitationLink、ContextPanel、knowledge adapter | Q02/Q04、M04 | 历史版本跳转、来源、过期/歧义/无权限 |
| Q06 真流式与取消 | `serve, lib/api, api.ts, session-store` | M02、Q02/Q03 | 首 token 在完成前到达；断线恢复；取消后无新调用 |
| Q07 上传与沉淀 | `KnowledgePage, NotesPage, knowledge/import/evolve, changes` | Q04/Q05、M05 现有提取基础 | 本地上传→草稿阅读→验证→发布→引用复用 |
| Q08 画像与上下文说明 | `lib/profile, changes, profile page, context` | Q02/Q04 | 建议/确认/禁用、作用域、历史与实际注入一致 |
| Q09 可读性与发布 | styles、共享组件、e2e、部署脚本 | 前述集成 | 全尺寸/键盘/主题/升级回退验收 |

并行开发可以基于共同 JSON fixtures，接口实现未交付时 UI 显示未支持，不以假数据宣称完成。最小可用发布应包含 Q01–Q05、Q09 对应切片；完整本需求须完成 Q06–Q08。正式验收不能把仅有配置表、占位页或静态截图算作能力交付。

## 14. 验收矩阵与测试策略

| 编号 | 场景 | 必须观察到的结果 |
|---|---|---|
| T01 | 两 provider、各两 model，模型上游 id 重名 | UI 分组清楚，服务端按组合身份调用正确端点 |
| T02 | A/B 会话并行、运行时改默认与密钥 | 当前轮快照不变，后续轮用新版本，无环境串扰 |
| T03 | 首条/第二条/重生成、含中文输入法 | 每条 user 恰好一次，历史连续；新生成不覆盖旧计量 |
| T04 | 用户固定模型、路由/修复/子任务 | 不私自换供应商；额外调用有 purpose 与身份 |
| T05 | usage 缺失、取消、失败后重试 | unknown/partial 有解释；实际重试分别统计；无虚假零费 |
| T06 | 3 次累计 usage 事件、重放整轮 | 账本最终值只计一次，模型/会话/工作区汇总一致 |
| T07 | 费用版本修改、缓存细分、多币种 | 不重复算缓存/推理 tokens；历史价格不漂移，不无汇率相加 |
| T08 | 首 token、断网重连、服务重启、停止 | 实际持续流；重连不重跑；终态可查；停止可确认 |
| T09 | 引用→知识→来源→后退 | 节点正确高亮，文档与聊天滚动恢复；无执行/写回/LLM |
| T10 | 历史来源改变、知识重命名/删除 | 原版本可查或明确不可用，不跳错同名新节点 |
| T11 | 旧请求晚回、跨工作区同名文件 | 旧包不覆盖新目标，权限隔离，缓存按作用域区分 |
| T12 | 上传 TXT/MD、超限、PDF 无插件、并发导入 | 无假成功；partial 可见；两作业内容隔离；失败可恢复 |
| T13 | 生成成功而沉淀失败/验证失败 | 答案保留，状态分别解释，不标已发布或已验证 |
| T14 | 画像引用他人偏好、确认/禁用、冲突 | 不自动确认；下一轮实际上下文遵循启用作用域 |
| T15 | 恶意 HTML/URL、路径穿越、越权引用 | 不执行脚本或泄漏资源，错误不显示私有内容 |
| T16 | 390px/200% 缩放/暗色/键盘/长表格 | 正文可读，无全页横溢；焦点与返回可用 |
| T17 | 旧 settings/localStorage 重复迁移与回退 | 数据不丢、不重复；无法确认的历史字段保持未知 |

建议测试分层：纯状态/用量归并单测；假供应商 HTTP/SSE fixture 合同测试；Marqdo 与应用进程集成测试；真实浏览器端到端测试；可选真实供应商 smoke（单独配置凭证/预算，默认 CI 不调用付费接口）。前端尚无测试脚本，Q00 要补齐，不把当前 build 当行为测试。

既有 `scripts/check-v1-thin.sh`、knowledge gate 和 HTTP smoke 保留；扩展 smoke 的断言，从“状态码可接受、ok=false 记录为 soft”升级为逐路由预期，关键动作必须失败即阻断。新 API 不得为了通过 smoke 把错误返回 200 的成功假象。

性能为待测目标：本地固定 1000 知识单元/100 文档 fixture，热读取 P95≤500ms、冷读取 P95≤2s，UI 面板开启到 loading≤100ms；记录机器/数据规模，不能把 compile smoke 当浏览器性能证据。大文档按块渲染，流式不要每 token 重建整个历史 DOM。

## 15. 本次审阅的验证边界与交付记录

本次为文档设计及源码审阅；未实现新配置、会话或前端组件，也未进行供应商付费请求。已运行既有 `scripts/check-v1-thin.sh`，结果通过；Marqdo 知识门禁结果及限制见配套文档末节。HTTP smoke 会产生应用数据，本次未把它当只读审阅运行。

开发 PR 必须附：对应 Q/M/T 编号、schema/迁移版本、调用及状态证据、正常/异常界面截图、相关自动化结果、剩余限制。任务状态从 proposed→in_progress→verified，每项有验收链接后才能标 verified。发布说明明确支持哪些适配器、哪些用量可测、哪些格式可提取、历史版本能保留多久。

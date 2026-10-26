# 工作台运行时与产品闭环复核（2026-10-26）

| 项目 | 基线 |
|---|---|
| 状态 | 源码复核；新增缺陷及开发输入，不是修复完成声明 |
| qdagent | `64b97e5`，`master`；本轮从 `2aa6a6e` fast-forward |
| Marqdo | `1b11fe0`，`main`；本轮从 `663a8ba` fast-forward；源码版本 2.1.3 |
| 日期 | 2026-10-26，Asia/Shanghai |
| 产品实施规范 | [可靠工作台详细开发设计](../design/reliable-workbench-development-2026-10-26.md) |
| 框架实施规范 | [隔离执行与响应式 Web 运行时](../../../marqdo/doc/design/isolated-web-runtime-development-2026-10-26.md) |

## 1. 结论与证据口径

最新变更已经提供模型注册表、冻结模型选择、用量账本、DocumentView、引用、上传入口和 live SSE。当前主要问题是隔离、状态一致性和实际生产链路：**短请求仍被长任务阻塞；SSE 的请求身份仍穿过进程级变量；部分 UI 状态没有对应的知识发布事实；性能缓存尚未复用编译结果。**

本次按 `serve → lib/api → 实际处理函数 → Marqdo/数据库/文件 → 前端` 追踪，不能用另一个同名模块或单元测试代替实际路由证据。所有“源码确认”只说明当前控制流，不等同于已经在浏览器或真实模型上复现。安全影响按宿主文件权限和部署鉴权范围评估，不从一个字符串拼接问题直接推导任意系统访问。

证据分为：

- **源码确认**：在固定提交中可直接定位的行为。
- **实验确认**：本轮命令或探针给出了结果，见 §5。
- **待端到端验证**：存在跨层风险，须由规定的负例确认影响范围。
- **目标设计**：新增合同、状态和指标，尚未实现。

阅读依据包括 [10-24 产品缺口](03-knowledge-ingestion-and-sedimentation-2026-10-24.md)、[10-25 工作台设计](../design/multi-provider-and-knowledge-workbench-2026-10-25.md)、[工作台发布说明](../releases/workbench-2026-10-25.md)、Marqdo [10-26 串行化缺陷](../../../marqdo/doc/design/web-invoke-serialization.md)、[ADR 0008](../../../marqdo/doc/adr/0008-web-invoke-serialization.md)、[框架知识缺口](../../../marqdo/doc/roadmap/qdagent-knowledge-support-gaps-2026-10-24.md)。旧文档按其原提交理解，以下发现使用新的 `Rxx` 编号，避免与两份旧文档中不同含义的 Q01/M01 混用。

## 2. 旧缺陷的当前处置

| 历史判断 | 当前证据 | 本轮结论 |
|---|---|---|
| 版本仍停留在 2.0、没有工作台合同 | `scripts/marqdo-env.sh`、CI 已要求 2.1.3；fixtures 已存在 | 不再作为未实现项；仍须验证 CLI/ext/native 的实际部署组合 |
| 来源修改和缺失锚点不影响业务句柄 | `tests/executable_knowledge.rs::m02_source_change_invalidates_business_handle` 已覆盖锚点、修改、删除；句柄包含闭包摘要 | 不能照抄 2.1.1 失败为当前失败；以本轮测试记录为准 |
| BUILD 无条件 `l1_ok=True` | `agent/qdagent.mq.md::build_finish` 已按 live 模式计算 `l1_ok` | 原反例有修正；继续检查产品真实发布入口，不泛称全部门禁缺失 |
| 完全没有上传/提取入口 | 实际 `/api/app/uploads/create`、`imports/start` 存在，Marqdo 有 text/Markdown 提取器 | 已有初版；发布与知识生成仍有 R07/R08 断点 |
| 完全没有流式输出 | `handleInvokeLiveSSE`、LLM delta bridge、前端消费者存在 | 已接线；隔离、取消、分帧和恢复尚不完整 |
| 阅读默认会执行上传代码 | `view.document` 使用语义编译而非求值，已有 no-exec 测试 | 保留这项能力；浏览器 HTML 安全是另一个边界 |
| PDF/DOCX/OCR 已自动支持 | 提取器明确返回外挂需求/失败 | 仍是未开放能力；不要在界面列为可用 |

## 3. 当前缺陷清单

### R01 · P0：长请求与短请求共享解释器

**源码确认。** Marqdo [`src/host/plugin.rs`](../../../marqdo/src/host/plugin.rs) 的 `GLOBAL_HOST`、`GLOBAL_LIB_PATH`、`INVOKE_LOCK` 与 `host_query` 路径让 worker 回调串行进入一个可变宿主。`acquire_invoke_lock` 默认等待 1500ms。Go handler 并发不等于 Endpoint 并发。

**影响。** 设置、模型列表、阅读和产品取消路由都可能遇到 503；第二个长会话也不能正常并行。最新限时争锁是防无限等待的缓解。

**要求。** 保留锁的内存安全作用，采用独立进程执行池和独立控制/读取通道。两条长流期间短请求成功、取消仍可达，是根治判据。

### R02 · P0：SSE 桥在争锁前修改全局变量，断连后提前清理

**源码确认。** [`routes_invoke.go::handleInvokeLiveSSE`](../../../marqdo/plugins/web/internal/httpx/routes_invoke.go) 先 `os.Setenv(MARQDO_EVENT_FORWARD/MARQDO_CANCEL_TOKEN)`，随后才在 goroutine 调 `CallLibPath`。第二个请求即使最终 busy，也已经替换变量；defer 恢复/清除变量并删除文件。断连分支写取消后直接 return，没有等执行 goroutine 确认退出。LLM 和 host event bus 按环境变量选择输出。

**可推导交错。** A 正在执行 → B 改写桥路径 → B 忙失败并清理 → A 后续 token 或取消观察到 B 的路径、已删除路径或空变量。实际污染频率需双流屏障实验确认，不能因解释器锁存在就认定安全。

**要求。** 请求上下文显式传递；兼容环境只在启动专属子进程时设置。订阅结束与任务结束分别管理。执行器退出/被回收前不能删除其仍使用的取消与事件资源。

### R03 · P0：取消与终态不是同一条权威路径

**源码确认。** 实际路由调用 [`lib/workbench.mq.md::turns_cancel`](../../lib/workbench.mq.md)，并非 `execution/turns.cancel`；它无条件更新为 `cancelling`，不存在时还创建占位 turn。`execution/turns.complete` 无条件写终态并清零取消标记。前端 [`cancelTurn`](../../frontend/src/stores/session-store.ts) 先 abort，再 best-effort 调会受锁影响的取消 API。

Marqdo `workbench/run_context.rs::cancel_requested` 把空 token 文件视为取消，`plugins/llm/src/lib.rs::cancel_requested` 则明确空文件不取消。两种判断存在语义差异；是否触达同一产品路径须分别验收。

**要求。** 统一 CAS 状态机、独立控制通道、取消确认、执行超时和外部副作用记录；终态不可回退，未知 turn 返回 404。断流本身不能宣告任务已停止。

### R04 · P1：流协议缺少稳定恢复边界

**源码确认。** `handleInvokeLiveSSE` 在执行接纳前发送 HTTP 200 和 `run.started`；busy 只能表现为流内失败。`drainForward` 用 Scanner 读取正在追加的文件，EOF 未换行片段也会被当成完整 token，offset 无条件加 1，未检查 `Scanner.Err()`。现有测试只覆盖完整换行。前端 `POST_STREAM` 按单行 `data: ` 解析、忽略解析失败，没有 Last-Event-ID/持久游标恢复。

**要求。** 接纳在响应头之前；App SSE 与 OpenAI stream 分协议；以完整帧和稳定事件 ID 投递，支持断点续订、去重、背压；半行不能静默损坏。见框架设计 §7。

### R05 · P1：分析缓存命中不减少编译，摘要范围不完整

**源码确认。** [`build_document_view`](../../../marqdo/src/workbench/document_view.rs) 调用 `begin_analysis` 后无论 `is_leader` 是否为真都执行 `compile_project`。[`analysis_cache.rs`](../../../marqdo/src/workbench/analysis_cache.rs) 只保存摘要、不保存编译结果；摘要只扫描根目录 `read_dir(...).take(200)`，先截断后排序，不递归。`CompileOptions::for_path` 提前失败可能跳过 finish，ticket 没有 Drop 清理。

**影响。** 统计“命中”不等于热读加速；未来直接跳过编译又会引入嵌套依赖失效风险。已有 F14 不能替代真实编译次数测量。

**要求。** 缓存不可变编译快照和实际结果；使用编译器完整输入闭包，RAII 收尾、失败不写成功缓存、有界内存和超时。

**实验确认的独立性能问题。** 本轮 debug 回归中 `v3_corpus_1000_compile_smoke` 耗时 **243.012401483s**，超出该测试 `<180s` 的现有门禁。此项是第一次知识编译，不是 DocumentView 热缓存测试；需要单独 profile。测量来自全套测试运行，期间还执行了其他构建，不是独占机器的 release 基准，不能直接宣称生产耗时为 243s 或把根因全部归于缓存。

### R06 · P0/P1：实际阅读桥丢版本、固定临时文件、引用参数不完整

**源码确认。** `serve → api.app_documents_read → workbench.documents_read` 读取 revision/node_id，但构造 MLSP JSON 时只传 project/document/mode；使用固定 `/tmp/qd-view-doc-{req,out}.json`。`citations_resolve` 也使用固定文件，客户端提供 locator 时直接放在 params 中，没有补入已解析的授权 project。Marqdo 支持平铺或嵌套 locator，但需要 project_id/project；当前 CitationLink 可能只提供 `{kind:"node",value:nodeId}`，不能满足精确定位。未知 workspace 没有立即拒绝而可能回退到 `.`。

前端 [`DocumentReader`](../../frontend/src/components/reader/DocumentReader.tsx) 的 citation 分支随后只用 document ID 读取，未携带已解析的历史 revision/generation/node。`lib/workspace` 中另一个读取实现不能证明实际 HTTP 入口已经修复。

**要求。** 使用结构化 MLSP transport，端到端携带定位元组；未知工作区拒绝；按权限作用域解析资源；无历史版本时诚实返回不可用。不得用当前正文冒充历史引用。

### R07 · P0：产品发布仅改变状态，未发布知识

**源码确认。** [`workbench.imports_start`](../../lib/workbench.mq.md) 调 `eng_imp.import_txt` 后将原始 upload path 写入 draft_path，没有采用返回的 draft/evidence。`imports_publish` 仅更新 `import_jobs.status=published`，未调用 `knowledge/import.publish_draft`、知识编译或活动代切换。

**影响。** 用户看到“已发布”，但知识源码、编译代、检索/执行证据未建立。T13 只检查状态字段，允许 import 失败走通过路径，不能发现此断点。

**要求。** 以实际发布 manifest 为事实源；成功后再投影 UI 状态；发布失败时旧代不变；下一次问答实际 bind/execute 新知识是必要验收。

### R08 · P1：导入草稿仍是模板，摘要与身份不可靠

**源码确认。** [`knowledge/import.mq.md::draft_from_extract`](../../knowledge/import.mq.md) 计算 body_text 但没有放入生成知识正文；草稿主体为“待审阅”和打印标识。变量 src_digest 取的是 extractor_version，写入 source_digest；时间戳精确到秒的 stem 可能碰撞。import_txt 将 check 结果嵌入返回，但顶层仍固定 ok=True。

**要求。** 保存真实原件/正文摘要和来源片段，生成有内容的知识单元；检查失败进入 needs_input/failed；随机 ID、内容幂等及候选摘要分别承担不同职责。

### R09 · P0：上传路径和幂等未按工作区闭合

**源码确认。** 实际 `workbench.uploads_create` 将调用方 request_id、filename 拼入文件路径，写入前没有工作区资源授权或 filename/request_id 路径规范化；格式判定使用 contains；同 request_id 直接覆盖文件与 DB。workspace_id 主要作为记录字段，未选取对应 kb_root。

**边界。** 宿主 fs-root 可能限制能触达的范围，但不能替代工作区内的隔离。另一个 `lib/uploads` 中的校验不覆盖这条路由。

**要求。** 路径由服务端生成；request_id 只用于索引；使用原件摘要+目标库+转换版本判重；同键异内容返回 409；授权由实际 owner/workspace/resource 三元组完成。

### R10 · P1：读数据库隐含批量写文件

**源码确认。** [`db/index.mq.md::open`](../../db/index.mq.md) 每次初始化表、迁移、修复配置，并调用 [`run.同步库`](../../lib/run.mq.md)，后者查询最多 500 条 run 并逐条写正文文件。

**影响。** 模型列表/用量/设置等普通读取可能携带额外 I/O，增加锁占用与尾延迟；500 条上限也不是可靠完整同步。

**要求。** 启动迁移一次，连接复用；正文写入按增量 outbox；恢复同步是显式后台任务；普通 GET 验收包含“无文件写入”。

### R11 · P1：请求幂等与跨入口状态语义不完整

**源码确认。** 前端 streamChat 未提交 request_id；`turns.create` 默认按秒生成 ID 并扫描最近 500 条判重，未比较内容摘要。数据库已有 request_id 唯一索引，不能声称完全没有唯一约束，但现有查询没有实现作用域化、同键异请求冲突和复用终态。多个入口的 cancel/reader/upload 逻辑重复。

**要求。** 客户端提前生成请求标识；数据库复合唯一键原子接纳；统一业务服务函数；所有 HTTP/CLI/MCP 对同一资源返回同一状态。

### R12 · P1：错误和超时没有覆盖完整响应生命周期

**源码确认。** `api.ts` 对对象 error 使用 `new Error(json.error)`，可能显示 `[object Object]`；busyMessage 优先原始 detail，中文提示不一定出现。fetchWithTimeout 在 fetch 收到 headers 后即清除计时器，随后 res.json 的读取不在超时内；POST_FORM 和 stream 没有同样的期限设计。

**要求。** 结构化 ApiError；区分握手、完整响应、SSE 空闲和任务 deadline；UI 保留数据、给出明确恢复操作；仅幂等读可自动重试。

### R13 · P1：阅读不执行语言代码，还需完整 HTML 信任边界

**源码确认。** Marqdo fragment 的显式过滤函数只移除 script 标签；前端 `applyView` 将 html_fragment/render.fragment/data.text 混合，并用“包含 `<`”判断是否作为 HTML，再交给 dangerouslySetInnerHTML。不据此断言所有现有 Markdown 渲染分支都允许 XSS，但文本和 HTML 类型未严格区分，过滤合同不足。

**要求。** 明确 plain_text 与 sanitized_html 类型；原始文本始终转义；HTML 白名单移除事件属性、危险 URL、可执行 SVG/嵌入；针对实际 HTTP + 浏览器链路添加负例。

### R14 · P1：验收存在空通过和路径覆盖偏差

**源码确认。** T12 顺序调用两个上传函数，不能证明并发隔离；T09/T10 测 `lib/workspace`，实际读路由经过 `lib/workbench`；浏览器 usage 测试没有创建 assistant footer；服务不可达可 skip。Go cancel 测试只是写/读 token 文件，不验证执行器被取消；F14 应测实际 compile 次数而非统计计数。

**要求。** 发布门禁固定数据、启动真实服务、启用 require-server；合同/模块/HTTP/浏览器/故障测试分层；关键场景的 skip、空数据、未调用均为未验收。

## 4. 修复优先次序

1. **防错误事实与串扰**：R02/R03/R07/R09；R01 暂保留短超时，禁止宣传多请求执行隔离。
2. **根治可用性**：进程隔离执行、独立控制和读取容量；同时消除 R10，避免把慢读复制到更多 worker。
3. **闭合知识与阅读**：R06/R08/R11；发布、版本、引用、知识消费连成可验证路径。
4. **性能与体验**：R04/R05/R12/R13，配合 R14 的端到端门禁后再宣称完成。

P0 表示应阻止相关能力被宣称可靠或进一步扩并发；不要求关闭所有无关功能。迁移细节、任务拆分和指标以两份实施设计为准。

## 5. 本轮验证记录

本轮只改开发文档与索引，不执行真实模型任务，不发布用户知识。后续复核须记录命令、版本、退出码和失败用例，不能把历史发布说明当作本轮结果。

| 项目 | 命令/证据 | 本轮结果 |
|---|---|---|
| 仓库同步 | 两库 `git pull --ff-only` | 成功，基线见页首；同步前均无本地变更 |
| 合同 fixtures | qdagent `python3 scripts/check-contracts.py` | 5 组通过；仅证明 fixture 自洽，不证明实际接口遵守 |
| Rust 知识回归 | Marqdo `cargo test --offline --locked --test workbench_contracts --test executable_knowledge` | exit 101；先执行 executable_knowledge：44 passed / 1 failed；失败为 `v3_corpus_1000_compile_smoke`，243.012s > 180s；后一个 suite 未继续执行 |
| 旧失效反例 | 上述 executable_knowledge 中来源变更、缺锚点与闭包摘要测试 | 当前均通过；不再引用旧版失败作为当前证据 |
| Rust 工作台回归 | 单独 `cargo test --offline --locked --test workbench_contracts` | 沙箱内 26 passed / 1 环境失败；F02 在创建本地 listener 时被拒绝 |
| F02 环境重试 | `cargo test --offline --locked --test workbench_contracts m01_f02_agent_step_selection_and_resume -- --exact`（允许本地监听） | exit 0，1 passed / 26 filtered；合计 27 个工作台用例均已有通过结果，非同一次无沙箱全套执行 |
| Go Web 回归 | `plugins/web` 中 `go test ./internal/httpx` | exit 0，通过；首次被只读缓存阻止，权限重试后通过 |
| 浏览器、真实 provider、多用户压力 | 未运行 | 未验证；当前环境未发现可用 Node 命令，不以源码阅读替代 |

性能目标是新设计的验收预算，不是本轮性能实测。所有新缺陷均可先通过源码定位复核，再补指定实验，禁止把待验证风险写成已观测线上事故。

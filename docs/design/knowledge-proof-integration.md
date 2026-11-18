# qdagent × Marqdo 2.9.1：知识编译、证明和智能体执行的集成设计

> **性质**：开发契约/分阶段实施计划，而不是“qdagent 已集成形式证明”的验收报告。上游依据固定为 Marqdo **v2.9.1** 的 `src/knowledge/`、`doc/design/verified-knowledge-compiler-boundaries.md`、`doc/design/knowledge-proof-2.9.md`；上游主分支发生变化时必须重新核对。当前 qdagent 的 PDF/源码知识发布流程仍是独立的业务工作流。

## 1. 定位：三层证据，而非一次性把 Lean 塞进 Agent

目标是让一个小模型只拿到“**下一个可执行动作 + 当前知识条目的最小证据摘要**”。Marqdo 编译器建立来源、身份和依赖；可证明时运行 Lean；不能证明时仍保留可执行函数、独立测试、来源和未知边界。禁止通过扩展模型系统提示来模拟证明，也不要写另一套知识图、AST 解析器、定理状态机或 Python 工具循环。

| 层级 | 上游可用机制 | qdagent 使用方式 | 不能推出 |
|---|---|---|---|
| L1 可寻址/可溯源 | SemanticProject、SymbolId、anchor_id、definition_digest、closure、引用图 | 把任务材料与具体锚点、引用、当前源码版本绑定；按所需函数取上下文 | “链接可执行”“引用已证” |
| L2 有界形式证明 | `prove`、`knowledge proof-deps --verify`、`compose`、`replay` | 对目标性质核验真实证书与模型作用域；把证书当成证据引用 | “完整语言和外部业务已证” |
| L3 实际执行/经验 | 已有冻结测试、源码 SHA、插件/文件效果门、实际测试收据 | 对不可证或外部系统请求真实测试/实验，附环境版本与错误 | “通过若干案例就构成定理” |

## 2. 知识身份、来源与引用（首批对接）

- 原始材料、源文件、签名及契约是事实源；`.marqdo/` 下投影是**可重建索引**，不是第二套权威数据库。独立保存用户上传原件与页码/摘要，避免把 OCR 未核对文字变成可信事实。
- 标记步骤在所属函数内有唯一名称时可产生稳定 `SymbolId#anchor-sha256(normalized_label)`，其 `definition_digest` 随内容变化；同函数重复标记必须视为歧义。编译投影包含 `steps.json`、`refs.json`、`claims.json`、`anchors.json`、`graph/edges.json`、`proof-index.json` 及 `proof-obligations.json` 等；具体位置按当次编译产物核对。
- 文字链接 `[依据](#@标记)` 和跨模块解析后的地址只表示**知识引用**；它们不自动执行目标、调用插件或证明被引用语句。表达式位置的普通 `[说明](payload)` 仍按原语言规则执行，二者不能混淆。跨模块完整地址从编译器索引读取，不手造 SHA。
- 定理标记/claim、实际调用点/BoundCall 和内部步骤锚点是**不同对象**。函数证明报告中的 `related_anchor_ids` 只是同函数导航，不能把每条内部步骤都标成已证。
- qdagent 后续检索响应应只交付：`symbol_id`、锚点/源码位置、接口及效应、当前定义/依赖摘要、可用证据等级、缺失义务。全文、完整 Lean 源码和整棵 SKILL 树均按需单独获取。

## 3. 真实 CLI 操作面与输出等级

以下命令在**隔离、已授权的知识工程根**内运行；命令写在开发文档中，不等于允许小模型运行 shell。qdagent 的真实执行必须走受控的 Marqdo/ABI，标定效果、路径、资源与所有者：

```sh
marqdo knowledge .
marqdo prove path/to/claim.mq.md --json
marqdo knowledge proof-deps --json .
marqdo knowledge proof-deps --verify --strict --json .
marqdo knowledge compose --strict --json .
# 使用 compose 输出的真实证书路径，不要假定 glob 必有结果：
marqdo knowledge replay PATH_TO_REAL_composition-certificate.json --json .
```

| 操作 | 用途 | 应写入 qdagent 的证据，不允许的夸大 |
|---|---|---|
| `knowledge` | 建知识图、锚点、引用与来源投影 | L1 结构索引；绝非 Lean 证明 |
| `prove` | 单文件显式定理在其受限模型内核验 | 报告、证书、工具链和源码绑定；不推断插件/外部设备 |
| `proof-deps` | 分析真实 BoundCall、契约、依赖与未解义务 | `audit_passes` 不等于调用方已证；不冒充 Lean |
| `proof-deps --verify` | 重放可核验的被调者证明与受支持的调用点条件 | 闭合前提/Lean 检查不等于调用方完整结论 |
| `compose` | 对已支持的跨模块纯函数，基于实际 AST 派生独立 Lean 模块并组合 | 只产生有界抽象模型中的 `model_proved`；无结果/错误不可伪造 |
| `replay` | 从当前源码再生成模块，对源码/依赖/契约/工具链/产物身份重新检查 | 通过是当前证书**模型作用域**内核验；不赋予运行权限 |

## 4. 当前证明子集（必须写入开发接口）

**支持**：不同源码文件、无环静态导入的纯函数调用；位置参数且签名完整、无默认参数；整数抽象模型中的常量/形参/局部赋值、加减/负号、受限常量乘法、穷尽 `if/else`、顺序调用及多层 DAG。每个受支持函数必须具备唯一可识别、无条件的结果契约；Lean 从实际源码生成定义、证明被调者契约，调用方只用导入的已证契约组合。旧的常量返回/参数投影后端可作为有界兼容证书，不能当成所有新形式都被支持。

**拒绝或只标记 unknown**：循环/递归、动态分派、插件与其他效应、异常行为的具体运行时语义、非穷尽分支、没有明确来源的外部事实、未证明的条件前提、任意复杂算术、浮点与公式对象、动态类型 `number` 与 Lean `Int`/i64 的完全对应、并发副作用，以及任意泛化的 Hoare 推理。抽象的效应/异常 Lean 规则不是具体插件的实现证明。

## 5. 证据分级和严格使用门槛

上游 `src/knowledge/evidence.rs` 定义：`proved`、`model_proved`、`tested`、`assumed`、`unknown`、`refuted`、`stale`。它还区分 `kernel_replayed`、`runtime_correspondence_verified`、`full_marqdo_runtime_semantics_proved` 以及 `not_execution_authority`，不要只读取状态字符串。当前 Lean Int 组合证书为 `model_proved`，通常 `full_marqdo_runtime_semantics_proved=false`；主机端 JSON 即使写了 `proved` 也不能授予可信证明。

| 等级 | qdagent 下一步 | 仍需检查 |
|---|---|---|
| `model_proved` | 若当前来源一致且已有独立 replay，只在**声明的整数抽象模型**内使用结论；否则重放 | 当前闭包/工具链、作用域、必需的运行时实验 |
| `tested` | 引用明确的冻结案例/实验收据 | 输入覆盖、环境、模型/设备版本和不可泛化的范围 |
| `assumed` | 明示外部假设，申请必要的受控核验 | 插件可信主体和效果契约，不能改成 proved |
| `unknown` | 限定片段后尝试证明，或进行真实测试/咨询 | 不代表定理错误，不能伪造重放结果 |
| `refuted` | 停止复用受反例影响的声明并审查可信反例 | 必须有真正的反例；Lean 超时不算 refuted |
| `stale` | 失效、重编译来源与依赖闭包，重新证明/测试 | 旧证书绝不能继续标为当前通过 |
| `proved` | 只有额外建立**具体运行时语义对应**并有可信证据时，才以精确作用域呈现 | 不能用模型自报或字段编辑提升等级 |

`grade`、`usable`、`kernel_replayed`、`current_source_verified` 是不同维度。执行权限和用户批准完全独立于所有证据等级。开发中的纯函数策略示例位于 `skills/marqdo-dev/knowledge-evidence.mq.md`，它只返回推荐下一步，不发证书、不调用 CLI、不代替授权。

## 6. 对 qdagent 的渐进集成（小模型路径）

```text
用户目标
  → 根入口只确认/拆分/路由（仍然短）
  → 知识 SKILL 读取当前已授权文稿的目标锚点与函数契约
  → 查当前 source/closure + evidence 摘要（单函数范围）
  → 缺少 L1：编译索引；需要 L2：受控证明/重放；外部效果：冻结测试/实测
  → 生成“可复用知识收据”：SymbolId、来源哈希、proof_scope、grade、证书/测试引用、待决义务
  → 仅将该收据的短摘要/文件引用写入当前任务 memory.mq.md
  → 执行阶段仍需身份、效果、真实工具返回和独立测试
```

**根入口不加载知识证明手册**，只有路由到知识领域时，才把这份文稿相关函数/摘要交给该层。一个小模型调用只作一个可验证决定：`inspect_source`、`index_knowledge`、`audit_deps`、`verify_premises`、`compose_proof`、`replay_proof`、`run_tests`、`ask_user` 或 `stop`。这些是**设计中的下一步标签**，不是已经注册的 qdagent 工具，也不是可给模型执行的 shell 别名。实现时必须使用已存在的 Marqdo 函数和受限系统边界，发现不存在的功能应报告缺口。

记忆只记录经真实核验的 `symbol_id`、证据引用路径、grade、scope、source/closure digest、待决义务及当前状态版本，不粘贴 Lean 编译日志、原始论文全文或任意原文对话。并发子任务分别产生只读证据收据；合并在 CAS/真实权限下核验，不能各自把 root memory 覆写成“已证明”。

示例：在量子科研中，矩阵恒等式可尝试形式证明，量子设备的保真度仍必须来自测量/校准与误差统计。对论文编译的 Python/C++ 算法，代码上传本身只建立来源，不产生运行权或证明；缺少对等 Marqdo 实现与测试时标为未接通。

## 7. 待实现接口、排序和验收

这份设计**不宣称 qdagent 已集成知识证明的 UI、结果数据模型、证明沙盒或自动策略**。分期：

1. **K0（本文）**：将上游能力、术语、证明边界与拒绝场景写入开发入口；提供可调用的纯证据决策示例，真实 Marqdo CLI 校验。
2. **K1（待开发）**：在知识详情/子 SKILL 暴露按需 `anchors / claims / graph / proof-index / proof-obligations` 读取、来源与精确 SymbolId/版本身份；不新增独立 parser。
3. **K2（待开发）**：通过受限 ABI/Marqdo 文稿组合 `proof-deps`、`compose`、`replay` 的真实执行，添加 Lean 安装检测、超时、预算、异步状态与取消。只有有可信输出才填证书字段。
4. **K3（待开发）**：证据等级与作用域进入用户可见知识卡、函数调用收据和 `memory.mq.md` 的短摘要；源/依赖变更转 stale，保证权限与证据互不混淆。
5. **K4（待开发）**：真实小模型受控对照与回归：可证纯函数、失败契约、无 Lean、篡改证书/闭包、变化源码、歧义锚点、未证明插件、未解前提、设备实验、多任务并行与取消；度量 token、决策合法率、成功/拒绝真实性与证据完整度。

**严禁跳过**：现有 qdagent 的上传安全、原件所有权、人工意图/框架确认、冻结独立测试、发布门禁、外部效应授权、版本 CAS 与最终人工验收。Lean 的结果只能增加一个证据维度，不能绕过这些门禁。

## 上游权威入口

- [v2.9.1 的证据结构](https://github.com/cflmy/marqdo/blob/v2.9.1/src/knowledge/evidence.rs)
- [v2.9.1 的统一模块证明子集](https://github.com/cflmy/marqdo/blob/v2.9.1/src/knowledge/unified.rs)
- [知识锚点、前提、证书与重放设计](https://github.com/cflmy/marqdo/blob/v2.9.1/doc/design/knowledge-proof-2.9.md)
- [验证边界和证据等级决策](https://github.com/cflmy/marqdo/blob/v2.9.1/doc/design/verified-knowledge-compiler-boundaries.md)

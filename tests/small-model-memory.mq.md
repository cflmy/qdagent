---
markup: occlusion
title: 小模型记忆投影金样
import:
  memory: ../ext/root-skill/runtime/memory.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  test: capabilities.mq.md
---

# main

这一份离线金样不接入供应商，不创建会话身份，也不执行模型输出。它直接调用生产 memory.render，检查从根状态投影的唯一 Markdown 摘录包含目标和最新用户输入，同时没有第二轮历史内容。由官方 Marqdo 编译器而非另外的 Python 提示解析器执行。

投影对应 docs/small-model-native-agent.mq.md 的 memory 约定：每个任务只有一份关键状态文稿，跨轮默认只注入它的有界摘录与最新输入。金样故意在历史里放置一条旧输入"旧历史不再回放"——若实现退回六轮历史拼接，leaked 断言会立即失败；这把"历史只供审计、不默认回灌"的约束变成可执行断言，而不是提示词里的口头约定。

state 由 json.parse 构造，字段与真实根状态一致：revision、phase、goal、history、intent_tasks 与 pending 都来自 state.mq.md 的真实保存结构。断言只检查文本包含与排除，不解析内部格式，因此任何等价的投影实现都能通过；真正的执行证据由 sync 的 ABI 原子写负责，本金样不重复那份验证。本段同时固定向后兼容：状态没有知识收据时，"知识证据"一节必须整体缺席，而不是渲染空占位或提示行。这个缺席断言与六轮历史排除一起，保证旧任务在 K3 上线后投影逐字节稳定，已交付任务不会因为实现升级而在现场多出任何段落，也不会在每轮注入中悄悄多消耗模型预算。

运行方式与验收边界：`marqdo run tests/small-model-memory.mq.md --emit-result`，返回值必须逐字为 small-model-memory-projection-ok。这份金样不验证 token 预算、真实 Web 多轮恢复或 1B 模型成功率——那些属于 rollout 文档 G3/G6 关口的后续实测；静态契约由 tests/test_small_model_contract.py 另行把守。

**state = > json.parse text="{\"revision\":7,\"phase\":\"intent\",\"goal\":\"设计求道小模型\",\"history\":[{\"id\":\"h0\",\"text\":\"旧历史不再回放\"},{\"id\":\"h1\",\"text\":\"最新用户要求简化上下文\"}],\"intent_tasks\":[{\"id\":\"research\",\"mode\":\"research\"}],\"pending\":null}"**.
**rendered = > memory.render state=`state`**.
We **good = text.contains(text=`rendered`,sub="设计求道小模型")**.
We **recent = text.contains(text=`rendered`,sub="最新用户要求简化上下文")**.
We **leaked = text.contains(text=`rendered`,sub="旧历史不再回放")**.
We **absent = text.contains(text=`rendered`,sub="知识证据")**.
We **_ = test.assert(condition=`good`,message="missing goal")**.
We **_ = test.assert(condition=`recent`,message="missing latest input")**.
We **_ = test.assert(condition=(not `leaked`),message="old history leaked")**.
We **_ = test.assert(condition=(not `absent`),message="evidence section must stay absent without receipts")**.
Return *"small-model-memory-projection-ok"*.

## evidence

本段固定 K3 的知识证据摘录契约。带 knowledge_evidence 的状态必须逐条转写官方投影的"符号：等级/状态（范围）"并在节首声明 model_proved 不是运行时正确性；等级与状态原样转写，本层不发明等级、不推断过期，也不把缺失字段渲染成已证明。收据是否过期由保存方重新投影并更新状态，render 不读取文件系统，因此本段只断言转写保真，不断言时效。

两条收据的等级差异是断言核心：model_proved/proved 表示 Lean 内核复核过的纯函数证明，unverified/open 必须原样显示为未验证。记忆层的职责是让小模型看见真实等级差异，而不是把两者渲染成同样的"已证实"。摘录使用精确符号身份（mq:// 标识），延续 K1 的"来源与版本身份"要求：函数名字面文本不足以绑定证据，符号移动后旧证据必须随重新投影失效，而不是继续被字面匹配引用。

超限断言锁住"最少但充分"的另一半：第七条收据不进入现场，只留显式提示，防止实现用无界摘录悄悄扩张上下文。提示引导按符号精确读取官方投影——需要更多证据时走显式按需读取（G4 的分片接口），不是默认携带。第一条收据仍在六条限额内被投影，六条边界本身也要核对：实现若把限额错写成五条，six 断言不会失败但 hint 会出现——因此同时断言 hint 出现且第七条缺席，边界行为被两个方向固定。

构造方式说明：收据状态用 json.parse 的转义字面量表达，与真实根状态经 CAS 保存后的形状一致；溢出状态的七条收据只带 symbol 字段，等级与状态留空——渲染行内的空位即是真实的"未知"，这同时覆盖了缺字段收据的转写路径。两个状态的 phase 都是 outline，与保存收据的规划阶段一致；状态其余字段保持最小，断言聚焦证据节本身。

与 K1 投影接口的分工在本段同样成立：runtime/knowledge.mq.md 的 projections 负责按符号取得实时官方投影，render 只转写已进入根状态的收据快照。这个分工保持"单一事实源"——收据由规划阶段显式保存进状态并经用户确认，记忆层不做自己的知识检索，避免每轮默认回灌新的外部内容；当投影更新（源码或依赖变化）时，保存方写入新快照，旧摘录随状态版本一起被替换，而不是在渲染层叠加新旧两份。

对前端展示的约束也由本段锁定：摘录行就是用户可见收据卡的短摘要来源，字段顺序固定（符号、等级、状态、范围），因此卡片与记忆现场永远一致。若未来需要在卡片上增加交互（例如跳转到完整投影），那属于 K3 的 UI 工作，必须继续以同一份快照为事实源，不能在展示层重新推断等级或状态。

失败与拒绝边界最后固定：knowledge_evidence 不是列表（例如被写成文本）时按缺省处理，整节缺席，渲染不抛错——与字段缺省的行为一致；收据里的多余字段（例如未来新增的 sha256）原样忽略，摘录形状不随上游扩展而漂移，新的字段要进入摘要必须先修改本函数与本段断言。这两条让"渲染层对未知保持沉默"成为可执行约束：小模型在现场看到的每一段文字都能追溯到本段的断言形状，没有任何由渲染器自创的提示语。

这一段刻意长于常规叙述，因为它是 K3 摘录格式的完整记录：等级词表来自官方证据投影（例如 model_proved、unverified），摘录顺序固定为符号、等级、状态、范围，六条限额与显式溢出提示是"最少但充分"在证据维度的具体化，缺字段收据的空位转写是"真实失败保留未完成"在展示层的具体化。后续任何改动——等级扩展、卡片交互、限额调整——都必须先修改本段叙述与断言再改实现，保持测试作为单一事实源。

最后说明本段与其它关口的边界，避免断言范围被误读：本段不验证收据如何进入根状态（那是规划阶段经用户确认后的 CAS 写入，属于状态机与宿主职责），不验证官方投影的实时取得（K1 的 projections 接口与 Rust 单元测试负责），也不验证证据等级在 UI 卡片上的完整展示（K3 的界面部分在真实部署时验收）。金样固定的只有一件事：任何进入记忆现场的收据文本都保持官方投影的原样等级与状态，既不美化也不裁剪，而这是防止"检索到即已验证"这类系统性错误在小模型现场复现的最关键一道闸门。这道闸门由编译器逐字执行，与提示词无关。

**receipts = > json.parse text="{\"revision\":8,\"phase\":\"outline\",\"goal\":\"有证据的任务\",\"history\":[{\"id\":\"h1\",\"text\":\"继续\"}],\"pending\":null,\"knowledge_evidence\":[{\"symbol\":\"mq://kb/math/function/clip\",\"level\":\"model_proved\",\"status\":\"proved\",\"scope\":\"任务方案\"},{\"symbol\":\"mq://kb/other/function/load\",\"level\":\"unverified\",\"status\":\"open\",\"scope\":\"任务方案\"}]}"**.
**evidenced = > memory.render state=`receipts`**.
We **line_one = text.contains(text=`evidenced`,sub="mq://kb/math/function/clip：model_proved/proved（范围 任务方案）")**.
We **line_two = text.contains(text=`evidenced`,sub="mq://kb/other/function/load：unverified/open（范围 任务方案）")**.
We **disclaimer = text.contains(text=`evidenced`,sub="model_proved 不是运行时正确性")**.
We **_ = test.assert(condition=`line_one`,message="first receipt must be transcribed verbatim")**.
We **_ = test.assert(condition=`line_two`,message="unverified receipt must stay honestly labeled")**.
We **_ = test.assert(condition=`disclaimer`,message="evidence section must disclaim runtime correctness")**.
**many = > json.parse text="{\"revision\":9,\"phase\":\"outline\",\"goal\":\"收据超限\",\"history\":[{\"id\":\"h1\",\"text\":\"继续\"}],\"pending\":null,\"knowledge_evidence\":[{\"symbol\":\"s1\"},{\"symbol\":\"s2\"},{\"symbol\":\"s3\"},{\"symbol\":\"s4\"},{\"symbol\":\"s5\"},{\"symbol\":\"s6\"},{\"symbol\":\"s7\"}]}"**.
**bounded = > memory.render state=`many`**.
We **hint = text.contains(text=`bounded`,sub="其余收据未摘录")**.
We **six = text.contains(text=`bounded`,sub="s6：")**.
We **seventh = text.contains(text=`bounded`,sub="s7：")**.
We **_ = test.assert(condition=`hint`,message="overflow must be explicit, not silent")**.
We **_ = test.assert(condition=`six`,message="six receipts stay within the bound")**.
We **_ = test.assert(condition=(not `seventh`),message="only six receipts may be projected")**.
Return *"memory-evidence-contract-ok"*.

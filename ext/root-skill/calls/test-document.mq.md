---
markup: occlusion
title: 只依据公开意图冻结文档验收
import:
  io: ../runtime/io.mq.md
  proof: ../proof.mq.md
  table: lib/table.mq.md
---

## require_document

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| minimum_chars | number | required | 根据公开要求决定的最小正文长度，20至24000 |
| minimum_sources | number | required | 必须实际浏览且在正文引用的来源数，0至8 |
| rationale | text | required | 规则的公开意图依据与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | require_document 的真实结果，失败保留诊断 |

Use `minimum_chars`, `minimum_sources`, `rationale`。

研究与写作没有事先给定的逐字答案，不能编造 expected 全文。这里冻结可确定执行的结构契约：正文长度、真正访问的公开来源与可核对引用。只依据已确认意图选择要求，不能访问实现、作者输出或开发对话。若用户未要求外部来源，可以为零；需要外部事实时应要求真实来源，不能靠模型记忆满足。规则冻结后实现者无法改写。通过这些检查只证明结构和来源可追溯，不证明每个科学结论都正确；最终仍由用户审阅。

`rules` =

| minimum_chars | minimum_sources |
|---|---|
| `minimum_chars` | `minimum_sources` |

Return *proof.submit(context=io.current(),cases=`rules`,rationale=`rationale`)*.

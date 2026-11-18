---
markup: occlusion
title: 知识证据下一步建议
description: 一个纯函数只选择下一项检查，不发证明或授权。
---

本 SKILL 仅供知识领域子智能体调用。数据必须来自真实源码、证明/测试收据和当前版本校验，不是模型猜测。返回**建议动作**而不是可信等级或可执行路径。任何动作仍需要上层实际已登记工具及权限检查。根入口不加载本 SKILL。

## advise
    + `grade`
    + `source_current`=False
    + `kernel_replayed`=False
    + `runtime_claim`=False

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| grade | text | required | 上游证据等级，必须由可信收据提供 |
| source_current | bool | False | 来源及依赖闭包是否已核验为当前 |
| kernel_replayed | bool | False | 是否已独立进行 Lean 内核重放 |
| runtime_claim | bool | False | 用户是否要求推断完整运行时/外部事实 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 下一步建议标签，不是授权或证明收据 |

Use `grade`, `source_current`=False, `kernel_replayed`=False, `runtime_claim`=False。

源码变化优先索引与失效传播；Lean Int 抽象证明只能在核验闭包且独立重放后用于引用，要求运行时性质还需单独测试。未解义务继续取实际证据，不让小模型扩容上下文并自行宣布证明成立。

1. not `source_current` or `grade` == "stale"
  Return *"reindex_source"*.
1. `grade` == "refuted"
  Return *"review_counterexample"*.
1. `grade` == "assumed"
  Return *"verify_external_assumption"*.
1. `grade` == "model_proved"
  1. not `kernel_replayed`
    Return *"replay_proof"*.
  1. `runtime_claim`
    Return *"test_runtime_correspondence"*.
  Return *"cite_model_scope_only"*.
1. `grade` == "tested"
  Return *"review_test_scope"*.
1. `grade` == "proved"
  Return *"verify_runtime_correspondence"*.
Return *"obtain_evidence"*.

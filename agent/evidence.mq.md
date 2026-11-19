---
markup: occlusion
title: 执行与证明证据
description: 可寻址来源、执行事实与形式证明保持三个不同的维度。
import:
  json: lib/json.mq.md
  result: lib/result.mq.md
---

成功必须来自已执行的真实 Marqdo 函数返回。可复用知识中的 source/closure 摘要、proof-deps、Lean replay、独立测试等只能在其作用域里构成证据；model_proved 不能推断真实插件语义。这个模块把调用收据整理成会话下一步事实，失败保留原始诊断。

## classify
    + `receipt`

| 参数 | 类型 | 说明 |
|---|---|---|
| receipt | map | 可信实际执行收据 |

Use `receipt`。

1. not access(`receipt`,"ok")
  Return *result.ok(value="incomplete")*.
We **value = access(`receipt`,"value")**.
We **state = json.get(value=`value`,key="status")**.
1. `state` == "succeeded"
  Return *result.ok(value="succeeded")*.
1. `state` == "failed"
  Return *result.ok(value="failed")*.
Return *result.ok(value="incomplete")*.

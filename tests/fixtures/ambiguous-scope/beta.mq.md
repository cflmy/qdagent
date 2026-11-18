---
markup: occlusion
title: 歧义夹具乙
---

# beta

歧义锚点夹具乙：与甲模块同名函数，用于固定"同名符号不得被猜测合并"。

## add

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| a | number | required | 加数 |
| b | number | required | 被加数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | number | 乘后加和 |

Use `a`, `b`。

乙模块的加法实现，与甲模块同名但独立。

Return *`a` + `b` + 1*.

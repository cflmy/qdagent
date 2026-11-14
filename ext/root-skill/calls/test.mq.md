---
markup: occlusion
title: 独立测试者的当前可调用文稿
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  result: lib/result.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  proof: ../proof.mq.md
---

独立测试者的当前可调用文稿。只根据公开意图和接口形成预期，不读取被测试实现。

## field

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| key | text | required | 业务输入记录的字段名 |
| value | any | required | 实际字段值 |
| record | map | None | 已有业务记录，不填则新建 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原生 Marqdo 记录 |

Use `key`, `value`, `record`=None。

组合调用参数时可以用 field 逐个形成原生值，不需要把对象编码成 JSON 字符串。例如 request 字段保存用户请求，dependencies 字段保存公开约定的前置结果。这个纯函数不读取实现或执行测试对象。

Return *table.put(in=`record`,at=`key`,value=`value`)*.

## sample

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | required | 公开函数实际接收的业务输入 |
| expected | any | required | 仅依据已确认业务规则得出的预期 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 一项独立案例 |

Use `input`, `expected`。

选择正常、边界和错误输入，预期应解释得出依据。固定正文的目标可用不同输入确认它始终返回给定正文；动态取值需要不同字段值，计算需要有意义的不同数字。不要通过运行实现来取得 expected，不给未说明的规则编造默认值。

`value` =

| input | expected |
|---|---|
| `input` | `expected` |

Return *value*.

## one

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | any | required | 一个实际的原生值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 只含一个值的原生列表 |

Use `value`。

Marqdo 调用中的列表使用原生构造或 Markdown 数据表，不把 JSON 数组文本当成列表。one 可形成一个业务单元、一条案例或一级取值路径；它不解释值中的文本，不访问文件，也不改变任何阶段。

Return *table.append(list=table.empty_list(),item=`value`)*.

## pair

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| first | any | required | 第一个实际值 |
| second | any | required | 第二个实际值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 有序的两个原生值 |

Use `first`, `second`。

用于形成两个选项、案例、业务单元或两级字段路径。它返回真正的列表，不是看起来像数组的一段字符串。更多值可以用 append 继续追加。所有值都保持自身类型，嵌套记录也不会被预先编码成文本。

Return *table.append(list=table.append(list=table.empty_list(),item=`first`),item=`second`)*.

## append

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| values | list | required | 已有的原生列表 |
| item | any | required | 要追加的实际值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 保留已有顺序的新列表 |

Use `values`, `item`。

组合更多选项或案例时从已有列表追加，避免重复手写长参数或给结构化值二次编码。此函数不原地修改已有列表，不替换用户确认，不执行列表里的材料。单元和案例的数量边界由其实际提交函数检查。

Return *table.append(list=`values`,item=`item`)*.

## freeze

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| first | map | required | 第一条 sample 形成的案例 |
| rationale | text | required | 预期的公开业务依据 |
| second | any | None | 第二条案例 |
| third | any | None | 第三条案例 |
| fourth | any | None | 第四条案例 |
| fifth | any | None | 第五条案例 |
| sixth | any | None | 第六条案例 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 冻结后的测试元数据 |

Use `first`, `rationale`, `second`=None, `third`=None, `fourth`=None, `fifth`=None, `sixth`=None。

直接传 sample 产生的案例值，无需构造 cases 数组。first 必须提供，其余按业务边界选择；每项都有独立依据，不能运行实现后抄取 expected。同一规格一旦冻结就不允许按程序输出重写，测试角色也没有读取实现的接口。

We **cases = table.append(list=table.empty_list(),item=`first`)**.
1. `second` != None
  We **cases = table.append(list=`cases`,item=`second`)**.
1. `third` != None
  We **cases = table.append(list=`cases`,item=`third`)**.
1. `fourth` != None
  We **cases = table.append(list=`cases`,item=`fourth`)**.
1. `fifth` != None
  We **cases = table.append(list=`cases`,item=`fifth`)**.
1. `sixth` != None
  We **cases = table.append(list=`cases`,item=`sixth`)**.
Return *proof.submit(context=io.current(),cases=`cases`,rationale=`rationale`)*.

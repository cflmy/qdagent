---
markup: occlusion
title: 实现者的当前可调用文稿
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  result: lib/result.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  author: ../authoring.mq.md
  implementation: ../runtime/implementation.mq.md
  proof: ../proof.mq.md
---

实现者的当前可调用文稿。实现自己的函数，独立测试和用户确认不可修改。

## field

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| key | text | required | 业务记录字段名 |
| value | any | required | 实际字段值 |
| record | map | None | 已有记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原生记录 |

Use `key`, `value`, `record`=None。

这是纯数据构造，用于组织明确有来源的结构化材料，不执行字段中的文字，也不访问其他任务。需要计算或读取真实输入时应使用函数体或 select，不能把字段名写成固定结果。

Return *table.put(in=`record`,at=`key`,value=`value`)*.

## library

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| module | text | required | 英文标准库模块，如 math、json、fs |
| section | text | "" | 需要阅读的函数标题，留空为模块 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 有界的真实标准库源码 |

Use `module`, `section`=""。

不会语法时先阅读实际库函数，不猜测参数名。这项能力只读已安装标准库，不提供全局目录浏览或任意服务器路径，也不会让实现者取得独立测试的源文件。

We **context = io.current()**.
Return *io.native(context=`context`,operation="runtime_library",payload=table.put(in=table.put(in=None,at="module",value=`module`),at="section",value=`section`))*.

## material

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 当前任务 uploads 下的明确材料路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实用户材料的有界文本 |

Use `path`。

只读取用户提供的材料。实现、测试、历史调用和其他智能体的工作根不属于材料目录，不能通过相对路径或符号链接取得。二进制材料需要对应文档插件，不把字节乱码当成已阅读的正文。

We **context = io.current()**.
Return *io.native(context=`context`,operation="runtime_material",payload=table.put(in=None,at="path",value=`path`))*.

## write_text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| content | text | required | 依据用户与真实材料给出的固定正文 |
| narrative | text | required | 解释来源、输入行为、适用条件与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实作者与独立测试的结果 |

Use `content`, `narrative`。

固定正文直接填 content，无需手写返回语句或编码 JSON。正文应是任务真正要求的内容，而不是变量名、文件名或一句声称已经完成。工具生成合法函数，然后使用已冻结的独立案例实际调用；失败继续修复自己的实现，不能提交 expected。

Return *implementation.publish(context=io.current(),mode="literal",value=`content`,body="",narrative=`narrative`)*.

## write_value

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | any | required | 有来源的固定结构化值 |
| narrative | text | required | 数据来源、结构与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实生成和验证结果 |

Use `value`, `narrative`。

结构化文稿可直接传原生值，不先转换成 JSON 文本。此模板不适合伪造计算、检索或外部操作的结果。固定数据必须有真实来源，独立测试不通过则不能被标为就绪。

Return *implementation.publish(context=io.current(),mode="literal",value=`value`,body="",narrative=`narrative`)*.

## select

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | list | required | 从 input 开始的字段路径，例如 request、text 两层 |
| narrative | text | required | 字段的业务含义和空值行为 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际输入取值函数的验证结果 |

Use `path`, `narrative`。

模板生成逐层读取逻辑，不把路径文字当成返回值。输入是 request 与 dependencies 组成的记录，空路径表示整个输入；缺失字段的行为需要与公开规格一致。独立案例会传入不同输入核对真实结果。

Return *implementation.publish(context=io.current(),mode="select",value=`path`,body="",narrative=`narrative`)*.

## code

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| body | any | required | 真实 Marqdo 函数体，可用绑定的 mq 围栏 |
| narrative | text | required | 业务规则、来源、输入假设和限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 合法源码与独立测试诊断 |

Use `body`, `narrative`。

计算、转换与文件逻辑使用真实函数体。body 只写当前函数内部，不新增标题；input 是业务输入记录，可用 math、table、text、json、fs、re、hash。叙述与实现混排且超过一半，操作优先用描述明确的 []()。不会签名先阅读 library；不会调用不要改用 Python。

Return *implementation.publish(context=io.current(),mode="code",value=None,body=io.unfence(source=`body`),narrative=`narrative`)*.

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

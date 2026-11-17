---
markup: occlusion
title: 单变量公式的受检函数体模板
import:
  author: ../authoring.mq.md
  io: io.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
---

## body

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| expression | text | required | math.formula 支持的单变量表达式 |
| variable | text | required | 公式中的变量名 |
| field | text | required | 从 input.request 读取的字段名 |
| missing | number | required | 公开契约明确规定的缺失或非数值返回 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 真实 Marqdo 函数体，仍需独立冻结案例验证 |

Use `expression`, `variable`, `field`, `missing`。

这个模板解决一个具体的编程边界：公式已经明确，但模型不应反复手写记录读取、类型判断与条件缩进。调用者只填写数学表达式、变量、业务字段和明确的无效输入行为，模板产生普通 Marqdo 函数体。最终实现仍能完整阅读，公式和输入处理没有藏进宿主代码或工具注册表。模型选择模板不等于已经通过验证，生成的代码仍走同一份官方检查与独立案例。

输入沿用根流程的统一记录，其中 request 是原始业务请求。先判断 input 是否为记录，再读取 request，确认后才取当前字段。缺少请求、字段不存在、字段为空或者不是数字，都返回调用者明确提供的 missing；布尔值不会被当成整数。只有公开规格已经确认这种行为时才能使用此模板，不能为了让一次试运行通过就给未知业务随便添加零值。需要抛出错误、处理多个变量、读取依赖或使用不同输入结构时，应选择通用代码接口。

类型名称使用字符串 int、num 和 map，实际类型函数是 type(value=值)，而不是把类型名称当变量。条件使用原生编号和缩进，每一个提前返回都是实际控制流；在叙述中写一句若失败则返回，并不能代替分支。这个区别是模型生成函数时反复出现的错误，因此固定在可阅读模板中，让使用者只关注公式的真实业务含义。

表达式、变量名与字段名先转为受保护的原生字面量，再替换模板中明确的数据位置。用户文本中的引号、反斜杠、换行或反引号都不能闭合代码并插入新的调用。这里没有另一套 Marqdo 解析规则，代码是否有效仍由官方编译器判断。表达式随后交给已有公式库解析与求值，不会被当作 Shell、Python 或另一种宿主程序执行。

公式的符号、单位、定义域、原文页码和合理误差应由作者写入 narrative 和公开契约。模板没有读取论文的能力，也不会把一个表达式猜测成论文的全部结论。材料读取仍须通过实际来源接口，原件与文本摘要在发布时保留。测试者只看到用户确认的数学规则，独立给出输入和预期，不读取这个生成器或函数实现。

成功返回的是代码文本，而不是计算结果或发表收据。调用者将它交给 implementation.publish，该函数检查角色、所属函数段和语法，并实际运行已经冻结的案例。失败保留真实输入、预期、返回和源码，模型可以修改自己的公式或字段，不能修改独立预期。发布知识时还要经过整合与用户验收，这个辅助函数不能跳过其中任何一步。

该模板只生成单变量纯数值运算，不增加文件、网络或外联效果，也不读取模型密钥。可调用公式通过原生文稿保存，其他智能体能够阅读参数、返回、实际公式和边界。以后增加矩阵、多变量或更复杂算法，应另建有明确契约的普通函数，并保留相同的独立验证方式，不能把现在的有限模板宣传成任意论文都能自动复现。

`template` =
```mq
先核对实际业务输入的结构，再按公开契约读取单个数值字段。缺失或非数值输入的返回已由用户确认；不会用叙述代替分支，也不会将布尔值当作数字。
We **request = None**.
1. type(value=`input`) == "map"
  We **request = json.get(value=`input`,key="request")**.
1. type(value=`request`) != "map"
  Return *__QD_MISSING__*.
We **number = json.get(value=`request`,key=json.parse(text=__QD_FIELD__))**.
1. type(value=`number`) != "int" and type(value=`number`) != "num"
  Return *__QD_MISSING__*.
现在已经得到真实数值，用已声明变量代入原生公式。来源、单位、定义域与返回含义在本段公开说明中核对，实际结果交给独立案例验证。
We **expression = math.formula(text=json.parse(text=__QD_EXPRESSION__))**.
Return *[按明确公式形成实际数值](math.eval(formula=`expression`,var=json.parse(text=__QD_VARIABLE__),value=`number`))*.
```

We **source = io.unfence(source=`template`)**.
We **source = text.replace(text=`source`,old="__QD_MISSING__",new=json.stringify(value=`missing`))**.
We **source = text.replace(text=`source`,old="__QD_FIELD__",new=literal(value=`field`))**.
We **source = text.replace(text=`source`,old="__QD_EXPRESSION__",new=literal(value=`expression`))**.
Return *text.replace(text=`source`,old="__QD_VARIABLE__",new=literal(value=`variable`))*.


## literal

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | text | required | 公式、变量或字段名中的原始数据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 可用于原生源码中的安全 JSON 字面量 |

Use `value`。

先沿用作者工具对引号、换行和反引号的保护，再将下划线编码为官方字符串支持的十六进制字符。模板占位名称都有下划线，这样插入的数据即使恰好包含相同名称，也不会被后续替换再次命中。解析字符串时恢复原始字符，真实字段名和数学表达式不改变。

这里不解释表达式或改写用户代码，仅编码数据边界。没有自定义语法解析器，也不把匹配占位名称当成执行许可。插入后的整份文稿仍交给官方编译器检查，计算仍须通过冻结案例；成功编码不等于公式有科学依据或业务正确。

Return *text.replace(text=author.literal(value=`value`),old="_",new="\\x5f")*.

---
markup: occlusion
title: 独立测试的原生值构造辅助
import:
  table: lib/table.mq.md
---

本文件记录首份知识编译中发现的测试构造缺口。只提供纯数据函数，不取得任务上下文，不提交或更改冻结案例。实际测试调用现场仍由根 SKILL 决定；发布知识主入口没有导入本文件。

## empty

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 真正的空列表，没有占位空值 |

本函数创建长度为零的原生列表。空列表与包含一个 None 的列表不同；不能用 one(value=None) 或 pair(None,None) 代替。它只提供数据构造，不读取实现，不计算被测函数，也不判断数学预期。调用者随后可以使用 append 添加真正需要的元素。

Return *table.empty_list()*.

## record

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| first | map | required | field 形成的第一组字段 |
| second | map | None | 后续字段 |
| third | map | None | 后续字段 |
| fourth | map | None | 后续字段 |
| fifth | map | None | 后续字段 |
| sixth | map | None | 后续字段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 按顺序合并的原生记录 |

Use `first`, `second`=None, `third`=None, `fourth`=None, `fifth`=None, `sixth`=None。

一个字段构造函数返回的是新记录，调用者如果忘记携带旧记录，旧字段不会自动保留。这个合并函数使数据关系更直接：先用已有 field 构造各个真实字段，再一次合并为参数记录。它不接受任意业务函数名，不路由另一个技能，不访问文件，也没有实现者读取测试或测试者读取源码的通道。数据结构本身可以嵌套，但每一层都必须由调用者明确表达。

测试者应该先根据公开规则得到预期，再构造原生值；不能把同名变量反复赋值时遗失的字段当成业务默认值。需要空向量时单独调用 empty，需要两项向量时调用现有 pair，更多值才用 append。原生记录和列表保持类型，比将它们转为 JSON 文本再要求执行器猜测要稳定。这里提供的是普通纯函数，只有实际接入当前测试文稿才对智能体可见，放进目录本身不会注册另一份工具表。

逐个独立构造字段后，用本函数合并，不必反复手动传同一个 record。只有显式传入的记录参与合并，省略的参数不会成为列表里的空元素。同名字段以后者为准，调用者应避免重复键。它只负责原生数据组装，不从实现或运行结果取得预期，也不编码 JSON 文本。嵌套关系必须保持公开契约声明的 dependencies 与前置单元身份，不能把一个字段合并操作误认为已包好另一层业务记录。

We **out = `first`**.
1. `second` != None
  We **out = table.merge(a=`out`,b=`second`)**.
1. `third` != None
  We **out = table.merge(a=`out`,b=`third`)**.
1. `fourth` != None
  We **out = table.merge(a=`out`,b=`fourth`)**.
1. `fifth` != None
  We **out = table.merge(a=`out`,b=`fifth`)**.
1. `sixth` != None
  We **out = table.merge(a=`out`,b=`sixth`)**.
Return *out*.

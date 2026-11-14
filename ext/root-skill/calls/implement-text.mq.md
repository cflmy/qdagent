---
markup: occlusion
title: 当前单元的固定正文实现接口
import:
  implementation: ../runtime/implementation.mq.md
  io: ../runtime/io.mq.md
---

当前已确认单元使用固定正文模板，只暴露这个函数。编写程序、读取其他文件和修改测试不属于当前调用现场。

## write_text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| content | any | required | 函数实际返回的字符串本身，不填程序源码或 map 包装 |
| narrative | any | required | 来源、忽略输入的行为、返回内容与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 作者和独立测试的诊断；不是业务返回类型 |

Use `content`, `narrative`。

直接把规格要求的原始正文填入 content。它就是业务函数的返回值，不是 Python 代码、Marqdo 代码、文件名或一句完成承诺。系统会生成一个真实可调用函数，并用另一角色冻结的案例检验。你只需要填写正文和真实说明，不需要构造 body 或声明新函数。

Return *implementation.publish(context=io.current(),mode="literal",value=`content`,body="",narrative=`narrative`)*.

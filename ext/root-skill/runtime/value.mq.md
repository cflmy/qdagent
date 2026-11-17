---
markup: occlusion
title: 独立案例的精确业务值比较
import:
  table: lib/table.mq.md
  json: lib/json.mq.md
---

案例仍由独立测试者冻结；比较器只解释值，不修改预期。

## equal

| 参数 | 类型 | 说明 |
|---|---|---|
| left | any | 实际结果 |
| right | any | 冻结的独立预期 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | bool | 数值等值、结构与类型要求均满足 |

Use `left`, `right`。

公式库通常返回浮点数，JSON 案例则可能使用整数。九与九点零代表同一个数，不能仅因内部存储类型不同判为业务失败；字符串“9”与数值九仍然不同。同类数值保持原生精确比较；跨整数与浮点只在 V_safe 范围内使用等值关系，越界不进行近似转换。显示格式可能舍入，因此绝不通过显示字符串判断数值是否相同。正负零视作同一个数，不自动增加允许误差，也不把近似值追认为精确值。

列表逐项且保持顺序，记录逐键且保持键集合，嵌套的数值也遵守相同规则。缺少键与键值为空不同，布尔值不等同于零或一。实际执行失败仍由上层拒绝，不因为返回值恰好相等就忽略效果、语法或资源错误。任何近似数值验收都需要在公开契约中规定舍入或误差，不能根据实现输出临时放宽阈值。

比较函数是纯 Marqdo，不接触文件、模型或测试状态。它不能重写已冻结案例，不能读取实现，也不能对错误字符串做模糊匹配。通过比较只说明这一案例符合业务值要求，不是论文证明或全部输入的正确性证据。

浮点显示通常经过格式化，不能用人类看到的四舍五入字符串代替实际数值；最接近但不相等的两个浮点数仍然不匹配。JSON 入口另外拒绝超出安全整数范围的传值，比较器不尝试绕过这一限制。

We **a = type(`left`)** and **b = type(`right`)**.
1. (`a` == "int" or `a` == "num") and (`b` == "int" or `b` == "num")
  1. `a` == `b`
    Return *`left` == `right`*.
  1. `left` > 9007199254740991 or `left` < -9007199254740991 or `right` > 9007199254740991 or `right` < -9007199254740991
    Return *False*.
  Return *`left` <= `right` and `left` >= `right`*.

1. `a` != `b`
  Return *False*.
1. `a` == "map"
  We **keys = table.keys(map=`left`)**.
  1. len(`keys`) != len(table.keys(map=`right`))
    Return *False*.
  - [键与值都必须对应](for keys as key)
    1. not table.has(map=`right`,key=`key`) or not equal(left=access(`left`,`key`),right=access(`right`,`key`))
      Return *False*.
  Return *True*.
1. `a` == "list"
  1. len(`left`) != len(`right`)
    Return *False*.
  We **indices = table.range(start=0,end=len(`left`))**.
  - [列表不能通过交换元素取得通过](for indices as index)
    1. not equal(left=table.at(xs=`left`,i=`index`),right=table.at(xs=`right`,i=`index`))
      Return *False*.
  Return *True*.
Return *`left` == `right`*.

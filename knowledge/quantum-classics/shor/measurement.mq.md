---
markup: occlusion
title: Shor 可执行知识 · 按真实概率测量
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | 记录；dependencies 包含 preflight 和 fourier 的真实返回 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正文公开约定的实际业务结果，解释器成功不代替业务成功 |

Use `input`=None。

<!-- SHOR_BODY -->

本段执行一次真正基于上游概率分布的测量抽样。量子态模拟已经计算每一个自然序号 y 的概率，测量不能再按预知周期挑一个容易恢复因子的相位。输入中的 u 是用户显式提供的零至一之间的数值，它让同一次实验能够确定性重放；这个教学接口不声称从硬件取得真正量子随机数，也不把输入的均匀分位数当成量子优势。

来源是 [Shor 论文的求阶测量与后处理](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=18)。论文说明一次测量不保证恢复周期，必须允许不利结果和重复尝试。特别是零相位以及只给出约分后分母的测量，都会在后面的连分数步骤明确保留。这里仅产生实际选中的 y 和它的概率，不先读因子或后处理结果，也不为了让报告好看而重新抽样。

We **skip = table.put(in=None,at="status",value="skipped")**.
1. type(value=`input`) != "map"
  Return *skip*.
We **d = json.get(value=`input`,key="dependencies")**.
1. type(value=`d`) != "map"
  Return *skip*.
We **p = json.get(value=`d`,key="preflight")** and **f = json.get(value=`d`,key="fourier")**.
1. type(value=`p`) != "map" or type(value=`f`) != "map"
  Return *skip*.
1. json.get(value=`p`,key="status") != "quantum" or json.get(value=`f`,key="status") != "ready"
  Return *skip*.
We **u = access(`p`,"u")** and **q = access(`f`,"q")** and **probabilities = access(`f`,"probabilities")**.

区间按自然序号从零开始，使用左闭右开的约定。累加到某个位置后，只有 u 严格小于累积概率，才选择那个位置；恰好落在右端点时继续到下一个非零区间。零概率项不占据任何区间，不能被选中。这样的边界规则让零点、四分之一和接近一的输入都有唯一明确的行为，避免浮点边界被任意解释。

实际分布由前段保留十二位小数，多个舍入值的和可能与一有很小差别。我们仍使用这个公开分布，若 u 位于末尾的舍入尾差中，则落到最后一个正概率结果；这个规则只处理已经通过归一化检查的教学分布，不扩大输入域，也不把有明显缺陷的任意数组修正成成功。正式入口负责 u 的范围，傅里叶段负责原始态的归一化，单独调用者也必须遵守同一前提。

We **cumulative = 0** and **chosen = -1** and **last = -1**.
We **ys = table.range(start=0,end=`q`)**.
- [按真实概率区间定位本次测量](for ys as y)
  We **probability = table.at(xs=`probabilities`,i=`y`)**.
  1. `probability` > 0
    We **last = `y`**.
  We **cumulative = `cumulative` + `probability`**.
  1. `chosen` < 0 and `u` < `cumulative`
    We **chosen = `y`**.
1. `chosen` < 0
  We **chosen = `last`**.

观察与解释分别保存。得到 y 等于零仍然是一次合法测量，不是程序错误；后处理会说明为什么需要再次运行。得到一个非零相位也不保证一定成功，因为分母可能只是最小周期的约数。函数不会在这里悄悄增加尝试次数，用户可以明确改变 u 后重放，比较每次实际选中的相位。这样成功与失败都能被阅读、调用和复核，而不是只展示被挑选的成功案例。

返回记录包含 measured 状态、实际序号、控制宽度和所选位置原有的概率。概率不是这次测量之后的条件分布，更不是主观置信度；它来自测量之前的双寄存器态。调用者可以据此绘图或解释结果，但不应把某一次抽样的成功推广为所有输入都能一次完成。这个纯函数没有写文件或隐式随机源，同样输入可以逐步复现同样的结果。

We **out = table.put(in=None,at="status",value="measured")**.
We **out = table.put(in=`out`,at="y",value=`chosen`)** and **out = table.put(in=`out`,at="q",value=`q`)**.
按实际概率完成一次测量后，返回带原始概率的*table.put(in=`out`,at="probability",value=table.at(xs=`probabilities`,i=`chosen`))*。

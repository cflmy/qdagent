---
markup: occlusion
title: Shor 算法：可阅读、可调用的小规模知识
import:
  preflight: preflight.mq.md
  oracle: oracle.mq.md
  fourier: fourier.mq.md
  measurement: measurement.mq.md
  period: period.mq.md
  factors: factors.mq.md
  table: lib/table.mq.md
---
# 从原论文到一次可重放的分解实验

这份工程围绕 Shor 算法的求阶归约组织。原论文、固定版本参考源码与许可证见 [来源清单](sources.mq.md)，六个普通 Marqdo 函数共同构成知识的使用手册和实现。它不是只返回十五的因子的小程序，也不把 Cirq 示例默认的经典求阶器当成量子实验。模幂、复振幅变换、测量和后处理均真实计算，在经典计算机上完成有限维的量子态模拟。

正式支持三至二十一的整数模数，控制寄存器最多五百一十二个基态。主例为十五、底数二，另一组为二十一、底数二。资料原件仅用于阅读，不运行其中的第三方 Python；业务执行只需标准库数学、列表与记录能力，不需要网络、进程或新的插件权限。编译到私有知识库后，版本与冻结验证另由根流程管理。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | map | None | n 默认15，a 默认2，u 默认0.30；q 省略时选满足论文精度的最小二次幂 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | preflight、oracle、fourier、measurement、period、factors 六段的实际返回 |

Use `input`=None。

先看输入是否在教学预算之内，区分经典可处理的情况与量子求阶路线。n 与 a 必须是原生整数，u 是零至一左闭右开的分位数；字符串不会静默变为数值。q 必须为二次幂，同时不小于 n 的平方、小于两倍 n 的平方并且不超过五百一十二。默认十五对应二百五十六，二十一对应五百一十二。偶数、完全幂与非平凡公约数返回明确的经典路线，素数与无效输入保留原因。

We **request = table.put(in=None,at="request",value=`input`)**.
We **p = [检查实验范围和经典预处理](preflight.evaluate(input=`request`))**.
We **out = table.put(in=None,at="preflight",value=`p`)**.
We **dependencies = table.put(in=None,at="preflight",value=`p`)**.
We **argument = table.put(in=`request`,at="dependencies",value=`dependencies`)**.
We **o = [建立实际模幂双寄存器态](oracle.evaluate(input=`argument`))**.
We **out = table.put(in=`out`,at="oracle",value=`o`)**.

模幂态把每个控制基底 x 与目标基底 a 的 x 次幂模 n 关联，初始振幅相同。稀疏保存非零振幅与基底对应关系，仍然保留两个寄存器的纠缠。傅里叶段对这个实际联合态作完整变换，再对目标寄存器取偏迹，得到所有控制测量的概率。它不会先求经典阶，也没有按照模数查一张峰值或因子表。这里用快速变换降低的是经典模拟成本，不代表量子加速。

We **dependencies = table.put(in=None,at="oracle",value=`o`)**.
We **argument = table.put(in=`request`,at="dependencies",value=`dependencies`)**.
We **f = [演化复振幅并计算完整测量分布](fourier.evaluate(input=`argument`))**.
We **out = table.put(in=`out`,at="fourier",value=`f`)**.
We **dependencies = table.put(in=None,at="preflight",value=`p`)**.
We **dependencies = table.put(in=`dependencies`,at="fourier",value=`f`)**.
We **argument = table.put(in=`request`,at="dependencies",value=`dependencies`)**.
We **m = [按明确分位数进行一次实际测量](measurement.evaluate(input=`argument`))**.
We **out = table.put(in=`out`,at="measurement",value=`m`)**.

测量采用左闭右开区间。零相位仍是一条合法观察，连分数可能只恢复出周期的约数，二者都会明确保留为重试。对于十五，u 为零会得到零相位，u 为零点六会落在二分之一相位而无法验证完整周期；这些失败不能被丢弃或改写。默认的零点三对应一个可恢复周期的结果；用户可以明确改变分位数，逐次比较失败与成功，而不是程序悄悄重复直到挑出好看的答案。

We **dependencies = table.put(in=None,at="preflight",value=`p`)**.
We **dependencies = table.put(in=`dependencies`,at="measurement",value=`m`)**.
We **argument = table.put(in=`request`,at="dependencies",value=`dependencies`)**.
We **r = [用连分数提出并验证周期候选](period.evaluate(input=`argument`))**.
We **out = table.put(in=`out`,at="period",value=`r`)**.
We **dependencies = table.put(in=None,at="preflight",value=`p`)**.
We **dependencies = table.put(in=`dependencies`,at="period",value=`r`)**.
We **argument = table.put(in=`request`,at="dependencies",value=`dependencies`)**.
We **answer = [从经过验证的周期提取非平凡因子](factors.evaluate(input=`argument`))**.

连分数只检查测得分数产生的收敛分母，并真实验证模幂关系，不遍历所有整数寻找阶。即使候选通过，因子提取还要拒绝奇数周期和平凡平方根，最后核对因子乘积。每段返回都保留在最终记录里，调用者可以解释计算来源、绘制分布或者定位失败；单独得到一个 JSON 响应并不等同于论文已被验证。

数字模拟的开销应与论文所讨论的量子复杂度分别理解。当前采用稀疏联合态和快速傅里叶变换，能够保留所有控制基底的幅度及干涉，但运行设备仍是经典处理器。扩大到密码学规模的整数会超出这一表示的资源预算，因此输入限制是工程契约的一部分，不能通过只修改页面标签来宣称支持更大目标。记录真实运行规模，有助于后续比较其他模拟器或接通专门的受限计算插件。

独立参考计算与冻结案例也各有用途。小维的分布可以手算，用于发现接口或幅度归一化错误；另一条直接离散傅里叶路径可以比较整个正式分布，用于发现快速变换的位序和相位错误。两个实现一致仍不构成数学证明，知识文稿因此同时保留论文来源、适用条件、算法说明和实际观察。读者可以复核结论，而不是必须相信某个完成标记。

开发时，六个文件分别对应已确认方案的六个函数段，能按职责并行编写，但试运行依赖使用已声明的前置结果。测试者只取得无执行语义的公开规格，不取得这些实现。根流程负责冻结独立案例、检查实际源码、整合、用户验收和私有发布。这个开发入口便于复现与维护，不越过正式知识发布门禁；来源更改或接口变化需要重新验证。

调用本入口只进行计算，没有写入权限。知识库发布版本另提供明确的 replay 入口，将用户选择的输入与真实观测写回命名结果块；阅读 View 不执行程序，普通调用不会偷偷保存。这个边界让同一文稿同时服务于人类阅读、智能体调用与科学复现，而不会把论文里的材料指令当成执行授权。

完成上述真实计算之后，我们得到了每一段的观察，此时返回完整的*table.put(in=`out`,at="factors",value=`answer`)*。

---
markup: occlusion
title: Shor 小规模模拟：独立实现
import:
  preflight: ../preflight.mq.md
  oracle: ../oracle.mq.md
  fourier: ../fourier.mq.md
  measurement: ../measurement.mq.md
  period: ../period.mq.md
  factors: ../factors.mq.md
  table: lib/table.mq.md
---
这里保存正文背后的可调用实现。

这份工程围绕 Shor 算法的求阶归约组织。原论文、固定版本参考源码与许可证见 [来源清单](../sources.mq.md)，六个普通 Marqdo 函数共同构成知识的使用手册和实现。它不是只返回十五的因子的小程序，也不把 Cirq 示例默认的经典求阶器当成量子实验。模幂、复振幅变换、测量和后处理均真实计算，在经典计算机上完成有限维的量子态模拟。

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


## unit_preflight

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | request 记录中给出 n、a、可选 q 与 u |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | quantum、classical 或 invalid；经典路径带实际因子和原因 |

Use `input`。

先核对数值类型、模数范围与寄存器精度，再识别偶数、完全幂、非平凡公约数和素数情形。它对应第五节进入量子求阶之前的经典工作。通过这一步，只说明知道了应该走哪条路径，还没有完成量子周期恢复；我们返回*[实际前置检查结果](preflight.evaluate(input=`input`))*。


## unit_oracle

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | dependencies.preflight 是前置检查的完整返回 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | n、a、q、powers；非量子路径返回 skipped |

Use `input`。

本函数对应第三节的模幂联合态。powers 按控制基底从零开始排列，配合每项同样的初始振幅，可重建整个稀疏联合态；列表中的重复值尚未被解释成一个已知周期。它不从重复位置提前查出答案，而是交给下一步相位变换。建立该态之后，得到*[模幂演化的真实结果](oracle.evaluate(input=`input`))*。


## unit_fourier

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | dependencies.oracle 是模幂态的完整返回 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 自然序号的 probabilities、normalization 与 normalization_ok |

Use `input`。

本函数对应第四节的完整干涉计算。它先在相同目标基底内求复振幅和，再对目标寄存器取偏迹，保留每个整数频率位置的概率。除了可以看见的高峰，零项和旁瓣也在返回中；检查归一化不会把它们删除。由此得到的*[实际测量分布](fourier.evaluate(input=`input`))*，才是下一步选择测量值的依据。


## unit_measurement

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | dependencies 包含 preflight 和 fourier，前者给出 u，后者给出完整分布 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | measured 状态、实际 y、q 和该位置的概率 |

Use `input`。

本函数按第四、第五节的测量分布选择一次观察。u 指定累积概率中的位置，区间左闭右开；恰在边界上时进入下一个区间，零概率位置不会被选中。选择之后不再依据后处理能否成功重抽，因而零相位也会被如实保留。我们取得这次输入对应的*[一次真实测量](measurement.evaluate(input=`input`))*。


## unit_period

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | dependencies 包含 preflight 与 measurement，给出 n、a、y、q |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 验证通过的周期 r 与 checked，或带原因的 retry |

Use `input`。

本函数把第五节的有理数近似变成实际候选检查。它只尝试连分数产生的分母，不逐个枚举所有阶，也不为了让约分相位成功而偷偷尝试所有倍数。checked 保留本次真正检查过的分母；没有获得足够信息时返回明确的重试。最终得到*[由测量恢复的周期结果](period.evaluate(input=`input`))*。


## unit_factors

| 参数 | 类型 | 说明 |
|---|---|---|
| input | map | dependencies 包含 preflight 与 period |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 升序的因子对及实际路线，或 invalid、retry 与原因 |

Use `input`。

本函数完成第五节的平方差归约。对量子求阶路径，检查偶周期与非平凡平方根，再计算最大公因数并核对乘积；对经典预处理已经取得的因子，明确保留 classical 路线。失败不会被另一个底数的答案替换。经过这些检查以后，我们便得到所需的*[因子提取结果](factors.evaluate(input=`input`))*。

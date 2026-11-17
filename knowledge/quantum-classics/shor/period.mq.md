---
markup: occlusion
title: Shor 可执行知识 · 连分数恢复并验证周期
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | dependencies.preflight 与 dependencies.measurement；独立调用也接受显式 input.measurement |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正文公开约定的实际业务结果，解释器成功不代替业务成功 |

Use `input`=None。

<!-- SHOR_BODY -->

正式主入口通过 dependencies.measurement 传入真实测量；独立引用后处理时，也接受 input.measurement 中显式给出的同一完整测量记录。兼容封装不推断缺失数值，不从 q 猜测 n，也不修改连分数或模幂验证。两种调用均必须提供实际模数、底数、相位与控制宽度，因而不会用预期结果补齐算法输入。

另一个需要区分的概念是“相位近似的分母”与“模乘群的阶”。连分数只负责提供候选，模幂关系才负责验证候选，二者不能相互代替。一个可计算的近似分数不一定包含足够信息；一个能让模幂回到一的数也可能是阶的倍数。本段按照当前有限模数范围返回第一个验证通过的收敛分母，后续还会检查由它产生的平方根是否非平凡。

这种分层便于知识引用。另一个智能体可以单独使用这个后处理函数，只需提供公开约定的测量和前置参数，不必载入模拟器全部实现。它会获得实际候选轨迹和明确状态，而不是一段含糊的论文摘要。调用者如果希望采用候选倍数尝试、跨次相位合并或更高精度寄存器，需要重新声明算法范围与验收，不能把本版未提供的改进默认为已经实现。

本段把测得的相位 y/q 转换为可以验证的周期候选。来源是 [Shor 论文中的连分数后处理](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=18)。相位是最小周期分母的一个近似分数，恢复分母需要足够控制精度；正式入口已经按论文给出不小于 n 平方的二次幂宽度。本段仍不保证每次都成功，零相位和约分分母都必须明确返回重试。

我们只检查该相位的连分数收敛分母，不遍历所有整数寻找阶，也不读取模幂映射中的重复位置。依次尝试的是测量数据本身给出的数学候选，因此保留了量子测量与经典后处理的职责区分。候选是否有效还要实际计算底数的该次幂模 n 是否等于一。得到有效周期未必已经证明它是最小阶，最后提取因子仍须检查平方根是否平凡。

We **skip = table.put(in=None,at="status",value="skipped")**.
1. type(value=`input`) != "map"
  Return *skip*.
We **d = json.get(value=`input`,key="dependencies")**.
1. type(value=`d`) != "map"
  Return *skip*.
We **p = json.get(value=`d`,key="preflight")** and **m = json.get(value=`d`,key="measurement")**.
1. `m` == None
  We **m = json.get(value=`input`,key="measurement")**.
1. type(value=`p`) != "map" or type(value=`m`) != "map"
  Return *skip*.
1. json.get(value=`p`,key="status") != "quantum" or json.get(value=`m`,key="status") != "measured"
  Return *skip*.
We **n = access(`p`,"n")** and **a = access(`p`,"a")**.
We **num = access(`m`,"y")** and **den = access(`m`,"q")** and **checked = table.empty_list()**.
1. `num` == 0
  We **out = table.put(in=None,at="status",value="retry")**.
  We **out = table.put(in=`out`,at="reason",value="zero_phase")**.
  Return *table.put(in=`out`,at="checked",value=`checked`)*.

连分数从零开始的系数也有意义，对应分母一；公开返回的 checked 会保存这个候选，以便解释为什么它没有通过。相同分母不重复计入，分母达到或超过 n 后不再检验，因为在当前互素求阶问题中真正的阶小于 n。每一个模幂验证都是精确小整数计算，不使用浮点指数近似，也没有通过字符串比较判断数值是否相等。

欧几里得递推的被除数和除数分别来自上一步的除数和余数；收敛分母使用前两个分母递推。所有相位分母至多五百一十二，二十轮足够覆盖其有限连分数。本段保留这个有界资源约定，避免未知输入触发无限迭代。循环次数上界不是在搜索最小阶：模幂循环只验证连分数确实产生的那个候选，不会补上缺失的整数分母。

We **older = 1** and **previous = 0**.
We **steps = table.range(start=0,end=20)**.
- [由实际相位依次构造收敛分母](for steps as step)
  1. `den` > 0
    We **coefficient = int(value=math.floor(value=(`num` / `den`)))**.
    We **candidate = `coefficient` * `previous` + `older`**.
    1. `candidate` >= 1 and `candidate` < `n` and not table.contains(list=`checked`,item=`candidate`)
      We **checked = table.append(list=`checked`,item=`candidate`)**.
      We **value = 1** and **powers = table.range(start=0,end=`candidate`)**.
      - [只验证当前数学候选是否满足模幂关系](for powers as exponent)
        We **product = `value` * `a`**.
        We **value = `product` - `n` * int(value=math.floor(value=(`product` / `n`)))**.
      1. `value` == 1
        We **out = table.put(in=None,at="status",value="period")**.
        We **out = table.put(in=`out`,at="r",value=`candidate`)**.
        Return *table.put(in=`out`,at="checked",value=`checked`)*.
    We **remainder = `num` - `coefficient` * `den`**.
    We **num = `den`** and **den = `remainder`**.
    We **older = `previous`** and **previous = `candidate`**.

如果测得一半这样的相位，连分数可能只给出分母二；对十五、底数二，它不能使模幂回到一。本段会返回未验证分母，而不是偷偷把二乘二补成答案四。这种诚实失败是实验的组成部分，重复测量应由显式的新调用完成。对于接近六分之一的相位，候选六能够经过同一模幂检查，说明分母恢复来自实际数据而不是对二十一的特别分支。

返回的 checked 仅包含实际经过验证的分母，不包含所有可能分母，也不是一份已知阶的表。调用者可以据此阅读失败原因，选择新的分位数进行下一次实验。失败保留 retry 和公开原因，既不抛弃本次测量，也不冒充算法已经完成。测试应同时核对成功、零相位和不能恢复周期的情况，不能只展示最有利的一次结果。

We **out = table.put(in=None,at="status",value="retry")**.
We **out = table.put(in=`out`,at="reason",value="unverified_denominator")**.
检查完由实际相位产生的分母后仍未得到有效周期，此时返回带检查轨迹的*table.put(in=`out`,at="checked",value=`checked`)*。

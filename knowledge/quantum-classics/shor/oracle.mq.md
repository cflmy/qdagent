---
markup: occlusion
title: Shor 可执行知识 · 模幂后的双寄存器态
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | dependencies.preflight 是上游获准实验 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 公开契约约定的状态与结果；跳过和重试保持可见 |

Use `input`=None。

<!-- SHOR_BODY -->
本段把获准实验变为量子计算中的联合寄存器态。控制寄存器先处于均匀叠加，目标寄存器从一开始；模幂酉运算以后，每个控制基底 x 与目标基底 a 的 x 次幂模 n 关联。初始联合态的非零振幅都是一除以 q 的平方根。我们保存基底映射而不是展开所有零振幅，这是稀疏的表示方式，仍保留控制与目标寄存器之间的纠缠。

来源是 [Shor 论文的模幂与因子分解部分](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=16)，现代 [Cirq 参考源码](uploads/shor.py) 也把模幂写成酉算术门。这里自行实现有限状态的演化，没有运行上传的 Python，没有安装其依赖，也没有把 Cirq 默认的经典求阶选项当作量子结果。算法源码和许可证作为原件保存，只用于核对来源与设计差异。

1. type(value=`input`) != "map"
  Return *table.put(in=None,at="status",value="skipped")*.
We **d = json.get(value=`input`,key="dependencies")**.
1. type(value=`d`) != "map"
  Return *table.put(in=None,at="status",value="skipped")*.
We **p = json.get(value=`d`,key="preflight")**.
1. type(value=`p`) != "map"
  Return *table.put(in=None,at="status",value="skipped")*.
1. json.get(value=`p`,key="status") != "quantum"
  Return *table.put(in=None,at="status",value="skipped")*.
We **n = access(`p`,"n")** and **a = access(`p`,"a")** and **q = access(`p`,"q")**.

每一个控制输入都必须在态中出现，不能只保留会产生有利相位的几个输入，也不能把已经算出的因子填入目标寄存器。为了保持整数精度，当前值从一开始，每步乘以底数并归约到零至 n 减一；这与逐项计算 a 的 x 次幂取模完全相同。循环只构造模幂函数的值，没有测试什么时候第一次回到一，因此不会把经典求周期作为量子子程序的替身。

控制宽度的正式约束由上游检查。为了独立核对内核，公开接口也允许二、四、八等小二次幂，它们是傅里叶子程序的单元例子，不表示完整 Shor 实验有足够相位精度。正式的十五使用二百五十六，二十一使用五百一十二。把内核例子和完整算法运行分开记录，可以防止一个四维变换通过就被宣称已实现论文的完整精度要求。

We **v = 1** and **powers = table.empty_list()**.
We **xs = table.range(start=0,end=`q`)**.
- [对所有控制基底建立真实的模幂作用](for xs as x)
  We **powers = [保留与控制基底相连的目标基底](table.append(list=`powers`,item=`v`))**.
  We **product = `v` * `a`**.
  We **v = [以精确小整数计算下一个模幂值](`product` - `n` * int(value=math.floor(value=(`product` / `n`))))**.

这个列表中的重复值代表不同控制基底关联到同一个正交目标基底，不能直接将它们的概率相加而丢掉相位。后续变换会在同一个目标基底内部相干求和振幅，再把不同目标基底的概率相加。先平方后求和会破坏干涉，也就无法得到正确的傅里叶峰；保存完整基底关系正是为了避免这个错误。

目标空间没有出现的基底，其振幅仍为零。没有必要把这些零项全部写进列表，但它们不是被测量或经典筛选删除的样本。稀疏表示可以重建完整的联合态：对每个 x，在对应的目标值位置放入相同初始振幅，其余项为零。比如十五、底数二的前四项依次是一、二、四、八，第五项又从一开始；这是模幂运算的结果，后处理尚未读取或推断它的最小周期。

结果返回实际使用的模数、底数、控制宽度和按自然顺序排列的基底映射。列表长度必须等于 q，每项是模数范围内的整数。非量子路径只返回明确的 skipped，不能凭空补一份均匀分布；最终报告会从上游识别经典预处理是否已经得到因子。来源、幅度归一化约定、索引方向和输入约束都在文稿中明确，便于另一个智能体直接调用与复核。

We **out = table.put(in=None,at="status",value="ready")**.
We **out = table.put(in=`out`,at="n",value=`n`)** and **out = table.put(in=`out`,at="a",value=`a`)**.
We **out = table.put(in=`out`,at="q",value=`q`)**.
建立所有控制基底与目标基底的对应关系后，我们得到所需的模幂态描述，此时返回*table.put(in=`out`,at="powers",value=`powers`)*。

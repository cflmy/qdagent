---
markup: occlusion
title: Shor 分布的直接傅里叶参考核对
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## distribution

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| n | int | 15 | 已核对的小规模模数 |
| a | int | 2 | 与模数互素的底数 |
| q | int | 256 | 已核对的控制维度，不超过512 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 所有自然序号的概率和实际归一化总和 |

Use `n`=15, `a`=2, `q`=256。

本参考实现使用逐项复指数求和，不使用主实现的比特倒序与蝶形层。两条计算路径应当给出相同分布，逐项比较能够发现位序、相位、偏迹及归一化错误。这是额外的确定性核对，不读取冻结测试的 expected，也不能替代用户验收或论文的数学论证。规模限制仍为教学用小整数，不是密码学规模的量子加速。

对于每一个输出相位 y，先将逆变换的复相位旋转角确定，再枚举所有控制输入 x。把具有同一目标基底的复振幅加在一起，最后对各目标基底的模平方求和；公共归一化因子为 q 的平方。这种直接展开来自联合态与偏迹的定义，和快速算法的程序结构不同。没有一个步骤需要先知道周期，更没有根据模数选取已知因子。

本函数单独生成自己的模幂映射，避免共享快速实现的振幅向量造成相同错误相互抵消。为了控制循环预算，调用者仍使用已公开的 n、a 与 q 范围，不从未知或超大输入运行任意规模。参考计算比快速变换慢，二十一的正式控制宽度大约需要几十秒，所以它用于开发核对，不放进知识库每次调用的主执行路径。

We **powers = table.empty_list()** and **v = 1**.
We **xs = table.range(start=0,end=`q`)**.
- [累积实际寄存器振幅](for xs as x)
  We **powers = table.append(list=`powers`,item=`v`)**.
  We **product = `v` * `a`**.
  We **v = `product` - `n` * int(value=math.floor(value=(`product` / `n`)))**.
当不同 x 对应同一个目标值时，它们的路径不可区分，应该相干相加；当目标值不同时，它们是正交路径，只能在取偏迹时加概率。这个差异决定周期峰能否出现。若把所有 x 的复振幅不分组就相加，会错误得到一个纯控制态；若每个 x 先平方再相加，又会抹去所有干涉。逐项展开让这个数学边界容易逐行审阅。

We **probabilities = table.empty_list()** and **norm = 0**.
- [变换到傅里叶测量基](for xs as y)
  We **angle = -2 * math.pi() * `y` / `q`**.
  We **c = math.cos(value=`angle`)** and **s = math.sin(value=`angle`)**.
  We **pr = 1** and **pi = 0**.
  We **real = table.empty_map()** and **imag = table.empty_map()**.
  - [累积实际寄存器振幅](for xs as x)
    We **key = str(table.at(xs=`powers`,i=`x`))**.
    We **oldr = json.get(value=`real`,key=`key`)**.
    We **oldi = json.get(value=`imag`,key=`key`)**.
    1. `oldr` == None
      We **oldr = 0** and **oldi = 0**.
    We **real = table.put(in=`real`,at=`key`,value=(`oldr` + `pr`))**.
    We **imag = table.put(in=`imag`,at=`key`,value=(`oldi` + `pi`))**.
    We **next_r = `pr` * `c` - `pi` * `s`**.
    We **pi = `pr` * `s` + `pi` * `c`** and **pr = `next_r`**.
  复相位通过一阶旋转递推生成，避免在内层为每个输入重新求三角函数；这仍是逐项求和，没有变成蝶形快速算法。由于使用浮点数，长序列相位存在有限精度误差。比较时同时记录未量化的归一化总和与十二位小数的公开概率，使用声明的数值容差，不从输出格式推断算法正确。

  We **mass = 0**.
  We **keys = table.keys(map=`real`)**.
  - [求和目标寄存器的概率质量](for keys as key)
    We **r = access(`real`,`key`)** and **i = access(`imag`,`key`)**.
    We **mass = `mass` + `r` * `r` + `i` * `i`**.
  We **p = `mass` / (`q` * `q`)**.
  We **norm = `norm` + `p`**.
  We **p = math.floor(value=(`p` * 1000000000000 + 0.5)) / 1000000000000**.
  We **probabilities = table.append(list=`probabilities`,item=`p`)**.
完成所有自然序号的求和后，结果保留每个输出位置，即使其概率为零也不删除。主实现与参考实现按相同 y 对齐，不能通过重排列表来取得一致。逐项检查比只比较几个最高峰更严格，尤其能检查二十一的非整周期旁瓣；一个看起来像正确峰形的图并不足以证明全部概率正确。

开发者应保留实际执行的参数、源码版本和最大误差。更换参考计算或提高数值精度时，需要重新运行，不能沿用旧结果。两个算法的有限输入一致只是程序验证的一部分，仍然不能证明所有目标规模或任意参数都符合论文条件。独立冻结案例、额外数学核对与用户业务验收分别提供不同层次的证据。

We **out = table.put(in=None,at="probabilities",value=`probabilities`)**.
Return *table.put(in=`out`,at="normalization",value=`norm`)*.

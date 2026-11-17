---
markup: occlusion
title: Shor 可执行知识 · 完整逆傅里叶变换
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | dependencies.oracle 或唯一前置记录；含 q 与 powers |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正文公开约定的实际业务结果，解释器成功不代替业务成功 |

Use `input`=None。

<!-- SHOR_BODY -->

单独核对傅里叶内核时，也允许 dependencies 直接保存唯一的 oracle 返回记录，不再包一层同名字段；正式根入口始终使用 dependencies.oracle。两种形式取得的是同一个完整模幂态，不能从 request 的模数猜测缺失的 powers。只有上游记录本身就绪时才计算，这个兼容读取不改变任何量子态或概率的数学定义。

本段依据 [Shor 论文的量子傅里叶变换与求阶部分](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=14)，把实际模幂态变为完整的控制寄存器测量分布。输入不是一个已知周期，也不是已经求出的因子，而是上游逐个控制输入计算的目标基底映射。函数采用基二快速变换完成同一个逆傅里叶线性算子，保留复振幅干涉，再对目标寄存器取偏迹。先前经典路径没有模幂态时，本段明确跳过，不构造假分布。

We **skip = table.put(in=None,at="status",value="skipped")**.
1. type(value=`input`) != "map"
  Return *skip*.
We **d = json.get(value=`input`,key="dependencies")**.
1. type(value=`d`) != "map"
  Return *skip*.
We **o = json.get(value=`d`,key="oracle")**.
1. `o` == None and json.get(value=`d`,key="status") != None
  We **o = `d`**.
1. type(value=`o`) != "map"
  Return *skip*.
1. json.get(value=`o`,key="status") != "ready"
  Return *skip*.
We **q = access(`o`,"q")** and **powers = access(`o`,"powers")**.
初始联合态的振幅归一化与逆傅里叶变换各含一个一除以 q 的平方根，所以目标基底内未归一化复振幅求和的模平方要乘以一除以 q 的平方。这里把该表达式交给现有公式库建立符号式，再代入本次控制宽度，公式、符号含义与实际生效的数值保持对应。不能把 q 的平方误写为 q，或者只在报告中展示正确公式而执行另一套常量。

We **normalization_formula = [建立可求值的概率归一化公式](math.formula(text="1/(q*q)"))**.
We **weight = [代入本次寄存器维度](math.eval(formula=`normalization_formula`,var="q",value=`q`))**.
We **xs = table.range(start=0,end=`q`)**.

读者可以从一个小例子理解这里为什么需要完整的联合态：如果四个控制基底分别关联四个不同的目标值，那么目标寄存器完全记录了控制输入。对目标寄存器不读结果，相当于把这些正交路径的概率相加，控制端就不能表现为一个纯均匀叠加态的单一零峰。相反，如果某些控制输入关联相同目标值，这些路径仍然不能被目标寄存器区分，经过变换就会干涉。只有这个层次处理正确，周期结构才会在测量分布中出现。

对十五、底数二、正式控制宽度二百五十六，模幂态恰好具有整除控制宽度的四阶结构，因此峰位落在零、六十四、一百二十八和一百九十二，各占四分之一。这个描述用于解释公开验收，并没有写入程序的计算分支。对二十一的阶六不整除五百一十二，峰与旁瓣由相同代码自然得到；如果将这两种输入都硬编码成四个等概率峰，独立分布核对就会失败。

程序预先计算旋转相位，是为了避免在每一个蝶形中重复调用三角函数，并不缓存某一个实验的答案。每层把一对复振幅线性组合，两个输出分别是和与差，直到覆盖全部控制位。循环数量由 q 的二进制宽度决定，目标集合来自真实模幂映射，因此不存在遍历候选因子、提前确定周期或根据期待结果选择相位峰的步骤。

实际调用者应先运行前置检查和模幂态函数，再把 oracle 的返回放入 dependencies。单元没有跨任务读取其他实验的路径，也没有进程、网络或文件写入需求，因而能在知识库只读执行环境中重现。若输入不是一个已经就绪的模幂态，返回 skipped 明确表示这一步没有运行；它不能作为实验成功的标记。一个实验最终能否分解整数，还要看本次实际测量和经典后处理。

We **bits = 0** and **size = 1** and **tries = table.range(start=0,end=10)**.
- [从寄存器宽度取得傅里叶层数](for tries as unused)
  1. `size` < `q`
    We **bits = `bits` + 1** and **size = `size` * 2**.
We **steps = table.range(start=0,end=`bits`)**.
We **reversed = table.empty_list()** and **c = table.empty_list()** and **s = table.empty_list()** and **probs = table.empty_list()**.
- [准备比特倒序索引与独立旋转相位](for xs as x)
  We **v = `x`** and **r = 0**.
  - [逐位反转基底编号](for steps as step)
    We **h = int(value=math.floor(value=(`v` / 2)))**.
    We **r = `r` * 2 + `v` - `h` * 2** and **v = `h`**.
  We **reversed = table.append(list=`reversed`,item=`r`)**.
  We **c = table.append(list=`c`,item=math.cos(value=(-2 * math.pi() * `x` / `q`)))**.
  We **s = table.append(list=`s`,item=math.sin(value=(-2 * math.pi() * `x` / `q`)))**.
  We **probs = table.append(list=`probs`,item=0)**.
傅里叶变换必须保留振幅的实部与虚部，不能对模幂输出做一次直方图就代替量子演化。这里对每个正交目标基底构造相应控制态，依次施加所有二进制蝶形层。比特倒序仅是快速算法的数据排列；最后的 y 仍是自然整数编号，不需要用户再反转测量结果。旋转角度取负，对应本知识约定的完整逆离散傅里叶变换。

快速实现把同一个线性变换分解成小变换，并不先求最小周期。它降低的是经典模拟的计算开销，没有声称经典设备获得 Shor 的量子加速。控制寄存器至多五百一十二维，目标寄存器保留所有实际出现的正交基底；未出现的振幅为零。这种表示在给定模幂态上与完整双寄存器向量等价，不删掉任何不利的测量分支。

We **targets = table.unique(list=`powers`)**.
- [对每个正交目标基底独立作逆傅里叶变换](for targets as target)
  We **re = table.empty_list()** and **im = table.empty_list()**.
  - [形成该目标基底对应的控制寄存器振幅](for xs as x)
    We **v = 0**.
    1. table.at(xs=`powers`,i=table.at(xs=`reversed`,i=`x`)) == `target`
      We **v = 1**.
    We **re = table.append(list=`re`,item=`v`)**.
    We **im = table.append(list=`im`,item=0)**.
  每个目标基底内部相干演化，来自不同控制输入的振幅可以相长或相消。不同目标基底之间仍然正交，不能先合并它们的振幅；因此每一个目标基底分别经过完整变换，再在测量时加总概率。初始态的归一化与变换的归一化各贡献一除以 q 的平方根，平方后的公共分母是 q 的平方。

  We **size = 2**.
  - [用蝶形层逐步应用完整傅里叶酉变换](for steps as step)
    We **half = int(value=(`size` / 2))**.
    We **js = table.range(start=0,end=`half`)** and **blocks = table.range(start=0,end=`q`,step=`size`)**.
    We **nr = table.empty_list()** and **ni = table.empty_list()**.
    - [每个蝶形块保持自然输出顺序](for blocks as b)
      We **lr = table.empty_list()** and **li = table.empty_list()** and **rr = table.empty_list()** and **ri = table.empty_list()**.
      - [合并复振幅而不是提前合并概率](for js as j)
        We **i = `b` + `j`** and **k = `i` + `half`** and **w = int(value=(`j` * `q` / `size`))**.
        We **ar = table.at(xs=`re`,i=`i`)** and **ai = table.at(xs=`im`,i=`i`)**.
        We **br = table.at(xs=`re`,i=`k`)** and **bi = table.at(xs=`im`,i=`k`)**.
        We **cw = table.at(xs=`c`,i=`w`)** and **sw = table.at(xs=`s`,i=`w`)**.
        We **tr = `br` * `cw` - `bi` * `sw`** and **ti = `br` * `sw` + `bi` * `cw`**.
        We **lr = table.append(list=`lr`,item=(`ar` + `tr`))** and **li = table.append(list=`li`,item=(`ai` + `ti`))**.
        We **rr = table.append(list=`rr`,item=(`ar` - `tr`))** and **ri = table.append(list=`ri`,item=(`ai` - `ti`))**.
      We **nr = table.concat(a=`nr`,b=table.concat(a=`lr`,b=`rr`))**.
      We **ni = table.concat(a=`ni`,b=table.concat(a=`li`,b=`ri`))**.
    We **re = `nr`** and **im = `ni`** and **size = `size` * 2**.
  所有蝶形层完成后，控制寄存器处于傅里叶基下的联合态。取目标寄存器的偏迹意味着把同一控制输出下不同目标基底的模平方相加；它不表示通过经典查询得到了周期。比如模幂映射在四维控制空间里各不相同，目标基底能完全区分控制输入，控制测量就是均匀分布，这也是检验纠缠与偏迹是否处理正确的独立例子。

  We **next = table.empty_list()**.
  - [目标寄存器取偏迹后得到控制寄存器测量概率](for xs as x)
    We **r = table.at(xs=`re`,i=`x`)** and **i = table.at(xs=`im`,i=`x`)**.
    We **p = table.at(xs=`probs`,i=`x`) + (`r` * `r` + `i` * `i`) * `weight`**.
    We **next = table.append(list=`next`,item=`p`)**.
  We **probs = `next`**.
有限精度会产生很小的浮点误差。我们先累加未量化的所有概率并核对归一化，容差明确为十的负十次方；这不是为了让任意错误分布通过，而是容纳正弦余弦运算的舍入。公开的概率向量保留十二位小数，归一化字段也采用同样显示精度。归一化判断使用量化之前的真实总和，不能把一直接写成常量冒充检查。

当前范围没有做大数因式分解，也没有省略目标寄存器换取一个预知的理想周期峰。十五和二十一是可承受的教学实例；随着寄存器扩大，经典模拟仍快速增加内存与时间。每项结果都保留自然序号、零概率项和非整周期造成的旁瓣。非整周期时概率不会只集中在几个手工指定位置，这些旁瓣是后面测量失败和重试的真实来源。

We **rounded = table.empty_list()** and **norm = 0**.
- [保留明确的数值显示精度](for probs as p)
  We **norm = `norm` + `p`**.
  We **rounded = table.append(list=`rounded`,item=(math.floor(value=(`p` * 1000000000000 + 0.5)) / 1000000000000))**.
We **out = table.put(in=None,at="status",value="ready")**.
We **out = table.put(in=`out`,at="q",value=`q`)** and **out = table.put(in=`out`,at="probabilities",value=`rounded`)**.
We **shown_norm = math.floor(value=(`norm` * 1000000000000 + 0.5)) / 1000000000000**.
We **out = table.put(in=`out`,at="normalization",value=`shown_norm`)**.
独立验证需要区分数学等价与实现正确。快速变换与逐项复指数求和是同一个线性算子的两条计算路径，比较全部概率可以发现位序、旋转方向、归一化和偏迹方面的程序错误；这仍不是对所有输入的数学证明。公开的小维向量给出了可以手算的验收，正式的两组实例则检查较大维度和不能整除周期的情况。全部观测应与源码版本一起保留，不能在修复后仅引用旧试运行。

量化只作用在对外展示的数值，不改变状态演化中的中间复振幅。返回的 normalization_ok 表示本次原始概率总和在规定误差内接近一；使用者可以同时检查公开向量的总和。许多独立舍入值相加时仍可能与一存在很小差别，后续逆累积分布只应处理这个已公开精度的分布，不应为了让失败输入成功而手工调整峰值或丢弃零相位。

完成真实复振幅演化与偏迹后，返回分布和实际归一化检查：*table.put(in=`out`,at="normalization_ok",value=(math.abs(value=(`norm` - 1)) <= 0.0000000001))*。

---
markup: occlusion
title: Shor 可执行知识 · 实验边界与经典预处理
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | 记录；request 含 n、a、q、u，详细范围和经典分支见正文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正文公开约定的实际业务结果，解释器成功不代替业务成功 |

Use `input`=None。

<!-- SHOR_BODY -->
先建立明确的输入边界。本文取自 [Shor 的公开扩展论文](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=15) 的因子分解约化，但把可运行规模限制为三个至二十一个自然数。这个限制来自经典模拟的资源预算，不是算法在理论上只能处理这些整数。输入记录的 request 是原始业务请求，省略时使用十五、底数二和均匀变量零点三；用户给定的内容不能当成外部代码执行。

先检查记录结构与数值类型，再进行除法、开方和模运算。布尔值不是整数，文本形式的数字不会被悄悄转换。控制宽度 q 是控制寄存器的基态数量，必须为二的幂，满足原文的平方精度条件且不超过五百一十二。可复核的均匀变量 u 只规定从累计分布的哪个位置测量；它不是一个声称来自量子硬件的随机数。若需要多次实验，调用者应明确改变它，后文不能总选有利的测量。


从调用方式看，单独读取本段时需要一个包含 request 的输入记录；在最终知识入口调用 run 时，只传原始业务请求即可，工程入口会建立这层记录。两种调用层次不能混淆。例如直接给本段一个没有 request 的普通空记录，表示采用默认实验；把整数十五本身当作记录则属于类型错误。这里不会从任意字符串中抽取数字，也不会猜测用户是不是想写另一个字段。

对于默认实验，平方精度条件意味着二百二十五不大于 q，而 q 小于四百五十，所以最小二次幂是二百五十六。二十一的平方是四百四十一，对应的 q 是五百一十二。目标寄存器分别需要四位和五位，控制寄存器分别需要八位和九位。q 是基态数，不是量子比特数；把 q 直接当成二百五十六个量子比特会完全误解资源消耗。

经典预处理有独立可复核的例子：十四首先返回因子二，九作为完全幂返回底数三，十五选底数三时通过最大公约数得到三。这些结果的存在不能证明傅里叶子程序被运行过。默认的十五与底数二不会在预处理里得到因子，必须继续真实量子态演化；这也是教学演示不能省略的区别。

均匀变量的区间采用左闭右开约定。它等于零时可能落入无用的零相位，它恰好等于某个累计边界时进入下一个桶，而不是用浮点比较强行留在上一个桶。最终知识会保留这种失败，并允许以另一个明确输入重做实验；固定的零点三仅提供一次可复核的运行，不能说明单次采样总能成功。

返回值的 status 是业务事实，不能和编译器的执行成功混同。quantum 表示输入已获准进入量子模拟，而不是已经分解成功；classical 表示本段找到一个经典可验证因子；invalid 表示调用应停止或修改输入。后续函数不能因为解释器正常退出，就忽略这份业务状态继续编造概率或因子。

We **r = table.empty_map()** and **bad = table.put(in=None,at="status",value="invalid")**.
1. `input` != None
  1. type(value=`input`) != "map"
    Return *table.put(in=`bad`,at="reason",value="input_type")*.
  We **v = json.get(value=`input`,key="request")**.
  1. `v` != None
    1. type(value=`v`) != "map"
      Return *table.put(in=`bad`,at="reason",value="input_type")*.
    We **r = `v`**.
We **n = 15** and **a = 2** and **u = 0.30**.
1. table.has(map=`r`,key="n")
  We **n = json.get(value=`r`,key="n")**.
1. table.has(map=`r`,key="a")
  We **a = json.get(value=`r`,key="a")**.
1. table.has(map=`r`,key="u")
  We **u = json.get(value=`r`,key="u")**.
1. type(value=`n`) != "int" or type(value=`a`) != "int"
  Return *table.put(in=`bad`,at="reason",value="input_type")*.
1. type(value=`u`) != "int" and type(value=`u`) != "num"
  Return *table.put(in=`bad`,at="reason",value="input_type")*.
1. `n` < 3 or `n` > 21 or `a` < 2 or `a` >= `n`
  Return *table.put(in=`bad`,at="reason",value="domain")*.
1. `u` < 0 or `u` >= 1
  Return *table.put(in=`bad`,at="reason",value="uniform")*.

原文要求先把已有的经典算法能直接处理的情况排除。偶数的因子二、完全幂的底数、底数和模数的非平凡最大公约数都属于经典预处理。报告会写明 classical 路径，不能把这些情形宣传为量子计算。这里先建立资源约束再进入这些分支，以免一个无效寄存器参数因为碰巧是偶数而被忽略。

二次幂由有限次数的倍增得到，整数商由向下取整形成；没有依赖当前语言尚未提供的百分号运算符。由于所有数值都处于小整数范围，商和余数可以精确表示。拒绝超出预算的输入以后，不会在读到巨大数值时开始无界增长。后面的控制寄存器代表从零到 q 减一的完整基底，绝不是直接写入周期或因子。

We **q = 1** and **steps = table.range(start=0,end=10)**.
- [按论文精度选择控制寄存器](for steps as step)
  1. `q` < `n` * `n`
    We **q = `q` * 2**.
1. table.has(map=`r`,key="q")
  We **q = json.get(value=`r`,key="q")**.
  1. type(value=`q`) != "int"
    Return *table.put(in=`bad`,at="reason",value="input_type")*.
1. `q` < `n` * `n` or `q` >= 2 * `n` * `n` or `q` > 512
  Return *table.put(in=`bad`,at="reason",value="register")*.
We **power = 1**.
- [确认基态数量确为二的幂](for steps as step)
  1. `power` < `q`
    We **power = `power` * 2**.
1. `power` != `q`
  Return *table.put(in=`bad`,at="reason",value="register")*.
We **f = None** and **reason = ""**.
1. `n` - 2 * int(value=math.floor(value=(`n` / 2))) == 0
  We **f = 2** and **reason = "even"**.
1. `f` == None
  We **bs = table.range(start=2,end=(int(value=math.floor(value=math.sqrt(value=`n`))) + 1))**.
  - [只有完全幂可在这条经典路径直接给出底数](for bs as b)
    We **p = `b` * `b`**.
    - [小规模幂检验受固定预算限制](for steps as step)
      1. `p` == `n` and `f` == None
        We **f = `b`** and **reason = "perfect_power"**.
      1. `p` < `n`
        We **p = `p` * `b`**.

最大公约数使用欧几里得过程，它回答的是当前底数是否已经暴露一个因子，不是穷举量子阶。发现非平凡公约数可以诚实结束经典分支；没有发现时，不能拿之后素数检查中的试除值代替量子输出。正式的量子分支仍要经历模幂态、完整傅里叶变换、真实分布的测量、连分数和因子校验。

对于小规模教学输入，素数检查只用来拒绝没有非平凡因子的目标。它不会把某个试除因子传给后面的测量器。这个实现没有宣称经典预处理对大整数具有相同效率：若将预算扩展到远大于二十一，需要重新选择有相应复杂度保证的素性测试并评估所有资源，而不能只删除上限。

1. `f` == None
  We **l = `a`** and **v = `n`**.
  - [计算当前底数与模数的公约数](for steps as step)
    1. `v` != 0
      We **rem = `l` - `v` * int(value=math.floor(value=(`l` / `v`)))**.
      We **l = `v`** and **v = `rem`**.
  1. `l` > 1 and `l` < `n`
    We **f = `l`** and **reason = "gcd"**.
1. `f` != None
  We **out = table.put(in=None,at="status",value="classical")**.
  We **out = table.put(in=`out`,at="n",value=`n`)**.
  We **out = table.put(in=`out`,at="factor",value=`f`)**.
  Return *table.put(in=`out`,at="reason",value=`reason`)*.
We **prime = True**.
We **bs = table.range(start=2,end=(int(value=math.floor(value=math.sqrt(value=`n`))) + 1))**.
- [素性检查只拒绝无分解目标，不返回试除因子](for bs as b)
  1. `n` - `b` * int(value=math.floor(value=(`n` / `b`))) == 0
    We **prime = False**.
1. `prime`
  Return *table.put(in=`bad`,at="reason",value="prime")*.

到这里，输入已经适合当前量子态实验。我们返回实际使用的参数，后续单元根据这份记录运行，不能从聊天中重新解释另一个底数或宽度。n、a、q、u 的含义分别是待分解整数、互素底数、控制基底数量和公开的采样位置。记录中没有隐藏的因子、周期或后验成功标记。用户可以在根入口看到这一步走的是经典路径还是量子路径，并据此理解最终结果的来源。

We **out = table.put(in=None,at="status",value="quantum")**.
We **out = table.put(in=`out`,at="n",value=`n`)** and **out = table.put(in=`out`,at="a",value=`a`)**.
We **out = table.put(in=`out`,at="q",value=`q`)**.
在核对全部边界后，我们得到后续实验的参数，此时直接返回*table.put(in=`out`,at="u",value=`u`)*。

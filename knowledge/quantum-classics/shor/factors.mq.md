---
markup: occlusion
title: Shor 可执行知识 · 提取并核验非平凡因子
import:
  math: lib/math.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

## evaluate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| input | any | None | 记录；dependencies 包含 preflight 与 period |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 正文公开约定的实际业务结果，解释器成功不代替业务成功 |

Use `input`=None。

<!-- SHOR_BODY -->

算法输出的两个因子在当前小范围内足以说明一次分解是否有效，但它不是一个递归完全质因数分解器。如果未来扩展到更大复合数，两个合法因子仍可能是合数，调用者需要在新的任务中说明是否递归分解。当前返回保持这层含义，不为用户未要求的行为增加隐藏循环或额外随机尝试。

用户阅读实验时，可以先看 preflight 决定了哪条路线，再看 period 是否给出了实际验证的候选，最后核对因子乘积。这样“得到三和五”不是无法追溯的常量，而是有来源、有条件、有失败分支的计算结果。每个步骤都能通过 Marqdo 单独调用，这正是论文变成可执行知识的价值：函数边界同时是开发说明、工具接口和验证边界。

安全与数学正确性也需要分开理解。只读知识环境不允许进程、网络或动态插件调用，本段因此使用标准库中的普通整数与列表函数实现；它不执行上传的参考源码，不读取用户密钥或其他任务文件。限制副作用不能自动证明算法正确，所以仍然需要冻结的独立契约、实际试运行与用户验收。相反，一个数学上合理的结果也不能赋予执行器更大的文件权限。

当上游明确返回零相位或未验证分母，本段原样保留原因，便于界面告诉用户下一次应该改变测量分位数还是底数。没有周期记录则返回 period_unavailable，不能根据模数猜一个周期。所有失败都有明确来源，用户可以回看四个阶段和各单元结果；错误信息不是用来装饰报告，而是支持下一次可复现尝试的依据。

本段根据前面已经真实得到的结果提取整数因子，并明确区分经典预处理与量子态模拟两条路线。来源是 [Shor 论文因子分解归约](uploads/Shor-1996-quant-ph-9508027v2.pdf#page=16)：底数与模数互素时，若得到合适的偶数周期，底数的半周期次幂能给出一的非平凡平方根，再通过最大公因数提取因子。这个经典后处理是完整算法的一部分，不能把独立试除的答案塞进返回值。

前置检查可能已经识别偶数、完全幂或非平凡最大公因数，这些情况本来就无需运行量子电路。它们返回 classical 路线，让阅读者知道成功来自哪里；量子态模拟路线只有在实际相位、连分数候选与模幂验证都接通后才可能出现。路线字段用于说明证据来源，不表示当前经典设备完成了具备量子加速的大数分解。

We **retry = table.put(in=None,at="status",value="retry")**.
We **retry = table.put(in=`retry`,at="reason",value="period_unavailable")**.
1. type(value=`input`) != "map"
  Return *retry*.
We **d = json.get(value=`input`,key="dependencies")**.
1. type(value=`d`) != "map"
  Return *retry*.
We **p = json.get(value=`d`,key="preflight")**.
1. type(value=`p`) != "map"
  Return *retry*.
We **status = json.get(value=`p`,key="status")**.
1. `status` == "invalid"
  Return *table.put(in=table.put(in=None,at="status",value="invalid"),at="reason",value=access(`p`,"reason"))*.
We **n = access(`p`,"n")** and **factor = 0** and **route = "quantum_state_simulation"**.
1. `status` == "classical"
  We **factor = access(`p`,"factor")** and **route = "classical"**.
2. `status` == "quantum"
  We **period = json.get(value=`d`,key="period")**.
  1. type(value=`period`) != "map"
    Return *retry*.
  1. json.get(value=`period`,key="status") == "retry"
    Return *table.put(in=`retry`,at="reason",value=access(`period`,"reason"))*.
  1. json.get(value=`period`,key="status") != "period"
    Return *retry*.
  We **r = access(`period`,"r")**.
  1. `r` - 2 * int(value=math.floor(value=(`r` / 2))) != 0
    Return *table.put(in=`retry`,at="reason",value="odd_period")*.

  偶数周期只是必要条件。半周期模幂若等于一或负一，平方虽然也是一，却不能通过相邻的两个最大公因数得到非平凡分解。本段先计算真实的半周期幂，再明确拒绝这两种平凡平方根。不能看到“偶数”就直接返回预期因子，也不能通过另找一个底数掩盖本次运行的失败。要更换底数，需要用户显式发起下一次实验。

  半周期幂逐次模乘，所有中间整数均处于很小范围，不会用浮点指数计算一个大数再取余。这里支持的最大模数二十一是公开的教学边界，归一化与相位精度都由上游控制。把小范围验证写清楚，能够让另一个智能体准确调用，同时避免把该实现宣传成生产级密码分析工具。

  We **a = access(`p`,"a")** and **z = 1**.
  We **steps = table.range(start=0,end=int(value=(`r` / 2)))**.
  - [计算经过验证周期对应的半周期模幂](for steps as step)
    We **product = `z` * `a`**.
    We **z = `product` - `n` * int(value=math.floor(value=(`product` / `n`)))**.
  1. `z` == 1 or `z` == `n` - 1
    Return *table.put(in=`retry`,at="reason",value="trivial_square_root")*.

  我们分别对平方根减一与平方根加一执行欧几里得算法。两个方向都保留，最终只接受严格介于一与模数之间且整除模数的候选。这个检查对应平方差分解的算术条件，不遍历任何候选因子表，也不查询预先知道的答案。若没有得到合法因子，明确返回 no_factor，保留真实失败。

  最大公因数的迭代上界来自公开的小整数域，十轮足以覆盖当前所有输入。算法的输入是半周期幂和模数，和上游连分数候选的生成各有责任；最终返回的整数对仍要检查乘积与模数一致。多个步骤各自成功并不自动证明整合成功，最后这层检查使不相容的中间结果不能被标记为完成。

  We **shifts = table.append(list=table.append(list=table.empty_list(),item=-1),item=1)**.
  We **rounds = table.range(start=0,end=10)**.
  - [从平方差两侧提取非平凡最大公因数](for shifts as shift)
    We **left = `n`** and **right = `z` + `shift`**.
    - [按欧几里得关系缩小余数](for rounds as unused)
      1. `right` > 0
        We **remainder = `left` - `right` * int(value=math.floor(value=(`left` / `right`)))**.
        We **left = `right`** and **right = `remainder`**.
    1. `left` > 1 and `left` < `n` and `factor` == 0
      We **factor = `left`**.
2. True
  Return *retry*.

输出按升序排列，便于不同尝试之间核对。因子是原生整数列表，不是包含括号或逗号的文本，调用者能够继续进行精确算术。对于完全平方数的经典路径，允许两个相等的因子，例如九对应三和三；这个例子与量子周期路线分别解释，避免一个已知小因子被错误归因于量子测量。

在本知识范围内，十五的底数二与周期四会给出三和五，二十一的底数二与周期六会给出三和七。这些是公开数学验收示例，不是专门针对数值的分支。失败的相位、奇周期、平凡平方根和无因子都使用同一套明确状态返回。用户可以阅读每段中间值，确认真正完成了哪一步，再决定是否重试，而不是只看到一句完成消息。

We **other = 0**.
1. `factor` > 1
  We **other = int(value=(`n` / `factor`))**.
1. `factor` <= 1 or `factor` >= `n` or `factor` * `other` != `n`
  Return *table.put(in=`retry`,at="reason",value="no_factor")*.
We **low = `factor`** and **high = `other`**.
1. `low` > `high`
  We **low = `other`** and **high = `factor`**.
We **pair = table.append(list=table.append(list=table.empty_list(),item=`low`),item=`high`)**.
We **out = table.put(in=None,at="status",value="factored")** and **out = table.put(in=`out`,at="n",value=`n`)**.
We **out = table.put(in=`out`,at="factors",value=`pair`)**.
完成所有算术核对后，我们得到带实际路线的因子结果，此时返回*table.put(in=`out`,at="route",value=`route`)*。

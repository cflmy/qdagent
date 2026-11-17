---
markup: occlusion
title: Shor 正式分布的两路径逐项核对
import:
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  math: lib/math.mq.md
---
## compare

| 参数 | 类型 | 说明 |
|---|---|---|
| experiment | text | 实际主入口的 JSON 结果文件路径 |
| reference | text | 直接傅里叶路径的实际 JSON 结果文件路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 全向量最大绝对误差、归一化误差和核对是否通过 |

Use `experiment`, `reference`。

这里读取两次真实命令保存的返回文件，按自然相位序号逐项比较。两份文件分别来自快速变换主入口与逐项复指数求和参考路径，不能将同一个输出复制成两份来取得一致。调用时授权的文件根限制读取范围，本函数不写文件、不改冻结预期，也不运行第三方源码。它只处理明确提供的观察，不凭一个文件名推断计算成功。

独立冻结案例与这里的比较具有不同作用。冻结案例核对先于实现确定的公开输入、返回及边界；这里则在正式维度上检查完整概率向量，两条计算路径的代码结构不同。比较全部相位比只比较最高峰更容易暴露位序、归一化和旁瓣错误。即使两者一致，也不能宣称已经证明所有整数或密码学规模的算法正确，仍需保留论文条件和经典模拟的限制。

We **main = fs.read_json(path=`experiment`)** and **other = fs.read_json(path=`reference`)**.
1. not access(`main`,"ok") or not access(`other`,"ok")
  Return *table.put(in=None,at="passed",value=False)*.
We **f = access(access(`main`,"result"),"fourier")** and **r = access(`other`,"result")**.
We **a = access(`f`,"probabilities")** and **b = access(`r`,"probabilities")**.
1. len(`a`) != len(`b`)
  Return *table.put(in=None,at="passed",value=False)*.

比较容差明确为十的负十次方。两份公开向量均保留十二位小数，中间复振幅并未量化，因此也检查各自未被写死为常量的归一化总和。一个向量长度相同但数值错误，或者概率接近却总质量偏离一，都不能通过。返回保留实际误差，便于读者判断当前数值精度，而不是只看到一个无法解释的绿色标签。

We **worst = 0** and **positions = table.range(start=0,end=len(`a`))**.
- [按相同自然序号核对每一个测量位置](for positions as position)
  We **delta = math.abs(value=(table.at(xs=`a`,i=`position`) - table.at(xs=`b`,i=`position`)))**.
  1. `delta` > `worst`
    We **worst = `delta`**.
We **norm_error = math.abs(value=(access(`f`,"normalization") - 1))**.
We **reference_error = math.abs(value=(access(`r`,"normalization") - 1))**.

对于十五，整除控制宽度的周期让概率集中在四个位置，是可以手算的核对。对于二十一，周期不能整除五百一十二，真实分布同时含峰与旁瓣，适合检测快速变换是否省略了其余相位。两组计算分别覆盖整周期和非整周期，仍然只是有限的实验范围，不能借此删除公开的输入预算。

若结果文件缺少成功标记、概率向量长度不同或者归一化不通过，本函数保留失败。真正的算法修复应该改变源程序并重新计算，不能改写观察文件来满足比较。输入文件由执行命令直接保存，报告再引用这些真实数据，使执行证据与叙述对应，而不是先写结论再补一份看似合理的数据。

这些文件是计算观察，不是可执行指令，也不能用于生成或覆盖独立测试的 expected。开发者改变任一路径后需要重新运行并保存新观察，原有报告仍表示旧版本。正式知识主入口不调用这个较慢的参考算法，因此用户普通调用保持原有有界运行成本；需要科学复核时可单独执行参考路径和本函数。

We **out = table.put(in=None,at="positions",value=len(`a`))**.
We **out = table.put(in=`out`,at="max_abs_error",value=`worst`)**.
We **out = table.put(in=`out`,at="main_normalization_error",value=`norm_error`)**.
We **out = table.put(in=`out`,at="reference_normalization_error",value=`reference_error`)**.
完成逐项核对之后，返回包含实际误差的*table.put(in=`out`,at="passed",value=(`worst` <= 0.0000000001 and `norm_error` <= 0.0000000001 and `reference_error` <= 0.0000000001))*。

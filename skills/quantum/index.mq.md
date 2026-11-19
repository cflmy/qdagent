---
markup: occlusion
title: 量子计算与验证
description: 使用 Marqdo 量子拓展库获取贝尔态仿真与测量的实际数值
agent_effects: compute
import:
  quantum: ext/quantum/index.mq.md
  result: lib/result.mq.md
---

量子模拟的数值输出来自原生扩展，不靠 LLM 口述计算。实际硬件的保真度与模拟结果严格区分；插件模拟结果不是对任意真实硬件实验的证据。这里展示一个稳定且可验证的 Bell 态计算入口，更多电路计算按量子扩展真实签名逐层展开。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信任务 |
| goal | text | 量子计算需求；当前入口示范 Bell 态 |

Use `context`, `goal`。

Return *[执行 Marqdo 量子插件的真实贝尔态分析](quantum.bell_analysis())*.

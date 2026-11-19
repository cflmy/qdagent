---
markup: occlusion
title: 独立 SKILL 样例
description: 从真实输入返回一个明确结果，演示最小可复用能力包
agent_effects: read
---

将这个文件复制到 skills/<slug>/index.mq.md 后，安装索引才会发现它。用户不需要学习根会话或软件工程四阶段；一个职责、一份可读契约与真实可执行的 run 即可成为能力。需要更多工具时先阅读实际 Marqdo 标准库函数。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信会话上下文 |
| goal | text | 本轮用户目标 |

Use `context`, `goal`。

Return *("本 SKILL 已接收到目标：" + `goal`)*.

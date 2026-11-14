---
markup: occlusion
title: 职责完整后的框架发表现场
import:
  outline: outline.mq.md
---

用户限定的职责数已经满足，本轮不再提供定义职责的接口。

## publish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 实际工程题目 |
| goal | text | required | 用户确认的业务目标 |
| acceptance | text | required | 可观察的业务验收 |
| artifact_kind | text | "" | 明确需要的 docx 或 pptx，其他任务留空 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已发表真实框架，等待用户确认 |

Use `title`, `goal`, `acceptance`, `artifact_kind`=""。

直接使用已经保存的职责形成 plan.mq.md，不重新定义单元或传入列表。真实工作根、职责、参数返回表和未接通标记都由实际文稿处理。用户审阅并确认这份源码摘要后，才允许独立测试与实现。发表成功不能代替用户确认，也不意味着业务代码已经运行。

这个调用现场只提供下一步所需函数，前一轮定义职责的函数不在当前公开接口里。标题、目标与验收应描述真实业务，不能把成功状态或执行动画作为业务结果。办公产物只有用户明确要求时才指定，其他任务留空，后续不开放无关能力。

Return *[发表已有职责并等待审阅](outline.publish(title=`title`,goal=`goal`,acceptance=`acceptance`,artifact_kind=`artifact_kind`))*.

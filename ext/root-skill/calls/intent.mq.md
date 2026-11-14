---
markup: occlusion
title: 意图拆解的当前可调用文稿
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  result: lib/result.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  intent: ../intent.mq.md
---

意图拆解的当前可调用文稿。阅读函数参数并直接调用，用户确认不在模型接口中。

## ask

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| summary | text | required | 对用户目标的理解 |
| question | text | required | 向用户提出的一个问题 |
| first | text | required | 第一个可选回答 |
| second | text | required | 第二个不同回答 |
| third | any | None | 可选的第三项 |
| fourth | any | None | 可选的第四项 |
| fifth | any | None | 可选的第五项 |
| sixth | any | None | 可选的第六项 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 问题已经保存，等待真实用户回应 |

Use `summary`, `question`, `first`, `second`, `third`=None, `fourth`=None, `fifth`=None, `sixth`=None。

请先提出有区分度的问题，对齐目的、交付和验收。不要要求用户重复已经给出的材料。调用只产生待答问题；确认必须由用户在页面中完成，不能在模型文字里声称已经批准。

选项直接写入 first、second 等参数，无需先造列表。每项应是用户能读懂的一句话，不能把程序、JSON 或一个内部变量名当成选项。用户始终可以在界面自由补充，不必被选项限制；只有用户点击确认才能结束意图阶段。模型可以依据补充继续追问，但不能重复已经明确的固定内容。

例如，用户已经说要两个固定返回函数，就应该询问仍有必要决定的交付边界，不能再次要求解释字符串是否存在。summary 复述已知目标，question 聚焦一个未决问题，选项覆盖互相区分的方向。问题保存后，调用返回等待事实而不是整份历史，下一次收到的材料将包含真实用户答复。错误阶段会拒绝，重复运行也不会自动批准框架。

`entries` =

| choice |
|---|
| `first` |
| `second` |
| `third` |
| `fourth` |
| `fifth` |
| `sixth` |

We **choices = table.empty_list()**.
- [收集给用户的具体选择](for entries as option)
  1. `option` != None
    We **choices = table.append(list=`choices`,item=`option`)**.
We **context = io.current()**.
We **permit = flow.authorize(context=`context`,phase="intent",role="intent")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **asked = intent.clarify_intent(context=`context`,summary=`summary`,question=`question`,choices=`choices`)**.
1. not access(`asked`,"ok")
  Return *asked*.
Return *result.ok(value=table.put(in=None,at="waiting_for_user",value=True))*.

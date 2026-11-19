---
markup: occlusion
title: 求道智能体 · 唯一生产入口
description: 极薄的能力发现、短选择、受控执行与可信收据聚合。
import:
  session: session.mq.md
  catalog: catalog.mq.md
  decision: decision.mq.md
  executor: executor.mq.md
  evidence: evidence.mq.md
  io: io.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

# agent

这里不定义“先规划再编码再测试”的固定业务阶段。简单任务直接复用已有 SKILL；需要多步的复杂任务由选定的领域工作流继续展开。任何能力必须通过已安装源码和权限核验；根不会执行模型生成的路径。无需为简单回答请求人工确认。带外部写入的技能必须先取得真实用户批准。

## run
    + `context`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信宿主的任务上下文 |

Use `context`。

We **saved = session.status(context=`context`)**.
1. not access(`saved`,"ok")
  Return *[会话读取失败不伪造结果](table.put(in=None,at="status",value="failed"))*.
We **state = access(`saved`,"value")**.
We **pending = json.get(value=`state`,key="pending")**.
1. `pending`
  `waiting` =
  
  | answer | status | pending |
  |---|---|---|
  | "当前能力需要你的真实确认，批准后才允许执行。" | "waiting_user" | `pending` |
  
  Return *`waiting`*.
We **goal = json.get(value=`state`,key="goal")**.
1. not `goal`
  `empty` =
  
  | answer | status |
  |---|---|
  | "请描述要完成的任务。" | "waiting_user" |
  
  Return *`empty`*.
We **candidates = catalog.discover(context=`context`)**.
1. not access(`candidates`,"ok")
  `unavailable` =
  
  | answer | status |
  |---|---|
  | "能力目录不可用，未执行任何工具。" | "incomplete" |
  
  Return *`unavailable`*.
We **choice = decision.choose(context=`context`,goal=`goal`,candidates=access(`candidates`,"value"))**.
1. not access(`choice`,"ok")
  `unrouted` =
  
  | answer | status |
  |---|---|
  | "本次未能可靠选择能力，保留请求以便继续。" | "incomplete" |
  
  Return *`unrouted`*.
We **selected = access(`choice`,"value")**.
We **receipt = executor.call(context=`context`,skill=`selected`,goal=`goal`)**.
1. not access(`receipt`,"ok")
  We **code = json.get(value=access(`receipt`,"error"),key="code")**.
  1. `code` == "agent.approval_required"
    We **request = session.propose(context=`context`,skill=`selected`,question="此 SKILL 将产生外部或可变更效果。是否允许本次执行？")**.
    `question` =
    
    | answer | status | pending |
    |---|---|---|
    | "需要确认本次效果范围。" | "waiting_user" | `request` |
    
    Return *`question`*.
  `failed` =
  
  | answer | status |
  |---|---|
  | "能力未成功完成，真实错误已保留在执行记录。" | "incomplete" |
  
  Return *`failed`*.
We **actual = access(`receipt`,"value")**.
We **final = session.finish(context=`context`,status="succeeded",answer=str(`actual`),skill=`selected`)**.
`output` =
  
| answer | status |
|---|---|
| `actual` | "succeeded" |

Return *`output`*.

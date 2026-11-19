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

# main

每次模型上下文严格只有用户输入、memory.mq.md 和本次执行的 Marqdo 源文稿。所有路由与任务编排都是此文稿的执行，不从外部框架注入消息或历史。这里不定义“先规划再编码再测试”的固定业务阶段。简单任务直接复用已有 SKILL；需要多步的复杂任务由选定的领域工作流继续展开。任何能力必须通过已安装源码和权限核验；根不会执行模型生成的路径。无需为简单回答请求人工确认。带外部写入的技能必须先取得真实用户批准。

## 已安装能力（源码派生的 Marqdo 文档章节）

如果需要为用户目标选择 SKILL，仅输出最符合的 slug，不生成程序或文件路径。实际安装集合由 Marqdo 官方解析器再次校验。下面这份表来自 scripts/sync_capabilities.py；新增技能后重建当前文稿，它不是附加给模型的外部工具 Prompt。

<!-- BEGIN GENERATED CAPABILITIES -->
| slug | 可用的领域能力 |
|---|---|
| chat | 处理无需外部操作的解释、对话、归纳与简短写作 |
| code | 生成可审阅的 Marqdo 源码草稿；发布须另外经过官方编译与独立验证 |
| dev | 对需要持久工程、独立验证和受控发布的请求启动 Marqdo 原生开发工作簿 |
| knowledge | 按来源与语义作用域查询 Marqdo 知识索引、证明依赖或正式证书 |
| office | 创建一份由真实正文构成的可编辑 Word 文档，需要人工批准写入效果 |
| quantum | 使用 Marqdo 量子拓展库获取贝尔态仿真与测量的实际数值 |
| research | 按需获取公开来源候选并核对实际页面的只读研究能力 |
<!-- END GENERATED CAPABILITIES -->

## run

| 参数 | 类型 | 说明 |
|---|---|---|



We **saved = session.status()**.
1. not access(`saved`,"ok")
  Return *[会话读取失败不伪造结果](table.put(in=None,at="status",value="failed"))*.
We **state = access(`saved`,"value")**.
We **pending = json.get(value=`state`,key="pending")**.
1. json.get(value=`state`,key="phase") == "complete"
  We **previous_answer = json.get(value=`state`,key="answer")**.
  We **previous_status = json.get(value=`state`,key="status")**.
  `completed` =
  
  | answer | status |
  |---|---|
  | `previous_answer` | `previous_status` |
  
  Return *`completed`*.
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
We **candidates = catalog.discover()**.
1. not access(`candidates`,"ok")
  `unavailable` =
  
  | answer | status |
  |---|---|
  | "能力目录不可用，未执行任何工具。" | "incomplete" |
  
  Return *`unavailable`*.
We **choice = session.status()**.
1. json.get(value=`state`,key="approved_skill")
  We **choice = table.put(in=None,at="ok",value=True)**.
  We **choice = table.put(in=`choice`,at="value",value=json.get(value=`state`,key="approved_skill"))**.
2. *
  We **choice = decision.choose(candidates=access(`candidates`,"value"))**.
1. not access(`choice`,"ok")
  `unrouted` =
  
  | answer | status |
  |---|---|
  | "本次未能可靠选择能力，保留请求以便继续。" | "incomplete" |
  
  Return *`unrouted`*.
We **selected = access(`choice`,"value")**.
1. json.get(value=`state`,key="approved_skill")
  We **selected = json.get(value=`state`,key="approved_skill")**.
We **spec = catalog.resolve(skill=`selected`)**.
1. not access(`spec`,"ok")
  `missing` =
  
  | answer | status |
  |---|---|
  | "选中的能力不可用；未执行操作。" | "incomplete" |
  
  Return *`missing`*.
We **meta = access(`spec`,"value")**.
We **effects = access(`meta`,"effects")**.
1. (`effects` == "external" or `effects` == "write") and json.get(value=`state`,key="approved_skill") != `selected`
  We **requested = session.propose(skill=`selected`,question="本次操作会读取外部服务或修改资源。确认批准本次效果？")**.
  1. not access(`requested`,"ok")
    `blocked` =
    
    | answer | status |
    |---|---|
    | "无法保存待确认状态，未执行操作。" | "incomplete" |
    
    Return *`blocked`*.
  We **question = json.get(value=access(`requested`,"value"),key="pending")**.
  `waiting_approval` =
  
  | answer | status | pending |
  |---|---|---|
  | "执行该能力之前，需要明确批准。" | "waiting_user" | `question` |
  
  Return *`waiting_approval`*.
We **receipt = executor.call(skill=`selected`)**.
1. not access(`receipt`,"ok")
  We **code = json.get(value=access(`receipt`,"error"),key="code")**.
  1. `code` == "agent.approval_required"
    We **request = session.propose(skill=`selected`,question="此 SKILL 将产生外部或可变更效果。是否允许本次执行？")**.
    `question` =
    
    | answer | status | pending |
    |---|---|---|
    | "需要确认本次效果范围。" | "waiting_user" | `request` |
    
    Return *`question`*.
  We **_ = session.finish(status="incomplete",answer="本次能力失败或效果未知，授权已消耗，不会自动重试。",skill=`selected`)**.
  `failed` =
  
  | answer | status |
  |---|---|
  | "能力未成功完成。操作状态和真实错误需审阅后再重新发起。" | "incomplete" |
  
  Return *`failed`*.
We **actual = access(`receipt`,"value")**.
We **answer = str(json.get(value=`actual`,key="result"))**.
We **graded = evidence.classify(receipt=`receipt`)**.
We **completed_status = access(`graded`,"value")**.
We **saved_final = session.finish(status=`completed_status`,answer=`answer`,skill=`selected`)**.
1. not access(`saved_final`,"ok")
  `not_persisted` =
  
  | answer | status |
  |---|---|
  | "能力有执行收据，但完成状态未持久化，不能标记为已完成。" | "incomplete" |
  
  Return *`not_persisted`*.
`output` =
  
| answer | status |
|---|---|
| `answer` | `completed_status` |

Return *`output`*.

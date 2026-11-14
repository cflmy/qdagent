---
markup: occlusion
title: 意图拆解：真实选择与多轮对齐
import:
  json: lib/json.mq.md
---

本阶段规范与当前公开函数一起构成调用现场；工程流程不另由宿主解释。

## handbook

当前调用文稿是 calls/intent.mq.md，只有 ask。summary 保留已经理解的目标，question 只问一个真正影响交付的未决问题，first、second 等参数直接放普通文字选项。不要嵌套列表构造，不要求用户重复已给出的材料。用户可以同时选择和自由补充，模型不能替用户确认。

问题保存后应停止本次调用。收到真实补充后可以继续提问，最终确认必须由独立用户入口提交确切版本。意图阶段不创建业务实现，不启动子智能体，也不把一次模型响应当作用户批准。

## rules

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 本阶段公开的工程要求 |

读取规则不会执行业务或取得用户批准。本文的叙述给出角色边界，当前调用文稿给出实际参数和返回。调用者只能使用本角色取得的普通函数，阶段迁移依赖真实执行事实和用户选择，不依据聊天中的完成承诺。新增能力应更新实际文稿与验证，不另建工具别名表。

Return *json.parse(text="{\"phase\":\"intent\",\"narrative_minimum\":0.5,\"human_confirmation_is_host_only\":true,\"execution\":\"marqdo call\"}")*.

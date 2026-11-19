---
markup: occlusion
title: 受控软件开发工作流
description: 对需要持久工程、独立验证和受控发布的请求启动 Marqdo 原生开发工作簿
agent_effects: write
import:
  workflow: ../../workflows/software-development/index.mq.md
---

简单问答、查资料和运行已有函数不需要经过此工作流。只在用户确实需要创建或修改软件时，才把范围、职责、检查点、独立测试和发布步骤交给专业工作流。这个包不拥有根入口或通用模型调度器。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 已批准写入效果的任务 |
| goal | text | 用户的软件交付需求 |

Use `context`, `goal`。

Return *workflow.run(context=`context`,goal=`goal`)*.

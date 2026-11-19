---
markup: occlusion
title: 求道原生桥接
description: 保持 Marqdo 与宿主资源的狭窄 ABI 接缝，不包含模型代理循环。
---

求道原生扩展仅提供受控 OS 操作、真实 CLI、短模型传输、编译知识与数据源访问。
领域路由、工作流与记忆语义必须在 agent/、skills/ 和 workflows/ 文稿中。
此模块不提供第二套 Agent Loop，也不安装一份 pages 站点副本。

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前 ABI 的维护职责 |

Return *"qdagent transport: OS/IO boundary only; use agent/index.mq.md for the runtime"*.

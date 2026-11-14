---
markup: occlusion
title: 当前模型与浏览验收兼容入口
import:
  development: ../skills/marqdo-dev/qdagent.mq.md
  deployment: manage.mq.md
---

这个兼容入口只调用当前开发验收，旧计划工具、办公工具名路由和自动完成脚本已经移除。实际任务通过根 SKILL 和用户确认推进。

## start

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | required | 自动验收仅支持明确的 builtin-local |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | start 的真实结果，失败保留诊断 |

Use `selection`。

本入口执行真实工作台的固定正文验收，不能用旧工具名称强迫模型跳过意图或框架确认。当前开发手册给出实际模型范围，其他选择会明确拒绝，不静默换模型。需要研究与文档能力时另外运行浏览器契约验收，并对真实内容进行用户审阅。

Return *development.live_agent(selection=`selection`)*.

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | status 的真实结果，失败保留诊断 |

Use 。

读取真实容器状态，不从旧固定会话推断当前任务成功。服务是否启动、模型是否生成、独立验证是否通过和用户是否确认是不同事实。任务进度应在当前工作台对应会话查看，历史数据不会被此函数删除或自动升级为已完成。

Return *deployment.status()*.

## audit

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | audit 的真实结果，失败保留诊断 |

Use 。

运行当前浏览与文稿交接的真实隔离验收，替代旧的工具名收据猜测。它只使用临时数据和测试容器，实际检查缺失、未访问引用与正文版本变化都必须被拒绝。验收失败保留原始诊断，不把旧会话文件或模型的一句完成当作证据。

Return *deployment.probe_browser()*.

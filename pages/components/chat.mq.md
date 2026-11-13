---
markup: occlusion
title: 底部浮动对话壳
description: 单行玻璃胶囊：左五工具 · 中输入发送 · 右五操作；对齐设计稿。
import:
  component: ext/web/component/index.mq.md
  table: lib/table.mq.md
---

产品壳是一条底部居中的玻璃胶囊（非双层 dock）。左侧上传/模型/插件/知识/工作区，
中间输入与金色发送，右侧刷新/设置/清理/更多/停止。结构真相在
public/generated/qd-overlay.fragment.html，样式在 qd-overlay.css；id 与
public/client.mq.md wire 对齐。禁止再拆成顶栏 + reader-dock 双窗。

## nodes

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 空：壳由 compose 注入官方阅读面同 DOM |

装配期不经 View nodes 拼壳，避免与合成 HTML 双真相。

Return *[空](table.empty_list())*.

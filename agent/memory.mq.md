---
markup: occlusion
title: 求道唯一持久记忆文稿
description: 模型读取一份实际存在的 memory.mq.md，不重放或重写完整聊天。
import:
  io: io.mq.md
  table: lib/table.mq.md
---

# memory

memory.mq.md 在用户自己的工作区。它是一份可长期积累、受容量约束的 Markdown 文稿，而不是每轮重新拼接的历史、角色提示词或会话快照。真正的权限、版本和执行收据另存。默认模型调用仅读取它；谁能更新记忆须由专门的受控写入能力决定，不能由模型答复擅自改写。

## read

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 真实持久记忆文稿；首次不存在才创建 |

Return *io.native(operation="agent_memory_read",payload=table.empty_map())*.

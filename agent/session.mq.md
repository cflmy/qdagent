---
markup: occlusion
title: Agent 会话真相与确认
description: 一个任务一个带修订号的状态；模型记忆只是投影。
import:
  io: io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

会话由宿主认证，原生插件以跨进程锁和 compare-and-swap 保存。只有用户真实回应可解除外部效果门禁。继续请求可读取同一状态，不需要将历史聊天送给模型。独立证明与实验结果分别存档，不通过修改 memory 获得授权。

## status

| 参数 | 类型 | 说明 |
|---|---|---|



Return *io.native(operation="agent_session_read",payload=table.empty_map())*.

## begin
    + `user_input`
    + `message_id`

| 参数 | 类型 | 说明 |
|---|---|---|
| user_input | text | 新的真实用户文本 |
| message_id | text | 宿主生成的幂等消息 ID |

Use `user_input`, `message_id`。

We **args = table.put(in=None,at="user_input",value=`user_input`)**.
Return *io.native(operation="agent_session_begin",payload=table.put(in=`args`,at="message_id",value=`message_id`))*.

## propose
    + `skill`
    + `question`

| 参数 | 类型 | 说明 |
|---|---|---|
| skill | text | 能力索引已验证 ID |
| question | text | 效果确认说明 |

Use `skill`, `question`。

We **args = table.put(in=None,at="skill",value=`skill`)**.
Return *io.native(operation="agent_session_propose",payload=table.put(in=`args`,at="question",value=`question`))*.

## respond
    + `revision`
    + `action`
    + `answer`=""
    + `choice`=""

| 参数 | 类型 | 说明 |
|---|---|---|
| revision | number | 当前精确修订 |
| action | text | approve / deny / clarify |
| answer | text | 用户补充 |
| choice | text | 已核验选择 |

Use `revision`, `action`, `answer`="", `choice`=""。

We **args = table.put(in=None,at="revision",value=`revision`)**.
We **args = table.put(in=`args`,at="action",value=`action`)**.
We **args = table.put(in=`args`,at="answer",value=`answer`)**.
Return *io.native(operation="agent_session_respond",payload=table.put(in=`args`,at="choice",value=`choice`))*.

## finish
    + `status`
    + `answer`
    + `skill`=""

| 参数 | 类型 | 说明 |
|---|---|---|
| status | text | succeeded / incomplete / failed |
| answer | text | 真实业务响应 |
| skill | text | 实际调用能力 ID |

Use `status`, `answer`, `skill`=""。

We **args = table.put(in=None,at="status",value=`status`)**.
We **args = table.put(in=`args`,at="answer",value=`answer`)**.
Return *io.native(operation="agent_session_finish",payload=table.put(in=`args`,at="skill",value=`skill`))*.

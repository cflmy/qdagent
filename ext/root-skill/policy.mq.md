---
markup: occlusion
title: 根 SKILL · policy
import:
  core: state.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  re: lib/re.mq.md
  hash: lib/hash.mq.md
  plugin: lib/plugin.mq.md
---

本模块是根 SKILL 的实际实现。公开入口见 [根流程](index.mq.md)，当前阶段的工程规范见 guides/。参数、返回和失败条件紧邻每个函数，调用不依赖隐藏的聊天规则。

## policy

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主身份和私有任务上下文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前阶段允许的工具身份与对应工程指南。 |

Use `context`。

这份策略既用于模型看到的工具目录，也用于执行前再次授权。两个位置使用同一函数，
不让旧提示词或缓存工具保留越阶段权限。等待用户回答时只允许读状态，模型不能继续写入。
意图与基本方案阶段保留材料读取和纯计算，但没有通用写文件、业务执行或委托能力。
细化必须经过专用作者、校验与试运行；主智能体只能请求受限调度，不能自行提高并发数。
方案落地阶段才开放必要业务工具，其原有插件开关仍须成立。完成记录不会被模型重置，
新的用户目标由宿主重新开启意图阶段。阶段指南与实际源码一起构成模型的可调用开发手册。

Read access exists to establish the current materials and the approved interface, not to carry out a future phase early. Pure library calls can transform observed data but cannot replace the human confirmation. The optional network reader still needs the network plugin and cannot register a new tool. In refinement the parent requests bounded dispatch while each child receives one unit identity; generic delegation is deliberately unavailable so it cannot evade model selection or concurrency. Integration can create actual artifacts, but the root entry still checks unit evidence and requires final review. While a question or approval is pending, even an otherwise available write tool is removed from the policy. The execution gate asks this function again, so an old provider tool list has no lasting authority. The returned guide names the stage-specific source that explains the correct engineering contract.

We **state = access(core.status(context=`context`),"value")**.
We **phase = json.get(value=`state`,key="phase")**.
We **allowed = json.parse(text="[\"skill_status\",\"list_files\",\"read_file\",\"file_info\",\"search_files\",\"read_library\",\"call_library\",\"http_get\"]")**.
We **guide = "intent"**.
1. `phase` == "intent"
  We **allowed = table.append(list=`allowed`,item="skill_intent")**.
2. `phase` == "outline"
  We **guide = "outline"**.
  We **allowed = table.append(list=`allowed`,item="skill_outline")**.
2. `phase` == "refine"
  We **guide = "refinement"**.
  We **allowed = table.append(list=`allowed`,item="skill_refine")**.
2. `phase` == "implement"
  We **guide = "integration"**.
  We **allowed = table.concat(a=`allowed`,b=json.parse(text="[\"skill_integrate\",\"write_file\",\"patch_file\",\"check_marqdo\",\"run_marqdo\",\"create_office\",\"call_plugin\"]"))**.
2. *
  We **allowed = json.parse(text="[\"skill_status\"]")**.
1. json.get(value=`state`,key="pending")
  We **allowed = json.parse(text="[\"skill_status\"]")**.

`value` =

| phase | allowed_tools | guide |
|---|---|---|
| `phase` | `allowed` | `guide` |

Return *result.ok(value=`value`)*.



## gate

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主身份和私有任务上下文 |
| name | text | required | 执行器准备调用的已登记身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 阶段授权结果；拒绝不能产生业务执行。 |

Use `context`, `name`。

工具注册只是安装事实，不等于当前阶段授权。执行器在开启工具收据和副作用账本之前
调用此门禁；策略变化立即作用于下一次真实调用。拒绝只记录原因，不把模型的请求当作
用户确认，也不将失败转换成另一条不受约束的命令。这个函数不接受模型提交的阶段或
allowed_tools，始终从会话私有根状态读取。用户停用其他插件仍由原注册器再次拒绝，
根 SKILL 停用则不能启动智能体任务，不提供绕过必经步骤的回退模式。

We **current = access(policy(context=`context`),"value")**.
1. not table.contains(list=access(`current`,"allowed_tools"),item=`name`)
  Return *result.error(code="root.stage_denied",message=("当前阶段 " + str(access(`current`,"phase")) + " 不允许 " + `name`),operation="gate")*.
Return *result.ok(value=`current`)*.

---
markup: occlusion
title: 当前调用现场的阶段授权
import:
  core: state.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

当前调用现场的阶段授权。函数语义与用户确认由文稿决定，不维护业务工具名称表。

## authorize

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主提供的身份、任务根与当前调用现场 |
| phase | text | required | 此公开函数所属阶段 |
| role | text | required | 此公开函数允许的角色 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前授权或明确拒绝 |

Use `context`, `phase`, `role`。

公开函数在实际执行前检查当前状态和宿主角色。模型不能传入另一个 context，也没有 respond 接口；等待用户确认时所有可产生业务变化的调用都被拒绝。权限不依赖模型此前看到的工具列表，安装插件与授权运行仍分开。

这份文稿是此操作的唯一行为说明和可执行实现。参数表与返回表放在标题下面，调用者应先确认输入来自哪里，再读取实际返回；一个说明句或模型声称成功都不是执行证据。身份和文件根只从宿主可信上下文取得，用户材料和模型输出只作为数据，不能选择更大的权限。失败保留明确诊断，不另写一个猜测结果替代真实操作。

本函数只承担下文描述的局部责任。它不会替用户确认，不会替另一个角色修改文稿，也不会把源码检查、案例通过和业务验收混为一谈。调试时依据实际调用现场、源版本和运行结果继续处理；刷新页面或切换模型不能沿用已经失效的批准。需要增加能力时优先组合已有 Marqdo 函数，缺少的系统边界才通过 ABI 补齐。

We **state = access(core.status(context=`context`),"value")**.
1. json.get(value=`state`,key="pending") or access(`state`,"phase") != `phase` or json.get(value=`context`,key="role") != `role`
  Return *result.error(code="root.call_site_denied",message="当前阶段与角色不允许此调用",operation="authorize")*.
Return *result.ok(value=True)*.

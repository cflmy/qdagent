---
markup: occlusion
title: 求道原生智能体控制手册
description: 开发者可直接 marqdo call 的五个最小入口，全部复用现有 Marqdo 文稿。
import:
  runtime: ../../ext/root-skill/runtime/index.mq.md
  memory: ../../ext/root-skill/runtime/memory.mq.md
  routing: ../../ext/root-skill/routing.mq.md
  state: ../../ext/root-skill/state.mq.md
---

本文件不是另一个 Agent 框架，也不保存工具注册表；所有函数都转交已有可执行 Marqdo 文稿。只有 run、parallel 等受控函数能执行真实任务，memory_preview 与 route 是纯检查。系统身份与任务现场由可信宿主提供，模型不得伪造 context。

对新任务，宿主先使用已有 state.begin 记录真实用户消息；随后调用 run。出现 waiting_user 时停止，不执行子任务。用户点选或自由输入由已有 state.respond 结合 revision 校验保存，再调用 run。既有根状态负责阶段与独立测试，不能由模型输出一段 JSON 越过确认。多意图由根运行时按依赖就绪进行并行，以下 parallel 只适合已经确认过的任务。

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主认证的真实现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Marqdo 状态机真实执行的下一结果 |

这是生产同一条 Marqdo 状态机路径，不做独立规划、工具循环或自动猜测成功。正确的宿主调用形式是 marqdo call ext/root-skill/index.mq.md run，传入受信任的 context 参数，用户不能直接提供任意权限或路径。

Return *[实际推进当前阶段](runtime.run(context=`context`))*.

## inspect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 宿主认证的真实现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 保留 revision、阶段、待确认内容及已保存的真实事实 |

只读查询，不创建确认、不修改文件、不执行 SKILL。开发和前端均应以此状态恢复进度，不能根据模型声称判断成功。

Return *[读取已保存的真实状态](state.status(context=`context`))*.

## memory_preview

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 供检查的状态数据，不承担权限 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 将被注入下一轮的 Markdown 数据投影 |

纯函数。只需要给一个固定 state，不需要模型、插件或用户真实工作区。生产的 memory.sync 还会核对可信 revision 并把这份文稿写入当前任务工作区。不要直接编辑它来更改用户确认。

Return *[预览关键事实的单份文稿](memory.render(state=`state`))*.

## route

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| mode | text | required | text、select、code、research 或 document |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实且已登记的 Marqdo 函数路径；未知明确拒绝 |

这里只展示一次纯路由决策，不加载整棵 SKILL。实际业务调用的效果和权限仍由调用方与子文稿检查；不把任意模型文本当作物理路径。

Return *[根据现有文稿选择下一级](routing.resolve(mode=`mode`))*.

## parallel

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 包含人工确认、任务权限和工作根的真实现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原生子任务批次与验证结果 |

真实并发不等于几个模型一起输出文字。此函数复用 runtime.parallel 对已经确认的函数段建立受控任务，内部用 subtask.run_many 执行独立工作；依赖没就绪则等待，失败保留收据，不能把未知写入自动重放。

Return *[有界并行已批准的职责](runtime.parallel(context=`context`))*.

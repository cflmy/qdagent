---
markup: occlusion
title: 已退役的模型工具路由
import:
  result: lib/result.mq.md
---

此接口已退役。生产入口直接执行 ext/root-skill/runtime/index.mq.md；当前角色阅读 calls/ 中的普通 Marqdo 文稿，通过官方解析器绑定函数并执行，不再发布业务工具 Schema 或解释 JSON 工具请求。保留这个明确拒绝入口是为了使旧调用失败，而不是静默进入另一条运行链。

## execute

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已退役接口的明确诊断，绝不执行业务 |

旧客户端需要迁移到根文稿。这里没有工具注册、名称映射、阶段路由、用户确认或调用副作用。
源文件中的其他旧模块不能把这个拒绝视作成功；实际失败应保留并让开发者修复入口。新能力
以普通 .mq.md 的函数实现和契约接入，不重新往这个文件增加一行工具记录。底层插件安装
与效果授权仍由独立能力边界检查，不等于向模型提供可任意选择的宿主函数。

Return *result.error(code="qdagent.retired_dispatcher",message="旧业务工具路由已退役，请执行根 Marqdo 文稿",operation="retired")*.

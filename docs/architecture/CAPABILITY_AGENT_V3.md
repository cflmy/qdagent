# 求道 v3 · Marqdo Native Capability Agent（架构导航）

> 2026-11-19 设计修订。**以 [CONTEXT_SOVEREIGNTY.md](CONTEXT_SOVEREIGNTY.md) 为最新目标架构；原“三源严格上限”已废弃。当前代码仍处过渡期，不代表目标已实现。**

## 核心设计

- **通用根尽可能薄**：`agent/index.mq.md` 负责能力分发、授权、收据；不包含软件开发或量子科研的固定业务流程。
- **领域能力是可读可执行 Marqdo 文稿**：`skills/<slug>/index.mq.md`，由源码发现、官方解析器验证，新增能力不重写根。
- **上下文主权归 Marqdo**：最小基底（用户输入、记忆、活跃文稿） + 模型按需选择的精确上下文片段。未来 `agent/context/` 维护来源、作用域、预算、生命周期，不能靠宿主预拼 Prompt。
- **运行权限与认知上下文分离**：宿主保留身份、沙盒、配额、副作用门禁和 OS 能力；不参加领域思考或工具选择。
- **工作流只是可选语言级程序**：`workflows/` 按需编排与持久化，不强制所有会话走固定阶段。
- **知识与证明有真实边界**：编译知识、稳定锚点、模型范围内的 Lean 证书和运行测试分别记录；`model_proved` 不等于任意设备或插件正确。

## 目录一览

```text
agent/                        # 根、会话、模型与通用智能体
  index.mq.md
  context/                    # 拟新增：自主选择/精确读取/工作集管理
  model.mq.md
  memory.mq.md
  session.mq.md
  catalog.mq.md
  executor.mq.md
skills/<slug>/index.mq.md     # 独立领域 SKILL
workflows/<domain>/           # 可选复合工作流
ext/ and lib/                 # Marqdo 领域基础库
ext/qdagent/native/           # 最小可信系统与传输边界
server/ worker/ frontend/     # HTTP/资源/服务传输/UI
```

## 设计与开发索引

- [自主上下文架构](CONTEXT_SOVEREIGNTY.md)
- [设计决策](DECISIONS.md)
- [新增能力规范](SKILL_AUTHORING.md)
- [架构清理历史](CLEANUP.md)

本轮只更新设计文件；既有三源硬限制尚待后续开发替换。无需因架构文档更新而声称测试成功或发布就绪。

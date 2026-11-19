# 新增 SKILL：无 context、无 prompt、纯 Marqdo

## 最小能力

新增文件 `skills/hello/index.mq.md`：

```markdown
---
markup: occlusion
title: 简单回答
description: 使用 Marqdo 文稿直接解释用户的请求
agent_effects: model
import:
  model: ../../agent/model.mq.md
  json: lib/json.mq.md
---

# main

你当前负责简洁、准确地回应用户问题。不要自称使用未调用的工具。

## run

We **answer = model.ask(role="chat")**.
1. not access(`answer`,"ok")
  Return *`answer`*.
Return *json.get(value=access(`answer`,"value"),key="text")*.
```

`run` 不需要 `context`，也不需要 `goal`；模型自动看到用户输入、唯一记忆及**此 SKILL 文稿本身**。

## 怎么接通（没有手工工具注册）

1. 新建 `skills/<slug>/index.mq.md`，slug 只能使用小写字母、数字和连字符；写一行真实 `description`、明确 `agent_effects: read|model|compute|external|write`，暴露无参数 `## run`。
2. 执行 `python3 scripts/sync_capabilities.py`：从源码生成 `agent/index.mq.md` 内的能力目录章节。**这是根文稿的一部分，不是额外的模型 Prompt。**
3. 运行时根的 `catalog.discover()` 从实际源码解析得到可用候选；Marqdo `decision.choose` 读取根文稿内的能力列表，选择 ID，随后核验它确实存在。
4. 如需外部访问或写入，Marqdo `session.propose` 请求用户确认，并由宿主保存单次源码绑定的授权。
5. `executor.call(skill=...)` 只执行已安装文稿的 `run()`；领域内部继续组合 `ext/`、`lib/` 或自己的 `workflows/`。

无需修改根路由业务代码、Go 工具表、前端导航、JSON Schema 或模型工具描述。

## 纯数据能力怎么获取用户输入？

直接在 SKILL 文稿里调用：

```marqdo
We **incoming = io.input()**.
1. not access(`incoming`,"ok")
  Return *`incoming`*.
We **goal = access(`incoming`,"value")**.
```

其中 `io` import `../../agent/io.mq.md`。这是 Marqdo 读取受信本轮输入的函数，**不是接收外部 context**。

## 多阶段任务/专业算法放在哪里？

- 领域入口：`skills/<slug>/index.mq.md`；
- 当前 SKILL 的辅助可寻址函数：`skills/<slug>/*.mq.md`；
- 独立可恢复工作流：`workflows/<domain>/*.mq.md`，由该 SKILL 导入；
- 可跨技能复用的领域扩展：`ext/<domain>/*.mq.md`；
- 纯函数：`lib/*.mq.md`；
- 确实需要原生访问文件锁、隔离浏览器等：`ext/qdagent/native/`。这不是增加一个新 Agent Loop。

要写代码、研究资料、分析实验，可以让这些可读文稿自己决定调用函数和保存证据。不得再为每个函数拼接系统提示、全局工具列表或者历史对话。

## 代码约束与验证

```sh
python3 scripts/sync_capabilities.py
python3 scripts/check_architecture.py
bash deploy/check-document-runtime.sh
```

最后的命令需要 Marqdo CLI。上述检查不替代真实模型实验、效果权限和生产安全验收。当前分支尚未执行这些测试。

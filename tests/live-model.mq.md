---
markup: occlusion
title: 隔离的本机模型验收
import:
  begin_api: ../pages/api/chat.mq.md
  pull_api: ../pages/api/chat_pull.mq.md
  stop_api: ../pages/api/chat_stop.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

这是显式的本机模型验收，和离线协议测试分开。只有调用 begin 才会请求 Ollama，
模型必须已安装。所有会话文件放在 .marqdo/acceptance，不复用真实用户的对话或作业。
开始不等于成功；继续用 pull 看真实结果，用 stop 验证取消。这里不返回虚构回答。

## begin

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | text | "请用两句普通中文叙述说明源码与文档一致的价值。" | 验收问题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | begin 端点的真实响应 |

先检查运行根，误在工程根调用时必须失败，不能覆盖现有聊天记录。此样例固定第 74 代，
只询问两句普通叙述，便于观察分块到达、官方 View 渲染与最终状态。Effects: plugin, fs, process.exec, network.

Use `q`="请用两句普通中文叙述说明源码与文档一致的价值。".

We **cwd = [取得隔离目录](sys.cwd())**.
1. not [仅在验收目录工作](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝污染用户数据](result.error(code="test.root", message="use acceptance root", operation="begin"))*.
Return *[使用真实 begin 端点](begin_api.main(q=`q`, model="qwen3.5:4b-q4_K_M", kb="none", client_gen=74))*.

## pull

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 第 74 代的真实累计回答 |

本任务不装配假结果，完成与否由传输层的真实状态决定。请求代数由 begin 约定，
任何较新的任务都会拒绝此旧代数；因此本验收不能停止或污染之后的正常请求。

即使此前 begin 已经成功，也必须查看本次返回的 done、reply 与 error；启动占位不是最终答案，不能据此标记模型验收完成。

We **cwd = [确定测试根](sys.cwd())**.
1. not [仅在隔离根工作](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝修改真实会话](result.error(code="test.root", message="use acceptance root", operation="pull"))*.
Return *[推进原生流](pull_api.main(gen=74))*.

## stop

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 第 74 代的真实停止响应 |

取消同样携带代数，不杀死其他回合。已到达的正文保留在隔离档案里，之后可继续由
只读 View 阅读；停止只说明已请求取消，不代表模型已经给出了完整答案。

需要确认实际进程退出时，使用当前验收记录的传输 PID 检查，不能杀死整个 Ollama 服务或其他用户的推理任务。

We **cwd = [确定测试根](sys.cwd())**.
1. not [仅在隔离根工作](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝修改真实会话](result.error(code="test.root", message="use acceptance root", operation="stop"))*.
Return *[按代数取消](stop_api.main(gen=74))*.

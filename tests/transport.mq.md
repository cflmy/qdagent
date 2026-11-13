---
markup: occlusion
title: 传输失败的协议回归
import:
  pull_api: ../pages/api/chat_pull.mq.md
  transport: ext/qdagent/transport.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

本任务只在 .marqdo/acceptance 写测试作业。注入退出结果属于确定性协议夹具，
用于验证失败不能变成“成功回答”，不能替代真实 curl 与模型验收。插件的非法协议拒绝
则走真实 ABI 请求，证明边界不会把任意外部地址解释成命令。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 非 HTTP 地址、传输失败与成功空正文都按约定报告 |

先验证隔离目录，再写入两种结束状态。它们都不该触发第二次模型请求；输出为空也不能
悄悄退回整包推理。错误 code 应可供调用者处理，保留原 job 便于诊断和明确重试。

错误测试需要区分“调用成功返回一个失败 Result”和“Marqdo 自身执行失败”。两者都不是业务成功：前者应保留可处理的错误 code，后者应保留宿主诊断。本测试检查的是前者，函数可以正常返回，但退出状态不得被包装成一份成功回答。

| 验收步骤 | 输入或状态 | 预期错误与保护 |
|---|---|---|
| 固定隔离根 | cwd 必须位于 .marqdo/acceptance | 不接触生产 job、raw 或完成标记 |
| 非法地址 | begin 使用 file 协议 | 真实 ABI 拒绝，不能解释为任意系统读取 |
| 真实作业形状 | stream 模式、started=True、gen=75 | 绕过启动阶段，只聚焦结束协议 |
| 原生流为空 | _stream_raw.ndjson 写为空文本 | 不提供可伪装成回答的正文 |
| 失败退出夹具 | transport.result.json 中 ok=False、code=7 | pull 返回 qdagent.transport_failed |
| 完成标记 | done.flag 明确存在 | 不能把失败解释成“仍在等待”而无限轮询 |
| 成功空输出夹具 | ok=True、code=0，但 raw 仍为空 | pull 返回 qdagent.empty_response |
| 无自动模型回退 | 两次错误都原样返回 | 不悄悄发起第二次整包模型请求 |
| 原始错误保留 | 输出中包含阶段 code 与信息 | 开发者能够定位边界，而非只看到空白页面 |

为什么还要测试成功空输出：HTTP 服务可以正常返回，curl 也可以成功退出，但模型可能没有给出任何 message.content。把进程成功等同于答案成功，会让客户端错误地显示“已写入对话”；自动补发请求又会隐藏第一次空结果，并增加无法解释的等待。当前策略是明确报错，由用户或调用方决定是否重试。

非法协议检查来自真实插件，并非测试里预先判断后返回错误。插件首先管理本工程的生命周期，再验证地址与安装产物，调用的系统进程只接收独立参数，不拼接命令文本。因此这里覆盖的是边界的一个具体能力约束，不能代替所有网络环境与恶意输入的完整审计。

失败退出与成功空输出是协议夹具，它们不声称某次真实模型刚好发生了对应故障。真实 worker 的连接、生成、完成与取消仍由 live-model 任务观察；这两类测试合在一起，才分别说明错误解释和正常传输都经过验证。

每一种错误都在当前同一作业代数下读取，避免把 stale_generation 误当成传输错误通过。完成文件明确存在，也避免因为作业仍未启动而返回输出中占位。两个状态只改变退出结果，其他条件保持一致，这让断言真正区分失败退出与成功空输出。

测试结束会保留这些专用诊断文件。下一次正常模型验收应先 begin，由正式重置流程停止旧传输并清理完成标记；不要直接把 started 或 done 手工改成期望值，然后宣称真实生命周期已经验证。

We **cwd = [取得隔离目录](sys.cwd())**.
1. not [只操作验收目录](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝覆盖正式数据](result.error(code="test.root", message="use acceptance root", operation="run"))*.
We **_ = [建立目录](fs.make_dirs(path="data/dialogue/proj"))**.
We **denied = [通过真实插件拒绝非法协议](transport.request(operation="begin", url="file:///tmp/not-http"))**.
1. access(`denied`, "ok") != False
  Return *[非法协议未被拒绝](result.error(code="test.scheme", message=str(`denied`), operation="run"))*.

`job` =

| q | model | kb | mode | done | started | gen |
|---|---|---|---|---|---|---|
| "失败协议验收" | "qwen3.5:4b-q4_K_M" | "none" | "stream" | False | True | 75 |

`failed_exit` =

| ok | code |
|---|---|
| False | 7 |

We **_ = [写测试作业](fs.write_json(path="data/dialogue/proj/job.json", value=`job`))**.
We **_ = [准备空原生流](fs.write_text(path="data/dialogue/proj/_stream_raw.ndjson", text=""))**.
We **_ = [记录完成](fs.write_text(path="data/dialogue/proj/done.flag", text="7"))**.
We **_ = [记录真实协议中的失败形状](fs.write_json(path="data/dialogue/proj/transport.result.json", value=`failed_exit`))**.
We **failed = [推进失败作业](pull_api.main(gen=75))**.
1. access(`failed`, "ok") != False or access(access(`failed`, "error"), "code") != "qdagent.transport_failed"
  Return *[错误被吞掉](result.error(code="test.transport_failure", message=str(`failed`), operation="run"))*.

`empty_exit` =

| ok | code |
|---|---|
| True | 0 |

We **_ = [注入成功但没有正文的退出](fs.write_json(path="data/dialogue/proj/transport.result.json", value=`empty_exit`))**.
We **empty = [推进空输出作业](pull_api.main(gen=75))**.
1. access(`empty`, "ok") != False or access(access(`empty`, "error"), "code") != "qdagent.empty_response"
  Return *[空输出被冒充成功](result.error(code="test.empty_response", message=str(`empty`), operation="run"))*.
Return *[错误协议回归通过](result.ok(value="scheme / failed transfer / empty output"))*.

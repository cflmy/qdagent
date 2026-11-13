---
markup: occlusion
title: 跨请求 NDJSON 传输的 ABI 边界
import:
  plugin: lib/plugin.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
---

这里只补齐现有子任务句柄不能跨独立 HTTP 请求复用的缺口。具体限制和移除条件见
doc/gaps/ndjson-transport.mq.md。提示词、模型输出解析、错误展示与对话渲染不在插件里实现，
业务调用从 ollama_chat 进入，不能把外部进程作为另一套智能体运行时。

## request

| 参数 | 类型 | 说明 |
|---|---|---|
| operation | text | begin 或 stop |
| url | text | 仅 begin 使用的 HTTP 地址；stop 传空文本 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result；开始成功只表示传输已拉起，完成结果另存 transport.result.json |

Use `operation` and `url`。当前插件面向 Linux；安装任务将动态库及 worker 放在 ext/native，
站点根的安装副本位于 pages/ext/native。它不接收 Shell 源码，也不解释模型正文。
显式授予 plugin 即意味着允许本地进程和网络能力，文件根不是插件的操作系统沙箱。

We **root = [取得当前授权工程根](sys.cwd())**.
We **loaded = [按 ABI v2 注册传输边界](plugin.load(path="ext/native/libqdagent_transport.so"))**.

`payload` =

| operation | root | url |
|---|---|---|
| `operation` | `root` | `url` |

Return *[仅通过已注册的能力执行传输](qdagent_transport(request=`payload`))*.

## task

| 参数 | 类型 | 说明 |
|---|---|---|
| entry | text | 可信的 Marqdo 任务入口绝对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，后台进程只运行 marqdo call |

Use `entry`。这里只补跨 HTTP 请求的生命周期：独立 worker 负责等待和取消整个调用组，
不组织模型提示词，也不解释工具参数。任务数据在会话根，业务实现仍在 .mq.md。
启动成功仅表示真实进程已经建立，最终状态还要读取任务日志，不能等同于任务完成。

We **root = [明确独立会话根](sys.cwd())**.
We **_ = [注册已有 ABI 边界](plugin.load(path="ext/native/libqdagent_transport.so"))**.

`payload` =

| operation | root | entry |
|---|---|---|
| "task" | `root` | `entry` |

Return *[以唯一执行形式启动任务](qdagent_transport(request=`payload`))*.

## control

| 参数 | 类型 | 说明 |
|---|---|---|
| root | text | 可信会话文件根 |
| entry | text | 已安装 runner.mq.md |
| member | text | begin、poll、stop、view 或 manual |
| arguments | map | 已校验控制参数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实控制函数的返回值 |

Use `root`, `entry`, `member` and `arguments`。每个会话使用独立的跨进程控制锁，
避免两个浏览器同时开始一轮时覆盖作业。锁和进程生命周期属于真实 OS 缺口，业务判断仍在
Marqdo runner。唯一命令形式是 marqdo call，输入从 JSON 标准输入传输；不会执行 Shell。
控制进程限制六十秒，后台任务的生命周期则独立管理，等待回答不会一直占住控制锁。

We **_ = [加载已注册任务 ABI](plugin.load(path="ext/native/libqdagent_transport.so"))**.

`payload` =

| operation | root | entry | member | arguments |
|---|---|---|---|---|
| "control" | `root` | `entry` | `member` | `arguments` |

We **out = [只通过注册 ABI 进入会话](qdagent_transport(request=`payload`))**.
1. not access(`out`, "ok")
  Return *out*.
Return *[保留实际业务返回](access(`out`, "value"))*.

---
markup: occlusion
title: 唯一的 Marqdo 调用边界
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  time: lib/time.mq.md
  plugin: lib/plugin.mq.md
---

所有任务能力最终形成一个真实 marqdo call。参数通过 JSON 标准输入传输，不能让模型正文变成
Shell、Python 或命令替换。此文件不选择工具；目标文件、函数和权限由可信注册表决定，
模型只提供经过校验的业务参数。后台运行时，子进程继承工作进程组，以便统一取消。

## invoke

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| file | text | required | 可信的 .mq.md 入口绝对路径 |
| function | text | required | 已登记函数 |
| arguments | any | None | 命名参数记录 |
| root | text | required | 本次调用的授权文件根 |
| effects | text | "fs.read" | 登记的效果权限 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实函数返回值，失败保留 Result 与进程诊断 |

Use `file`, `function`, `arguments`=None, `root` and `effects`="fs.read"。
标准输入由已登记 ABI 直接传给唯一的 Marqdo 子调用，不在只读源码根建立参数文件。CLI 读取实际 JSON，
所以问题中的换行、引号、反引号与美元符号都只是数据。文件操作仍由 Marqdo 自己完成。

A zero exit code proves only that the CLI ran. The outer execution envelope is parsed before returning
the actual function result; a returned failure remains a failure. Invalid or truncated output is not
accepted as success. The caller owns tool authorization and must never pass model-selected executables
or broaden the effect set from generated text.

We **evidence = [保存真实调用证据](observed(file=`file`, function=`function`, arguments=`arguments`, root=`root`, effects=`effects`))**.
Return *[解释真实 CLI 包装](decode(evidence=`evidence`))*.

## observed

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| file | text | required | 可信入口 |
| function | text | required | 登记函数 |
| arguments | any | None | 字面参数 |
| root | text | required | 授权文件根 |
| effects | text | "fs.read" | 登记效果权限 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实 argv、退出、stdout 与 stderr |

Use `file`, `function`, `arguments`=None, `root` and `effects`="fs.read"。
只运行 marqdo call，保留真实参数向量，供时间线展示可核验的经过。不向只读源码根创建临时参数文件，内容同时作为工具参数记录，不能把屏幕上的简写命令当成没有发生的调用。
子调用继承任务进程组，取消不会只停止外层页面轮询。

The argv record includes --args-json - and the actual granted root. Named values enter the child through literal JSON standard input and remain in the event input for inspection. A displayed shorthand command is never used as execution evidence.

1. not `arguments`
  We **arguments = [无参数也使用记录](table.empty_map())**.
We **cwd = [当前宿主文件根](sys.cwd())**.
We **ext_root = [读取可信插件安装根](sys.env_get(name="MARQDO_EXT"))**.
1. not `ext_root`
  We **ext_root = sys.cwd() + "/ext"**.
We **_ = [通过 ABI v2 补标准输入缺口](plugin.load(path=(`ext_root` + "/native/libqdagent_transport.so")))**.

`payload` =

| operation | entry | member | root | cwd | effects | arguments |
|---|---|---|---|---|---|---|
| "call" | `file` | `function` | `root` | `cwd` | `effects` | `arguments` |

We **out = [真正的 marqdo call 从标准输入读取 JSON](qdagent_transport(request=`payload`))**.
1. not access(`out`,"ok")
  Return *[保留真实启动错误](table.put(in=table.put(in=table.put(in=table.put(in=None, at="code", value=-1),at="argv",value=table.empty_list()),at="stdout",value=""),at="stderr",value=json.stringify(value=`out`)))*.
Return *[保留实际进程证据](access(`out`,"value"))*.

## decode

| 参数 | 类型 | 说明 |
|---|---|---|
| evidence | map | observed 返回的实际执行证据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 函数实际结果，失败不改成成功 |

Use `evidence`。零退出只说明 CLI 执行完成，还要解释其 JSON 包装和函数结果。
截断或非法输出明确失败，stderr 仍作为证据保留。这个函数不重复执行，不改变工具权限，
也不把模型自己写出的成功文字当作一个 Result。

There are two independent failure boundaries: the CLI can fail to execute, and a successfully executed function can return a failure Result. Decode preserves both distinctions. In particular, a zero process exit does not turn a denied plugin or invalid parameter into success. This helper never retries the call.

We **ran = `evidence`**.
1. access(`ran`, "code") != 0
  Return *[保留实际调用错误](result.error(code="qdagent.call_failed", message=str(`ran`), operation="call"))*.
We **parsed = [读取真实 CLI 结果](json.try_parse(text=access(`ran`, "stdout")))**.
1. not access(`parsed`, "ok")
  Return *[不可解析输出不是成功](result.error(code="qdagent.call_output", message=str(`ran`), operation="call"))*.
We **outer = [取得执行包装](access(`parsed`, "value"))**.
1. not json.get(value=`outer`, key="ok")
  Return *outer*.
Return *[仅返回实际函数结果](json.get(value=`outer`, key="result"))*.


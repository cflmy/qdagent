---
markup: occlusion
title: 隔离浏览器前后端验收
import:
  net: lib/net.mq.md
  engineering: ext/engineering/index.mq.md
  table: lib/table.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
---

此任务使用 Chromium 自带的无头模式。业务动作仍由隔离副本中的 Marqdo 客户端自动调用
on_key，测试不生成 JavaScript，也不替换服务端响应。先调用开发入口 prepare_http，再以 root=".marqdo/site" 在 17430 端口启动 serve，随后调用本任务。
浏览器配置目录、截图和 DOM 都在本工程的 .marqdo 下，不读取个人浏览器配置。

## run

| 参数 | 类型 | 说明 |
|---|---|---|
| chrome | text | 实际 Chromium 可执行文件 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 页面真实更新、状态完成、发送可再次使用时才成功 |

完整站点验收与文件模式的状态夹具有不同的证明范围。此处访问正在监听的 HTTP 服务，输入经真实 API 写入隔离会话，再由后端官方 View 返回到页面。任何一段没有完成，都不能只凭浏览器退出为零或服务端首页可下载就宣称前端闭环通过。

| 检查对象 | 实际证据 | 不足以替代的信号 |
|---|---|---|
| 站点导航 | HTTP 页面真实进入浏览器 DOM | curl 能下载首页不等于浏览器已经完成导航 |
| 客户端挂载 | 官方桥接加载当前 Marqdo 源码 | 看到静态输入框不等于事件已绑定 |
| 一次 Enter | 隔离副本的单次启动钩子调用真实 on_key | 辅助函数中直接调用不能替代持久事件入口 |
| begin 与 pull | 页面最终含 qd-answer-document | 服务端某次 CLI 测试成功不等于浏览器 fetch 成功 |
| 官方阅读面 | 答案是服务端 View 片段 | 普通文本出现在页面不能证明语法展示 |
| 回合收束 | chat-status 显示已写入对话 | 存在占位“输出中”仍表示没有结束 |
| 继续使用 | 发送按钮没有 disabled 属性 | 只更新状态文案可能仍把输入永久锁住 |

浏览器路径由调用者显式提供，测试不下载浏览器，也不读取个人配置。网络只访问专用本地端口，模型选择为 none，所以不需要等待推理或消耗远端模型配额。若本机端口已被其他程序占用，应另行指定隔离服务端口并同步测试地址，不能停止不属于测试的服务。

DOM 和 stderr 是有界的诊断产物。页面可能内嵌字体而很大，因此读取完整 DOM 时由工程插件给出明确输出上限，再保存到文件；不能把被工具截断的输出当成一个有效页面。当前环境若发生导航超时，就保留失败结果，文件模式的状态测试不能被拿来替这项 HTTP 验收标记成功。

服务与浏览器由不同的受控进程运行。验收结束后，只应停止自己启动的隔离监听，不能使用按程序名批量终止的方式清理所有 Marqdo 或浏览器进程。专用端口和工作目录使诊断可以追溯到本次任务，而不是误把其他服务的页面当成测试结果。

本任务故意没有“导航失败就改用 data 响应”的自动降级。若 HTTP 环境不通，应该明确留下失败；开发者可以另外运行 client-state 证明纯客户端状态，再运行协议测试证明后端函数，但这些证据的组合仍不等于本项完整端到端已经通过。

这项验收的成功条件故意比“能打开首页”更严格。它要求页面完成一次真实回合，并能继续使用输入，只有同时看见内容和可继续操作的状态，才说明前后端配合形成了最小闭环。

Use `chrome`。启动无头浏览器不是第二套业务实现；浏览器只负责执行产品已经使用的
官方 WASM 桥接与 .mq.md 事件函数。网络回答被固定为无模型检索式，因此验收不需要付费模型，
也不会与当前 Ollama 会话争用推理资源。DOM 原文留作诊断，不能只看进程退出码。

`args` =

| argument |
|---|
| "--headless" |
| "--no-sandbox" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--no-proxy-server" |
| "--disable-background-networking" |
| "--virtual-time-budget=10000" |
| "--timeout=20000" |
| "--dump-dom" |
| "http://127.0.0.1:17430" |

We **argv = [保留可执行文件与独立参数](table.concat(a=table.append(list=table.empty_list(), item=`chrome`), b=`args`))**.
We **_ = [保留真实参数](fs.write_json(path=".marqdo/browser-argv.json", value=`argv`))**.
We **checked = [有界运行真实浏览器](engineering.checked(argv=`argv`, timeout_ms=30000, max_output=2097152))**.
1. not access(`checked`, "ok")
  Return *checked*.
We **ran = [查看真实进程结果](access(`checked`, "value"))**.
We **_ = [保留浏览器诊断](fs.write_text(path=".marqdo/browser-stderr.txt", text=access(`ran`, "stderr")))**.
We **html = [读取真实 DOM](access(`ran`, "stdout"))**.
We **_ = [保留诊断 DOM](fs.write_text(path=".marqdo/browser-dom.html", text=`html`))**.
1. access(`ran`, "code") != 0
  Return *[浏览器运行失败](result.error(code="test.browser", message=str(`ran`), operation="run"))*.
1. not [回答确实进入页面](text.contains(text=`html`, sub="id=\"qd-answer-document\""))
  Return *[前后端没有形成闭环](result.error(code="test.browser_render", message="answer document missing; inspect .marqdo/browser-dom.html", operation="run"))*.
1. not [发送与拉取都已完成](re.is_match(text=`html`, pattern="id=\"chat-status\"[^>]*>已写入对话"))
  Return *[页面仍处于忙状态](result.error(code="test.browser_status", message="not completed", operation="run"))*.
We **button = [查看真实发送按钮](re.find(text=`html`, pattern="<button[^>]*id=\"chat-send\"[^>]*>"))**.
1. not `button` or [按钮仍禁用](text.contains(text=`button`, sub="disabled"))
  Return *[发送按钮没有恢复](result.error(code="test.browser_button", message=str(`button`), operation="run"))*.
Return *[真实浏览器闭环通过](result.ok(value="Enter / fetch begin / pull / View DOM / idle"))*.


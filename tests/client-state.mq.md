---
markup: occlusion
title: 官方 WASM 客户端状态验收
import:
  host: fixtures/client-host.mq.md
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---

这里读取产品客户端源码，只替换请求传输与测试触发器，不重新实现发送、回调或状态机。
Chromium 从本地文件加载原有官方桥接与 WASM，真正执行 Enter、网络回调、重复发送及取消。
文件访问选项仅用于专用测试页面，不影响正式站点配置，也不会读取个人浏览器资料。

data 协议响应是确定性的测试夹具，用于证明浏览器会话的持久状态。它不验证 HTTP 路由、
服务端能力或模型质量。那些结论分别来自 frontend.mq.md 与 live-model.mq.md，
完整站点另由 browser.mq.md 验收，不能把不同层的证明互相替代。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 从当前客户端生成隔离测试页面 |

生成器只改传输、默认测试输入与触发器。夹具以独立 mq.md 文本保存，避免模板中的
变量被外层生成器提前解释；它们不导入正式站点。业务回调来自每次读取的当前客户端。

生成器的改写点都是产品源码中的明确边界。它不修改 send、on_key、on_response 的状态赋值，也不修改协议解码函数，因此真实会话持久化错误仍会在测试中出现。替换的是请求如何取得确定性响应，以及测试如何主动触发已存在的入口。

| 改写点 | 隔离副本中的动作 | 保留的产品行为 |
|---|---|---|
| 读取产品客户端 | 从 pages/public/client.mq.md 取得当前全文 | 每次修改都会进入验收，避免测试旧文件 |
| 加入 net 导入 | 仅为 data 响应做 URL 编码 | 不替换浏览器或 JSON 的标准能力 |
| _request 函数 | 使用 client-request.mq.md 中的确定性传输 | fetch_all、原地址回传与统一 on_response 仍真实执行 |
| main 的启动效果 | 挂载后用一次 interval 进入测试起点 | 产品初始化变量与事件绑定表不改写 |
| on_key 的默认输入 | 确定为 Enter 和一段测试问题 | 真实键盘处理仍完成忙闲检查、递增代数与发送 |
| 第一轮与第二轮结束 | 只在 done 分支后安排 fixture_next | 原入口先保存 idle 和空 question |
| 第三轮的下一拍 | 调用正式 stop 入口 | 正式取消状态、请求和确认分支不重新实现 |
| 测试检查器 | 从 client-hooks.mq.md 读取 | 检查跨回调后的状态，而非辅助函数局部值 |
| 最小宿主 | client-host.mq.md 的 html 函数 | 沿用正式结构、按钮、输入和状态选择器 |
| 产物写入 | .marqdo/client-state.mq.md 与 client-state.html | 正式客户端与官方桥接不被覆盖 |

官方 mount 会等待初始 after 效果再写就绪提示。如果把整项测试放在初始 after 链里，后续就绪文案可能覆盖早先的错误，导致诊断被隐藏。测试因此用单次 interval 让挂载先结束，再从一个独立定时器触发真实事件；interval 在触发时立即清除，不会不停增加回合。

Marqdo 会话只把直接入口的赋值保留下来。若测试检查器在自己内部调用 on_key，再把那个嵌套调用的返回值当成真实事件结果，就会改变状态保存语义。这项生成器刻意避免这种方式：所有 send、on_key、stop 与响应都由官方桥接直接调用，检查器只观察最后结果或安排下一个入口。

夹具里的完整 JSON 响应并不是模型输出。它们固定前两轮完成、第三轮等待取消，用来验证前端的顺序与恢复行为。真实模型文本、HTTP 服务和传输进程分别有自己的验收任务，不能混为同一项通过。后续重构若移除了约定替换点，测试应因缺少结束标记而失败；维护者需要更新明确边界，而不是返回预设的通过状态。

生成内容保留了完整的参数与返回表，这使测试副本也可以用 marqdo check 检查。改写前后若出现契约漂移，应优先修复夹具生成器；不能为了通过浏览器验收而去修改官方 WASM 或把错误处理改成忽略。

测试触发器只依赖稳定函数标题和明确的意图标签。它没有复制整段业务状态机，也不依赖生成文件的固定行号。维护者改变这些边界时，应同时审视测试究竟在证明什么，再更新对应替换点。若终态不出现，run 会保留实际 DOM 并失败，不会因为生成器完成写入就算成功。

测试副本中的协议响应仍经过真实 JSON 编码和 URL 编码。中文与换行不能用未经转义的字符串拼成 data 地址，否则测试可能因为传输格式损坏而失败，却被误判成状态机问题。夹具因此复用原生标准库，把每个响应保留为一个完整结构值，再由官方桥接发出请求并回传结果。

对正式客户端而言，唯一不同的是这些响应来自确定性的 data 地址。代数比较、忙闲拒绝、读取第一项结果、保存当前答区、最终恢复按钮等步骤都仍在原函数里执行，不能在检查器里代替它们补写正确状态。

We **client = [读取真实客户端](fs.read_text(path="pages/public/client.mq.md"))**.
We **client = [加入测试编码能力](text.replace(text=`client`, old="  browser: lib/browser.mq.md", new="  net: lib/net.mq.md\n  browser: lib/browser.mq.md"))**.
We **request = [读取测试传输夹具](fs.read_text(path="tests/fixtures/client-request.mq.md"))**.
We **client = [仅替换传输边界](re.replace(text=`client`, pattern="(?s)## _request\\n.*?## _send_effect", with=`request` + "\n## _send_effect"))**.
We **client = [挂载结束后触发测试](re.replace(text=`client`, pattern="Return [*]\\[绑定与初始状态一起返回\\][^\\n]*", with="Return *[启动测试](browser.merge(a=browser.merge(a=bindings, b=ready), b=browser.interval(ms=100, then=\"fixture_start\", id=\"fixture\")))*."))**.
We **client = [确定 Enter 参数](text.replace(text=`client`, old="| key | text | \"\" | 按键 |", new="| key | text | \"Enter\" | 按键 |"))**.
We **client = [确定测试问题](text.replace(text=`client`, old="| value | text | \"\" | 输入框内容 |", new="| value | text | \"隔离状态验收\" | 输入框内容 |"))**.
We **defaults = [读取测试入口参数](fs.read_text(path="tests/fixtures/client-defaults.mq.md"))**.
We **client = [明确设置实际默认参数](re.replace(text=`client`, pattern="Use .key.=\"\" and .value.=\"\"。", with=`defaults`))**.
We **client = [完成后检查状态](re.replace(text=`client`, pattern="Return [*]\\[回答完成\\][^\\n]*", with="Return *[完成并检查](browser.merge(a=browser.merge(a=paint, b=_idle(status=\"已写入对话\")), b=browser.after(ms=50, then=\"fixture_next\")))*."))**.
We **client = [取消后检查状态](re.replace(text=`client`, pattern="Return [*]\\[保留半成品并恢复输入\\][^\\n]*", with="Return *[取消并检查](browser.merge(a=browser.merge(a=paint, b=_idle(status=\"已停止\")), b=browser.after(ms=50, then=\"fixture_next\")))*."))**.
We **tick = [读取第三轮触发器](fs.read_text(path="tests/fixtures/client-tick.mq.md"))**.
We **client = [第三轮走真实取消入口](re.replace(text=`client`, pattern="We [*][*]tick = \\[安排下一拍\\][^\\n]*", with=`tick`))**.
We **hooks = [读取测试检查器](fs.read_text(path="tests/fixtures/client-hooks.mq.md"))**.
We **_ = [写出隔离源码](fs.atomic_write(path=".marqdo/client-state.mq.md", text=`client` + `hooks`))**.
We **html = [读取测试宿主](host.html())**.
We **_ = [写出隔离宿主](fs.atomic_write(path=".marqdo/client-state.html", text=`html`))**.
Return *[隔离夹具已准备](result.ok(value=".marqdo/client-state.html"))*.

## run

| 参数 | 类型 | 说明 |
|---|---|---|
| chrome | text | 已安装的 Chromium 绝对路径 |
| root | text | qdagent 工程绝对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 两轮回答与一轮取消的真实 DOM 断言 |

| 验证对象 | 实际观察 | 失败时保留什么 |
|---|---|---|
| 官方 WASM 挂载 | 当前桥接成功加载既有 wasm 与测试源码 | DOM 中的挂载错误和 stderr |
| 第一轮 Enter | 真实入口从 idle 进入 sending | 不能只看 fetch 效果表是否构造出来 |
| 第一轮回答结束 | 统一回调持久化 idle 与空问题 | 嵌套收尾赋值丢失会在下一轮暴露 |
| 第二轮 Enter | 代数递增，前一问题不阻止发送 | DOM 中仍处于忙状态就明确失败 |
| 第三轮停止 | stop 保存 stopping，确认后恢复 idle | 取消占位不能算完整模型答案 |
| 最终状态 | state-pass:3-cancel 与恢复的发送按钮 | 进程零退出也不能跳过 DOM 断言 |

浏览器的 stderr 可能包含宿主图形驱动警告，这既不是业务失败的充分证据，也不能自动忽略真正的加载错误。断言以实际 DOM 为准；没有明确结束状态就失败，并保存 DOM 与完整有界诊断。查看失败现场时，先看状态节点里有没有 Marqdo 错误，再区分页面加载和状态机本身的问题。

此入口只使用给定浏览器路径，不推断用户安装了哪个浏览器，也不访问个人配置目录。默认的无头临时配置由浏览器自行建立。文件访问选项仅为这份隔离宿主提供同目录资源加载，不属于正式站点的运行参数。

最终 DOM 的通过标记由检查器在看到持久化状态后才写入，宿主模板没有预置它。发送按钮也必须真正恢复；只出现文本标记而按钮仍禁用，验收仍然失败。测试没有对页面美观做像素断言，因为那属于完整站点与人工阅读检查的范围，不能由这一项状态结论替代。

失败 DOM 可能包含模型接口或源码诊断，因此它只保存在本地忽略目录，不作为用户站点的公开资源。开发者检查完毕后可以明确清理这些专用产物；测试本身不自动删除失败现场，也不把错误打印成一份伪成功截图。

模型选择是同一份真实客户端的另一条事件链。三轮对话结束后，通过官方定时器调用正式 pick_qwen，观察它在直接入口保存完整模型标识；随后才写最终结束标记。检查器不能替正式入口修改 model，也不能直接把选中样式加到节点上。

| 模型外观断言 | 最终 DOM 必须呈现 | 对应的真实故障 |
|---|---|---|
| 原 none 选项 | 不再含 is-active | 多个模型同时高亮，读者不知道下一轮使用哪个 |
| 当前 qwen 选项 | 含 is-active | 新高亮被同轮 remove_class 再次移除 |
| 模型面板 | 不再含 is-open | 选择后浮层未关闭，遮挡阅读 |
| 全局模型值 | 完整 qwen 标识已由入口保存 | 只有显示文案变化，实际请求仍使用旧模型 |
| 对话阶段 | 仍是 idle | 切换模型不能重新开启已经取消的作业 |

官方桥接以自己的固定顺序应用效果，不按照辅助函数构造映射的先后次序执行。若新增和移除的选择器包含同一节点，客户端可能先把它激活，再立刻取消。产品代码因此让移除目标排除当前选项；测试通过最终 DOM 检查这一实际结果，而不是仅检查效果表里“曾经写过 add_class”。

面板关闭与模型清理又属于同一个 remove_class 键，需要先合并内部选择器映射。如果直接浅合并两份效果，后一份会覆盖前一份，造成浮层或旧高亮残留。这项测试同时检查原选项、当前选项与面板，避免只修好一个表象就认为整个操作链可用。

这些节点是最小测试布局，不复制正式产品样式；最终类值仍由官方桥接在真实 DOM 中应用。它证明交互语义，不宣称像素排版已经通过完整站点检查。

Use `chrome` and `root`。运行前先 prepare，随后只交给已有工程执行插件启动浏览器。
进程退出为零并不代表通过，必须在实际 DOM 中看到三轮状态结论、回答节点及已恢复的发送按钮。

We **prepared = [从当前源码准备夹具](prepare())**.

`args` =

| argument |
|---|
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--virtual-time-budget=20000" |
| "--timeout=20000" |
| "--dump-dom" |

We **argv = [保留可执行文件和独立参数](table.concat(a=table.append(list=table.empty_list(), item=`chrome`), b=`args`))**.
We **argv = [只打开隔离页面](table.append(list=`argv`, item="file://" + `root` + "/.marqdo/client-state.html"))**.
We **checked = [真实运行 Chromium](engineering.checked(argv=`argv`, timeout_ms=30000, max_output=65536))**.
1. not access(`checked`, "ok")
  Return *checked*.
We **ran = [读取真实输出](access(`checked`, "value"))**.
We **html = [读取浏览器 DOM](access(`ran`, "stdout"))**.
We **_ = [保留 DOM](fs.atomic_write(path=".marqdo/client-state-dom.html", text=`html`))**.
We **_ = [保留运行诊断](fs.atomic_write(path=".marqdo/client-state-errors.txt", text=access(`ran`, "stderr")))**.
1. not [确实完成两轮及取消](text.contains(text=`html`, sub="state-pass:3-cancel"))
  Return *[状态验收未通过](result.error(code="test.client_state", message=`html`, operation="run"))*.
We **send = [检查按钮](re.find(text=`html`, pattern="<button[^>]*id=\"chat-send\"[^>]*>"))**.
1. not `send` or [发送仍被禁用](text.contains(text=`send`, sub="disabled"))
  Return *[输入没有恢复](result.error(code="test.client_controls", message=str(`send`), operation="run"))*.
We **old_model = [读取原模型按钮](re.find(text=`html`, pattern="<button[^>]*id=\"model-none\"[^>]*>"))**.
We **new_model = [读取当前模型按钮](re.find(text=`html`, pattern="<button[^>]*id=\"model-qwen\"[^>]*>"))**.
We **panel = [读取模型浮层](re.find(text=`html`, pattern="<aside[^>]*id=\"panel-model\"[^>]*>"))**.
1. not `old_model` or not `new_model` or not `panel` or text.contains(text=`old_model`, sub="is-active") or not text.contains(text=`new_model`, sub="is-active") or text.contains(text=`panel`, sub="is-open")
  Return *[模型外观合同失败](result.error(code="test.model_classes", message="selection or close effects lost", operation="run"))*.
Return *[真实 WASM 状态验收通过](result.ok(value="Enter / two rounds / cancellation / model selection / idle"))*.

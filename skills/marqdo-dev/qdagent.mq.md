---
markup: occlusion
title: 求道开发与真实验收入口
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  engineering: ext/engineering/index.mq.md
  native: ../../ext/qdagent/index.mq.md
  call: ../../pages/control/call.mq.md
  state_test: ../../tests/task-ui.mq.md
  capabilities: ../../tests/capabilities.mq.md
  http_suite: ../../tests/http.mq.md
  site: ../../pages/index.mq.md
  office_test: ../../tests/agent-capabilities.mq.md
  workbench_test: ../../tests/workbench-ui.mq.md
  live: ../../deploy/agent-verify.mq.md
---

> 运行入口已迁移：生产站点使用 React + Go + Python，见 README.md 与 deploy/build.sh。本文件保留为 Marqdo 工具与旧宿主的开发参考，不再用其 serve 启动生产站点。实际智能体任务仍通过登记的 marqdo call 完成。


所有开发执行流使用 marqdo call，文件读取和写入使用原生 fs。业务、工具、提示词、控制服务与客户端均为 .mq.md；跨 HTTP 的后台进程与文件锁由已登记 ABI 插件补齐。不修改 Marqdo 源码。

阅读顺序是 pages/control/plugins.mq.md、sessions.mq.md、pages/agent/runner.mq.md 与 executor.mq.md，再看 pages/public/client.mq.md 和 pages/views/shell.mq.md。参数与返回值在各函数标题下面，真实动作使用遮蔽调用。对话为普通 Markdown，实际行动必须形成 marqdo call。

标准库始终启用。拓展通过能力注册表开关，源码、版本与 ABI 安装一同更新。会话根保存作业与档案，工作根保存智能体文件，工程根保存可信程序；切换任务只改变当前阅读和控制目标。公开日志记录实际操作、参数与结果；仅展示模型接口实际返回的思考字段，不要求模型提交内部思维链。

先调用 prepare_acceptance 与 offline，再按改动范围运行 browser_state 或 native_tests。HTTP 服务使用 prepare_http 与 serve_test。当前环境的 Chromium HTTP 导航曾超时，file 模式的真实 WASM 回归和 HTTP 端点检查是两层证据，不能互相替代。生产已使用统一身份认证、SQLite 用户隔离与独立后台任务。当前子智能体是单层顺序执行，每个父运行最多三个子任务、每个子任务八轮、父运行二十四轮；没有宣称并行调度。

## prepare_acceptance

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安装当前 ABI 并准备隔离工程 |

构建只使用本工程的 Cargo 清单与缓存。原生边界补跨请求进程与文件锁，不承担业务、提示词或前端。隔离副本不复制用户会话，测试可以切换自己的插件开关而不影响真实设置。已有失败现场保留，准备不清空用户数据。

We **installed = [安装同一版本原生边界](native.install())**.
1. not access(`installed`, "ok")
  Return *installed*.
Return *[准备实际源码与原生依赖](capabilities.prepare())*.

## offline

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实工作目录、Schema、插件与会话断言 |

先准备独立工程，再通过实际 marqdo call 运行测试。CLI 零退出和内部 Result 成功必须同时成立。此测试实际写入、读取隔离文件，检查未知工具、畸形参数、拓展停用、固有能力与过期代数，不接触真实任务。它不证明模型质量、浏览器排版或公网部署。

A successful receipt must come from the isolated workspace, not from a constant test marker. The wrapper returns the suite's actual Result so a denied capability remains a failure.

We **prepared = [准备完整隔离工程](prepare_acceptance())**.
1. not access(`prepared`, "ok")
  Return *prepared*.
We **root = access(`prepared`, "value")**.
We **file = sys.cwd() + "/tests/capabilities.mq.md"**.
Return *[实际执行协议与能力验收](call.invoke(file=`file`, function="run", root=`root`, effects="plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read"))*.

## browser_state

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已经安装的 Chromium 绝对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方 WASM 两任务与稳定展开的真实 DOM 断言 |

Use `chrome`。读取当前正式客户端，只替换确定性网络与测试触发器。浏览器真实执行 Enter、会话切换、展开和后续轮询；结束时必须看到第二个任务成功且详情仍展开。没有预置通过标记，也没有复制另一套客户端状态机。本地 file 验收不能冒充 HTTP 整站或真实模型验收。

Return *[官方 WASM 回归](state_test.run(chrome=`chrome`))*.

## serve

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| port | number | 7430 | 监听端口 |
| host | text | "127.0.0.1" | 绑定地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞运行正式站点 |

Use `port`=7430 and `host`="127.0.0.1"。先安装原生边界，再启动官方 Web 宿主。首页使用官方 View 阅读骨架，普通 Markdown 使用已有 Web 渲染器；产品壳由最小原生组件组成。只启动本机服务，不清理任务、不请求模型，也不修改 Marqdo 源码。

Return *[启动实际用户站点](site.serve(root="pages", port=`port`, host=`host`))*.

## prepare_http

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 隔离工程和站点的真实路径 |

HTTP 回归也使用独立工程，防止控制服务回到真实项目根切换插件或写入历史。普通源文件由原生目录复制，worker 用保留权限的安装完成。静态阅读资源来自当前 compose，可重新构建；运行数据与它分开。准备只写文件，不监听端口。

The trusted runtime project points to the test copy too, so API callbacks cannot return to the real settings directory.

We **prepared = [准备隔离工程](prepare_acceptance())**.
1. not access(`prepared`, "ok")
  Return *prepared*.
We **_ = [生成当前官方页面](site.compose())**.
We **_ = [安装同一套浏览器资源](fs.copy_tree(src="pages/public", dest=".marqdo/capabilities/pages/public", overwrite=True))**.
Return *prepared*.

## serve_test

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| port | number | 17432 | 专用验收端口 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞运行隔离服务，不接触用户档案 |

Use `port`=17432。先 prepare_http，再启动专用端口。可信工程定位明确指向隔离副本，HTTP 端点选中的会话、插件设置和工作文件都落在那里。此函数不自动结束已有正式服务，也不把静态导出文件当成完整端点站点。

We **root = sys.cwd() + "/.marqdo/capabilities"**.
Return *[独立运行实际端点](site.serve(root=".marqdo/capabilities/pages", project=`root`, port=`port`, host="127.0.0.1"))*.

## check

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| file | text | required | 本工程待检查源码 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方契约与逐函数叙述比例的实际诊断 |

Use `file`。检查参数表、返回契约和每个函数的叙述比例，阈值沿用官方规范，不自动降低。叙述要说清输入、实际行为、输出和失败恢复；不能把一段总介绍代替各函数的职责说明。检查不替代运行验收，非零退出和具体诊断原样保留。


`argv` =

| argument |
|---|
| "marqdo" |
| "check" |
| `file` |
| "--narrative-ratio" |

Return *[运行实际规范检查](engineering.checked(argv=`argv`, timeout_ms=30000, max_output=65536))*.


## native_tests

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 最小 ABI 边界的实际单元测试 |

只测试真实 OS 缺口：生命周期锁与旧令牌发布保护。业务状态机与 Markdown 阅读由其他 Marqdo 验收负责。Cargo 使用离线锁定依赖与本工程缓存，不能写回相邻 Marqdo 的 SDK 源码。没有运行的测试不计为通过。


These tests cover only the ABI boundary. Conversation persistence and front-end rendering require their separate Marqdo suites.

`argv` =

| argument |
|---|
| "cargo" |
| "test" |
| "--offline" |
| "--locked" |
| "--manifest-path" |
| "ext/qdagent/native/Cargo.toml" |
| "--target-dir" |
| ".marqdo/native-target" |

Return *[仅验证原生生命周期缺口](engineering.checked(argv=`argv`, timeout_ms=60000, max_output=65536))*.





## http_test

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| base | text | "http://127.0.0.1:17432" | 已启动的隔离站点 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | HTTP 会话与 Markdown 协议实际断言 |

Use `base`="http://127.0.0.1:17432"。先 prepare_http，再在独立终端 serve_test。此入口真实访问 HTTP 端点，验证创建、开始、拉取、Markdown、过期停止和固有能力拒绝关闭；不替换后端函数，不使用正式档案。它需要 network.read、output.write 和 process.control，后两项仅用于失败断言打印并停止测试。模型保持 none，因此运行不依赖推理质量。

Return *[真实端点回归](http_suite.run(base=`base`))*.

Docker 使用独立的 [容器入口](../../deploy/manage.mq.md)。主机侧调用 build、up、status；需要容器内开发时显式使用 dev_up，代码写入独立卷，不挂主机仓库或 Docker socket。调用涉及标准输入 ABI 时授予 environment.read，以读取可信的插件安装根。SQLite 保存身份、任务与偏好，过去的 JSON 偏好文件不作为新登录主体的授权来源。


任务闭环先阅读 [计划工具](../../pages/agent/plan.mq.md)、[办公插件](../../ext/office/index.mq.md) 和 [子智能体入口](../../pages/agent/delegate.mq.md)。plan_task 建立目标与验收，read_plan 恢复，update_plan 必须用实际 evidence 才能完成；create_office 生成 DOCX、PPTX 与源稿，render_pdf=true 立即验证排版并附带 PDF；delegate_task 给出自包含的小目标，执行器注入身份、模型和受限工具。界面从工作台读取真实文件清单，提供认证后的预览、版本与下载，不从模型答案中猜出文件。

## office_acceptance

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| render_pdf | bool | False | 容器启用真实排版验证 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 生产计划、办公文件与授权边界的实际验收 |

Use `render_pdf`=False。专用测试身份创建真实报告和演示，验证计划恢复、文件证据、用户隔离和受限子任务工具。容器中使用 True，还会实际加载两种 Office 文件并导出 PDF。文件生成、字体排版与事实核验是不同检查，不能用一个成功标记代替全部。

Return *[实际生产能力回归](office_test.run(render_pdf=`render_pdf`))*.

## workbench_acceptance

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已安装的 Chromium 绝对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实工作台、下载预览链接与稳定展开的浏览器结果 |

Use `chrome`。使用刚刚生成的真实产物构造明确的网络夹具，浏览器继续运行正式客户端和官方 WASM。检查计划、报告、演示和链接均可见，后续轮询仍保留展开的执行详情。截图只证明这份浏览器场景，不能冒充外部模型和登录已经运行。

Return *[真实组件与当前客户端](workbench_test.run(chrome=`chrome`))*.

## live_agent

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | required | 开发身份的已授权加密配置身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 容器内真实后台模型任务已经启动 |

Use `selection`。先在容器中准备独立开发配置，再启动固定验收任务。模型必须实际规划、委托、生成文档与演示，并产生排版 PDF，普通 Markdown 承诺不能完成验收。此入口只报告启动，完成与否继续使用 live_status 和 live_audit 核对；不要求浏览器保持连接。

Return *[真实模型启动正常执行流](live.start(selection=`selection`))*.

## live_status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 开发验收任务的真实有界状态 |

只观察固定开发任务的状态、计划与实际产物，不联系模型、不重复工具、不输出密钥。轮询只是读取正在发生的事实，模型和工具在独立进程中运行。发现进程提前退出时由生产控制器记录真实失败，不能继续显示假运行动画。

Return *[读取真实进展](live.status())*.

## live_audit

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 完整闭环的独立验收断言 |

读取真实计划、文件和子任务登记，并重新计算文件摘要。需要同时具备可编辑报告、演示、两份实际排版 PDF、完成的复核和真正写出文件的撰写子任务。测试失败立即停止，不在验收中补写成功。普通用户的配置和任务不属于这个固定开发身份。

Return *[真实交付才能通过](live.audit())*.

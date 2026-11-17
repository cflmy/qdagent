---
markup: occlusion
type: web
route: /
title: 求道
description: >-
  产品宿主：阅读面为官方 marqdo view 渲染的 reader-page（级联原样迁入），顶栏叠浮动对话壳；
  同宿主挂 /api/chat。不修改 marqdo 源码。
import:
  shell: views/shell.mq.md
  styles: views/styles.mq.md
  hash: lib/hash.mq.md
  re: lib/re.mq.md
  web: ext/web/web.mq.md
  fs: lib/fs.mq.md
  result: lib/result.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

工作台使用原生最小布局组件，文件阅读保留官方 View 输出和资源。界面设计与验收说明见 docs/design/工作台第二版.mq.md，所有业务交互仍以 Marqdo 源码表达。

## compose

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原生工作台完整页与宿主片段 |

装配始终使用当前可信源码。官方 View 导出提供原版阅读资源，原生组件提供任务导航、对话正文、输入区、配置浮层和文件检查区。首页不再嵌入一整份静态开发手册。运行中的会话来自持久化接口，装配不会生成回答、工具成功记录或示例产物。

先执行官方只读导出，再检查实际文档页面的 head 与 body 边界。导出失败立即返回诊断，不沿用上一次的旧页面。提取 HTML 边界不是解释 Marqdo 语法；语法处理属于官方阅读器。原生文件预览也直接使用官方渲染片段，因此说明、参数表、逻辑标签和侧注能够保持 View 的结构。

导出目录中的根 index.html 可能是跳转页，因此读取明确的 pages/index.mq.md.html。这里只保留官方资源声明，正文统一由 shell.canvas 生成。侧栏、顶栏、输入框和检查区由 shell.render 按最小布局组合；组件源码是唯一修改入口。不要在 generated 目录手改 HTML、业务脚本或 CSS，因为下一次构建会覆盖它们。

两份输出共享同一份内容。完整页用于工程检查，body.fragment.html 交给官方 Web 宿主的 bare 布局。正式访问只有站点根路由，不存在一套静态主页和另一套交互主页。官方桥接、WASM 与原生客户端源码继续由 public 提供；没有 iframe 或第二个手写 Marqdo 渲染器。

客户端与组件依赖的 SHA-256 摘要共同构成静态资源缓存身份。浏览器能够长期缓存相同内容，而源码改变后地址也会改变。公开 build-info 另行返回实际客户端摘要，用于核对本机和代理域名是否访问同一部署；健康检查本身不能证明版本一致。

布局更新不接触 SQLite、会话工作目录、上传文件或模型凭据。任务列表与模型选项由登录用户的实际接口填充。当前会话的名字显示在页面首部，历史消息保持独立角色边界，执行卡片正常轮询时只更新叶节点。文件预览具有独立节点和请求身份，不应覆盖对话或复用它的执行状态。

完整页与片段分别通过原生 atomic_write 发布。单个文件不会被读到一半，两份文件之间仍不是跨文件事务；生产构建在隔离上下文中完成装配，之后再替换容器。读写目录和装配权限属于工程操作，不会自动授予聊天模型修改站点源码或启动 Docker 的权限。

产品样式只管理工作台空间和交互组件。文档标题、语法标记、返回值及侧注仍由官方阅读资源展示。桌面检查区占用自己的列，手机使用可关闭的抽屉；关闭只改变阅读空间，不删除文稿、不停止任务。新任务尚无执行或产物时展示真实空态，不能把设计图中的内容当作运行数据。

`gen_argv` =

| argument |
|---|
| "view" |
| "output" |
| "index.mq.md" |
| "--no-exec" |
| "--out" |
| "pages/public/generated/view-site" |

The exported static module's knowledge, pending run output and source sections do not describe a conversation run. Remove those bounded wrapper sections during assembly, while preserving reader assets and the stable structure node. Actual dialogue receipts are supplied by the separate task API and inline trace, so removing the template cannot erase a real task result.

We **built = [生成当前官方阅读面](sys.exec(cmd="marqdo", args=`gen_argv`, capture=True))**.
1. access(`built`, "code") != 0
  Return *[停止装配失败的阅读面](result.error(code="qdagent.view_site", message=str(`built`), operation="compose"))*.
We **view = [读取实际文档页面](fs.read_text(path="pages/public/generated/view-site/pages/index.mq.md.html"))**.
We **_ = [从 Marqdo 源码生成样式](styles.build())**.
We **overlay = [原生最小布局装配产品壳](shell.render())**.
We **head = [取官方资源声明](re.find(text=`view`, pattern="(?s)<head>.*?</head>"))**.
We **body = [取官方页面正文](re.find(text=`view`, pattern="(?s)<body[^>]*>.*</body>"))**.
1. not `body` or not `head`
  Return *[不发布不完整的页面](result.error(code="qdagent.compose", message="missing official head/body", operation="compose"))*.
We **head = [只保留 head 内部](text.replace(text=text.replace(text=`head`, old="<head>", new=""), old="</head>", new=""))**.
We **body = [工作台只保留一套应用结构](shell.canvas())**.
We **chrome = "<style>.reader-dock{display:none}</style>"**.
We **fragment = `head` + `chrome` + `body` + `overlay`**.
We **composed = [官方资源与原生工作台共同装配]("<!doctype html><html><head>" + `head` + "</head><body class=\"reader-page qd-inspector-open qd-inspector-initial\">" + `body` + `chrome` + `overlay` + "</body></html>")**.
We **_ = [建立输出目录](fs.make_dirs(path="pages/public/generated/site"))**.
We **_ = [原子写出完整页](fs.atomic_write(path="pages/public/generated/site/index.html", text=`composed`))**.
We **_ = [原子写出宿主片段](fs.atomic_write(path="pages/public/generated/site/body.fragment.html", text=`fragment`))**.
Return *[装配完成，未运行模型或回答](result.ok(value="pages/public/generated/site/index.html"))*.

## serve

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | "pages" | 站点发现目录 |
| port | number | 7430 | 监听端口 |
| host | text | "127.0.0.1" | 绑定地址 |
| project | text | "" | 可信工程根；空则使用当前工程 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞监听；首页为 reader-page + 合并浮动窗 |

准备 app 不会监听。只有最后调用 listen 才打开端口并阻塞；首页装配或路由发现失败时不会继续进入监听。host 默认绑定本机，不能把本任务的可用性等同于已配置公网部署。

静态资源相对于站点根的 public 目录挂载，端点回调则以站点根读写运行数据。复制站点用于验收时，这两种路径必须一起保持；只复制首页 HTML 而没有插件与数据根，无法构成可用服务。

Use `root`="pages", `port`=7430, `host`="127.0.0.1" and `project`=""。先 compose，再 prepare；把首页
page 调成 shell_css=off、layout=bare 且 body_class=reader-page，intro 为合成 body 片段，从而得到
body.reader-page 且无 Web 默认顶栏 且同宿主提供 /api/chat 与 /static。授权 plugin、fs、network、process.exec。

The launch configuration identifies this engineering root for the API gateway. It is written beneath the selected site's data directory, separately from session archives. Preparing or rebuilding the page does not reset plugin switches, workspace files or an active session. A server restart should recover those records from their actual directories.

We **app = [先准备可组合宿主](prepare(root=`root`, port=`port`, host=`host`, project=`project`))**.
1. json.get(value=`app`, key="ok") == False
  Return *app*.
Return *[实际监听](web.listen(app=`app`))*.




## prepare

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | "pages" | 站点目录 |
| port | number | 7430 | 端口 |
| host | text | "127.0.0.1" | 绑定地址 |
| project | text | "" | 可信工程根 |
| build_page | bool | True | 开发时重建；只读镜像使用预构建页 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实 Web 应用资源，未监听 |

Use `root`="pages", `port`=7430, `host`="127.0.0.1", `project`="" and `build_page`=True。Docker 镜像在构建前完成 View 与组件装配，运行时只读取产物；唯一运行配置写在可写的数据目录。准备与监听分开，身份、SQLite 和访问控制资源必须在监听之前绑定。

A read-only image must not rebuild source assets during startup. Development can explicitly rebuild them; production reads the exact generated fragment packaged with its client source. This function does not open a port or authenticate a user. Its returned native app retains the actual endpoint root, allowing resource-owned OIDC and database bindings to be composed before the final listener.

1. `build_page`
  We **composed = [合成官方阅读面与顶栏](compose())**.
  1. not access(`composed`, "ok")
    Return *composed*.
We **frag_path = "pages/public/generated/site/body.fragment.html"**.
1. not [合成片段存在](fs.exists(path=`frag_path`))
  Return *[缺少合成片段](result.error(code="qdagent.fragment", message=`frag_path`, operation="serve"))*.
We **intro = [读取合成阅读面](fs.read_text(path=`frag_path`))**.
We **_ = [建立站点配置目录](fs.make_dirs(path=(`root` + "/data")))**.
1. `project` == ""
  We **project = [当前可信工程根](sys.cwd())**.
We **config = [可信工程定位](table.put(in=None, at="project", value=`project`))**.
We **_ = [配置与用户会话分开](fs.write_json(path=(`root` + "/data/runtime.json"), value=`config`))**.
We **app = [发现端点并挂载 public](web.prepare(root=`root`, host=`host`, port=`port`, static_dir="public"))**.
We **page = [取首页袋](json.get(value=`app`, key="page"))**.
We **page = [关闭默认壳样式](table.put(in=`page`, at="shell_css", value="off"))**.
We **page = [去掉 Web 顶栏页脚铬](table.put(in=`page`, at="layout", value="bare"))**.
We **page = [body 加上 reader-page](table.put(in=`page`, at="body_class", value="reader-page qd-inspector-open qd-inspector-initial"))**.
We **page = [注入官方阅读 HTML](table.put(in=`page`, at="intro", value=`intro`))**.
We **app = [写回首页袋](table.put(in=`app`, at="page", value=`page`))**.
Return *app*.

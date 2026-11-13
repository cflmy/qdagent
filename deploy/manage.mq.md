---
markup: occlusion
title: 构建、启动和检查容器
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  engineering: ext/engineering/index.mq.md
  call: ../pages/control/call.mq.md
  site: ../pages/index.mq.md
  model_key: model-key.mq.md
  browser_files: ../ext/web/browser-files.adapter.mq.md
  keyboard: ../ext/web/keyboard.adapter.mq.md
  pointer: ../ext/web/pointer.adapter.mq.md
---

所有工程执行入口仍是 marqdo call。Dockerfile 和 Compose 只声明环境，不承载业务脚本。prepare 生成严格白名单构建上下文，secret 单独挂载；重新构建不会删除持久数据卷。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实构建上下文；没有打包用户数据或密钥 |

先重新生成当前 View 与组件产物，再复制可信源码和已经安装的 Linux ABI。只清理专用构建目录，源仓库与工作目录保持原样。CLI 从本机已安装路径复制，文件读写使用原生 fs。密钥、.env、运行数据库、用户历史、旧归档和构建缓存不进入上下文。

The context is an explicit allowlist, not a copy of the whole workspace. Each image receives the same checked Marqdo executable and locally registered extension artifacts. Docker's own build context filter excludes the separate secret directory. A clean rebuild prevents stale files from an earlier context from being packaged accidentally. Source assembly is distinct from building the image and from starting a service; none of these steps grants a model access to the Docker socket.


Directory exclusions must be relative to the folder being copied. In particular, ext/data is an installed library and must be included, whereas pages/data is runtime state and must be omitted. Keep these two meanings distinct. The only source directories selected are the declared application, libraries, tests and callable manuals; root environment files, private secret mounts, old archives and user workspaces are not selected. Every rebuild begins from a fresh dedicated context so previously copied runtime material cannot survive by accident.

Source exclusions are checked against the actual package layout. A folder named data inside an extension is code; a runtime data folder under pages is not. The context must preserve that distinction before it can be considered buildable.

Prepare the independent model secret and compatible browser file-range ABI before hashing and packaging the page; existing keys are retained.

We **key = [已有密钥保留，只在首次安装生成](model_key.ensure())**.
1. not access(`key`,"ok")
  Return *key*.
We **adapter = [安装当前浏览器有界文件 ABI](browser_files.install())**.
1. not access(`adapter`,"ok")
  Return *adapter*.
We **keys = [键盘修饰键和输入法事件 ABI](keyboard.install())**.
1. not access(`keys`,"ok")
  Return *keys*.
We **pointer_host = [指针元数据与捕获 ABI](pointer.install())**.
1. not access(`pointer_host`,"ok")
  Return *pointer_host*.
We **rendered = [生成当前只读阅读面](site.compose())**.
1. not access(`rendered`,"ok")
  Return *rendered*.
1. fs.exists(path=".marqdo/docker-context")
  We **_ = [只清理可重建上下文](fs.remove_tree(path=".marqdo/docker-context"))**.
We **_ = fs.make_dirs(path=".marqdo/docker-context/app")**.
We **_ = fs.make_dirs(path=".marqdo/docker-context/bin")**.

`folders` =

| folder |
|---|
| "lib" |
| "ext" |
| "pages" |
| "skills" |
| "deploy" |
| "tests" |
| "doc" |

`exclude` =

| pattern |
|---|
| "data/**" |
| "qdagent/native/target/**" |
| "node_modules/**" |

- [只装入真实应用源码](for folders as folder)
  1. fs.exists(path=`folder`)
    We **skip = table.empty_list()**.
    1. `folder` == "pages"
      We **skip = table.append(list=`skip`, item="data/**")**.
    We **skip = table.append(list=`skip`, item="qdagent/native/target/**")**.
    We **skip = table.append(list=`skip`, item="node_modules/**")**.
    We **_ = fs.copy_tree(src=`folder`, dest=(".marqdo/docker-context/app/" + `folder`), overwrite=True, exclude=`skip`)**.
We **_ = fs.copy_file(src="index.mq.md", dest=".marqdo/docker-context/app/index.mq.md")**.
We **_ = fs.copy_file(src="README.md", dest=".marqdo/docker-context/app/README.md")**.
We **_ = fs.make_dirs(path=".marqdo/docker-context/app/data")**.
We **_ = fs.make_dirs(path=".marqdo/docker-context/app/pages/data")**.

`args` =

| src | dest |
|---|---|
| "/usr/local/bin/marqdo" | sys.cwd() + "/.marqdo/docker-context/bin/marqdo" |

We **dest = sys.cwd() + "/.marqdo/docker-context/bin/marqdo"**.
We **args = table.put(in=`args`, at="dest", value=`dest`)**.
We **file = sys.cwd() + "/lib/fs.mq.md"**.
We **_ = [原生复制已安装 CLI，不下载其他实现](call.invoke(file=`file`, function="copy_file", arguments=`args`, root="/", effects="fs.read,fs.write"))**.
Return *[构建输入已准备](result.ok(value=".marqdo/docker-context"))*.


## build

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际镜像构建结果 |

先 prepare，再通过已登记工程拓展运行 Docker。镜像基于现有 Python 发行镜像安装 Node、SQLite、Git 和基础网络工具。客户端秘密只在启动时挂载，不能作为 build argument。构建失败保留实际输出，不继续启动不存在的新镜像。


Docker build uses only the prepared context and declaration file. A build failure never triggers a container replacement.

We **prepared = prepare()**.
1. not access(`prepared`,"ok")
  Return *prepared*.

`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "build" |
| "qdagent" |

Return *[真正构建本工程镜像](engineering.checked(argv=`argv`, timeout_ms=600000, max_output=12000))*.


## up

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 启动结果，健康状态另查 status |

只启动本工程声明的服务，不停止其他容器、不清理其他镜像或卷。Compose 使用非 root、只读程序目录、最小能力和独立数据卷。启动成功只说明进程已创建，随后应检查 healthz 与 OIDC 跳转，不能把它说成用户已经登录。


`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "up" |
| "-d" |
| "--no-build" |
| "qdagent" |

Return *[实际启动唯一服务](engineering.checked(argv=`argv`, timeout_ms=120000, max_output=4000))*.


## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Compose 实际运行与健康状态 |

只读取本工程服务状态。它不打印环境变量或 secret 文件，健康检查也不建立认证用户。身份站回调尚未登记时，容器可以健康并正确重定向登录，但真实用户授权回调仍需在身份站完成配置。


`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "ps" |

Return *[读取真实服务状态](engineering.checked(argv=`argv`, timeout_ms=30000, max_output=4000))*.





## dev_up

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 独立代码卷中的开发服务 |

开发模式仅放开容器自己的代码卷，仍以非 root 用户运行并保留独立数据卷，不挂载主机仓库或 Docker socket。源码可通过容器终端的 marqdo call 原生文件能力修改，Python 依赖放在数据卷中的 venv，Node 包可写入开发代码卷。回到 up 会使用只读镜像，已有开发代码卷不会被删除。

Use this explicit mode only when changing code inside the container. It does not give an agent control of the host Docker daemon. Rebuilding an image does not overwrite an existing development volume; retain or export its work before intentionally replacing that volume. Production startup remains the default up function.


`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "-f" |
| "compose.yaml" |
| "-f" |
| "compose.dev.yaml" |
| "up" |
| "-d" |
| "--no-build" |
| "qdagent" |

Return *[显式开启隔离代码卷](engineering.checked(argv=`argv`, timeout_ms=120000, max_output=4000))*.


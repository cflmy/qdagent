---
markup: occlusion
title: 求道本地传输插件安装
import:
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

业务入口是 ollama_chat.mq.md，原生边界由 transport.mq.md 注册。先在仓库根调用 install，
再启动 pages/index.mq.md 的 serve。标准库和官方拓展不需要修改，也不需要重建 Marqdo。
SDK 是相邻 marqdo 仓库中的只读依赖；原生产物与构建缓存都写到本工程，不能写回 SDK 工程。

## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，真实编译成功并同步两处安装根 |

此任务从工程根运行，需要 fs.write 和 process.exec。Cargo 只承担 ABI 原生边界的编译，
不能拿来实现提示词、知识检索或会话状态。离线依赖不足时会保留原始编译诊断并停止，
不会偷偷下载、绕过失败或把不存在的库登记成可用插件。

安装是构建与同步，不是启动模型。动态库负责注册 ABI 调用，专用 worker 负责跨请求存活的传输；二者必须来自同一次编译。编译缓存固定在本工程 .marqdo/native-target，依赖的 SDK 源码只读，不能因为相邻仓库已有 target 目录就把产物写回那里。

| 安装位置 | 所需产物 | 运行时用途 |
|---|---|---|
| ext/native | libqdagent_transport.so、qdagent-worker | 工程根的直接 call 与隔离验收准备 |
| pages/ext/native | 相同动态库与 worker | Web 端点以 pages 为运行根时加载 |
| pages/ext/native | 已安装的 libagent.so、libweb.so | 让站点宿主看见官方插件，不修改其源码 |
| pages/ext/qdagent | transport.mq.md、ollama_chat.mq.md | 站点与工程根使用同一协议包装 |
| .marqdo/native-target | Cargo 的构建中间产物 | 仅缓存，可重建，不属于业务源代码 |

复制可执行产物必须保留权限。普通目录复制适合源码，却可能丢掉 worker 的执行位；安装因此显式使用原生 copy_file。验证安装时应真正 begin、pull 和 stop，不能仅凭动态库文件存在就宣称生命周期可用。

The worker and shared library must come from the same build. Update both the engineering and site installation roots explicitly, then let each session's digest check refresh its runtime. The installed network mirror includes its callable client and local version. This is a qdagent package update; neither compilation output nor copied sources are written into the neighboring Marqdo repository.

`args` =

| argument |
|---|
| "build" |
| "--offline" |
| "--locked" |
| "--manifest-path" |
| "ext/qdagent/native/Cargo.toml" |
| "--target-dir" |
| ".marqdo/native-target" |

We **built = [编译 ABI v2 动态库与专用 worker](sys.exec(cmd="cargo", args=`args`, capture=True))**.
1. access(`built`, "code") != 0
  Return *[保留编译失败](result.error(code="qdagent.build", message=str(`built`), operation="install"))*.

`roots` =

| root |
|---|
| "ext" |
| "pages/ext" |

同一模块有工程调用和站点回调两个宿主根；安装相同文件确保两边不会使用不同版本。
后续若取消站点镜像机制，应统一安装根，不能只更新其中一份。安装不覆盖会话数据。

We **_ = [更新工程动态库](fs.copy_file(src=".marqdo/native-target/debug/libqdagent_transport.so", dest="ext/native/libqdagent_transport.so"))**.
We **_ = [更新工程执行器](fs.copy_file(src=".marqdo/native-target/debug/qdagent-worker", dest="ext/native/qdagent-worker"))**.
We **_ = [更新站点动态库](fs.copy_file(src=".marqdo/native-target/debug/libqdagent_transport.so", dest="pages/ext/native/libqdagent_transport.so"))**.
We **_ = [更新站点执行器](fs.copy_file(src=".marqdo/native-target/debug/qdagent-worker", dest="pages/ext/native/qdagent-worker"))**.
已有官方库也要在站点宿主根可见。端点由独立 Marqdo 调用运行时，文件根是 pages，
不能假设工程根中安装过的库就会自动出现在站点根。这里只复制已安装产物，不改动官方实现。

`official` =

| file |
|---|
| "libagent.so" |
| "libweb.so" |

- [让两个宿主使用同一官方原生产物](for official as file)
  We **_ = [同步已安装的官方库](fs.copy_file(src="ext/native/" + `file`, dest="pages/ext/native/" + `file`))**.
We **_ = [同步模型 ABI](fs.copy_file(src="ext/native/libllm.so", dest="pages/ext/native/libllm.so"))**.
We **_ = [同步当前网络拓展源码](fs.copy_tree(src="ext/net", dest="pages/ext/net", overwrite=True))**.
We **_ = [同步 ABI 包装](fs.copy_file(src="ext/qdagent/transport.mq.md", dest="pages/ext/qdagent/transport.mq.md"))**.
We **_ = [同步协议实现](fs.copy_file(src="ext/qdagent/ollama_chat.mq.md", dest="pages/ext/qdagent/ollama_chat.mq.md"))**.
Return *[两处均安装完成](result.ok(value=True))*.

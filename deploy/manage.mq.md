---
markup: occlusion
title: 当前工作台构建与部署手册
import:
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---

这是当前 React、Go 与 Marqdo 文稿运行时的部署入口。它不再重建旧浏览器示例或挂载旧源码卷。普通函数通过受限工程拓展调用现有构建程序，模型提示与业务阶段不在构建脚本中定义。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | prepare 的真实结果，失败保留诊断 |

Use 。

准备与当前 Playwright 相符的 Chromium、浏览服务的私有凭据和构建目录。浏览器服务凭据只用于本地容器通信，不能当作模型 API key。现有凭据保留，缺失才创建，文件只对指定容器组可读。程序代码与数据卷不在这一步替换，准备成功也不代表镜像已经构建或网站访问成功。已有兼容浏览器可以通过 QDAGENT_CHROMIUM_SOURCE 指定其安装目录，避免重复下载。

模型配置加密主密钥和供应商 API key 是不同资源，不能互换，也不能把前者发到供应商。生产加密密钥轮换需要单独的管理员批准、数据库备份和离线迁移，prepare 不会执行这些操作。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/prepare-browser.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=600000,max_output=16000)*.

## build

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | build 的真实结果，失败保留诊断 |

Use 。

构建前运行当前文稿检查，然后离线编译求道 ABI，准备同版本 Marqdo CLI 和浏览器资源，再构建主服务及隔离浏览器镜像。React 前端和 Go 服务由各自官方构建工具编译，业务状态机仍是普通 Marqdo 文稿。任何一步失败就停止，不更新正在运行的服务，不把旧构建产物当作这次成功。

Docker 上下文排除密钥、用户数据、环境配置和私有运行记录。部署脚本只提供基础设施操作，没有模型指令、角色提示或工具 JSON 分派。构建完成后应核对实际检查结果，再由已经授权的部署操作替换服务。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/build.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=600000,max_output=16000)*.

## up

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | up 的真实结果，失败保留诊断 |

Use 。

用已验证镜像启动本工程声明的主服务和隔离浏览器，不重建镜像、不删除数据卷，也不接触其他容器。唯一外部端口仍是 7964，浏览器服务没有宿主端口映射。主服务依赖浏览器健康检查，程序目录只读，以不同非 root 用户运行。任务、模型配置、统一身份与历史数据继续使用原有卷。

这项操作会替换本工程服务，必须有实际部署授权；密钥轮换不包含在其中。启动成功只说明容器已创建，仍须检查健康接口、版本、数据完整性与已授权业务路径。不能因为容器启动就声称真实用户已经登录或任务已经完成。

`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "up" |
| "-d" |
| "--no-build" |
| "qdagent" |
| "browser-sandbox" |

Return *engineering.checked(argv=`argv`,timeout_ms=120000,max_output=16000)*.

## status

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | status 的真实结果，失败保留诊断 |

Use 。

读取当前工程的真实容器与端口状态。它不会启动、停止或更新任何服务，也不会读取密钥或用户模型凭据。状态来源是 Docker，而不是源码中的版本声明；构建完成但尚未部署时，旧容器仍会显示旧运行事实。需要核对 HTTP 行为时再访问 healthz 与版本接口，不能用一条绿色终端输出代替完整业务验收。

`argv` =

| argument |
|---|
| "docker" |
| "compose" |
| "ps" |

Return *engineering.checked(argv=`argv`,timeout_ms=30000,max_output=16000)*.

## dev_up

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | dev_up 的真实结果，失败保留诊断 |

Use 。

旧开发模式会把历史整份应用挂在固定源码卷上，容易覆盖新镜像中的 React、Go 与文稿运行时，因此这个入口明确停用。已有卷不在这里删除，用户数据也不受影响。当前开发使用各自的前端与 Go 开发服务；交付通过 build 和已授权的 up 执行，避免因为复用旧卷而出现“构建完成但页面没有变化”。

Return *result.error(code="deploy.legacy_volume",message="旧源码卷启动入口已停用，请使用当前构建与部署入口",operation="dev_up")*.


## probe_browser

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | probe_browser 的真实结果，失败保留诊断 |

Use 。

在专用容器中验证真正的 Chromium 沙盒、只读网络、重定向检查、会话隔离和取消后的资源释放，再通过真实 Marqdo ABI 验证快照、截图、依赖交接和引用契约。临时资料站只存在于验收容器，不能在生产配置中开放回环来源例外；容器没有宿主端口或用户数据挂载，结束后清理。本函数不替换正在运行的生产服务，不接触生产模型凭据，也不把网络替身返回当作浏览成功。

检查依赖当前已构建的浏览镜像和求道 ABI。镜像缺失时应先 build，任何用例失败都返回实际非零结果。CoW 用例还确认宿主没有候选写入，未访问的引用不能通过，用户审阅后的正文变化会使验收失效。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/test-browser.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=180000,max_output=16000)*.

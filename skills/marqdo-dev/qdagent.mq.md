---
markup: occlusion
title: 求道当前文稿框架的开发与验收
import:
  engineering: ext/engineering/index.mq.md
  deployment: ../../deploy/manage.mq.md
  result: lib/result.mq.md
---

开发先读 AGENTS.md、docs/document-driven-agent.mq.md 与 docs/native-workbook-framework.mq.md。根状态机和全部提示在 ext/root-skill 的普通 Marqdo 函数中，Go 只管理认证、资源和事件，React 复用官方 View。Python 只有模型网络传输，不允许增加工具循环、角色提示、JSON 动作路由或兜底结果。此文件是当前开发入口，已替换旧客户端和旧宿主测试说明，不修改相邻 Marqdo 核心源码。

安装登记只维护 ext/plugins.mq.md 的字面表，界面和权限共用官方读取器。业务能力直接写成可读函数，不增加中央别名表。新增系统缺口使用本仓库 ABI 插件；作者与独立测试隔离，失败保留未完成。正文和可执行函数分别可读，参数返回表紧邻标题，函数叙述超过一半。

## check

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | check 的真实结果，失败保留诊断 |

Use 。

检查当前根流程、角色文稿、浏览插件、安装清单与架构约束。语法、参数契约和每函数叙述比例使用官方 CLI 判断，不引入另一份正则解析器。检查成功只说明这些静态规则通过，不代表模型理解正确、网页已经读取或用户已经验收。失败应依据真实位置修复文稿，不能调低检查阈值或生成一份默认业务结果。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/check-document-runtime.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=180000,max_output=20000)*.

## native_tests

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | native_tests 的真实结果，失败保留诊断 |

Use 。

编译器与 SDK 的版本来自当前锁定依赖，测试失败应核对实际接口，不通过修改相邻仓库源码或跳过负例来获得绿色结果。

离线执行真实 Rust 边界测试，包括官方 AST 受限调用、原生围栏中的惰性正文、意图投影与状态版本比较。依赖只读取相邻安装，不修改 Marqdo 核心。通过说明这些边界负例被覆盖，不能代替网页、前端或完整模型任务；更新原生代码后仍须 build 将实际动态库装入镜像。

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

Return *engineering.checked(argv=`argv`,timeout_ms=180000,max_output=20000)*.

## runtime_tests

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | runtime_tests 的真实结果，失败保留诊断 |

Use 。

运行文稿检查、真实 CLI 与 ABI 协议、模型传输替身及 Go race 验收。替身只替代供应商生成，实际解析、角色、进程、独立案例和状态流都由 Marqdo 执行。没有配置浏览验收端点时相应用例会明确跳过，必须另外调用 browser_acceptance 补齐，不能把跳过当成浏览成功。该入口不使用生产账号或生产数据。完整协议回归包含多次真实进程与官方解析，使用十分钟的整体上限，避免尚未执行到工作器与并发检查就被旧的三分钟限制中断；每项网络和子进程仍保留自己的更短期限。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/test-runtime.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=600000,max_output=20000)*.

## browser_acceptance

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | browser_acceptance 的真实结果，失败保留诊断 |

Use 。

浏览器能力要通过实际页面、截图与隔离负例验证。此入口创建专用非 root 容器，检查私网与重定向边界、会话隔离和取消，再执行 Marqdo 研究与写作交接。只读资料站是测试夹具，生产不能启用其回环例外。未访问的引用和更改后的正文必须失败；通过后仍不能宣称科学事实全部正确。

Return *deployment.probe_browser()*.

## frontend_tests

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | frontend_tests 的真实结果，失败保留诊断 |

Use 。

以真实 Go 开发服务和浏览器检查首页、模型、插件、上传、可调布局、原生 View 与可读收据。服务只监听回环地址，使用专门开发身份，不能把开发身份开在公网。完整用例包含本机 Qwen 的真实四阶段与用户确认，需管理员已安装该模型；没有实际模型响应不能伪造通过。浏览器路径可通过 QDAGENT_BROWSER 指定。

`argv` =

| argument |
|---|
| "bash" |
| "deploy/test-frontend.sh" |

Return *engineering.checked(argv=`argv`,timeout_ms=600000,max_output=20000)*.

## build

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | build 的真实结果，失败保留诊断 |

Use 。

构建当前 React、Go、ABI 与隔离浏览器镜像。先完成检查和匹配的资源准备，任何步骤失败就保留原服务。密钥与运行数据不进入镜像，构建本身不替换生产容器，也不授予模型 Docker 权限。已经批准的部署可继续调用 deploy/manage 的 up，正式凭据轮换则需要另外的明确批准和离线验证。

Return *deployment.build()*.

## serve

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | serve 的真实结果，失败保留诊断 |

Use 。

旧 Marqdo Web 服务与旧浏览器客户端已经退出生产路径，不能再用这个入口监听 7964，避免覆盖现有 Go 认证与任务服务。这里明确返回停用诊断，不悄悄启动另一套框架、不删除历史数据。当前镜像通过 deploy/manage 的 build、up、status 管理；本地前端验收使用 frontend_tests。

Return *result.error(code="development.legacy_server",message="旧宿主启动入口已停用，请使用当前构建部署与前端验收入口",operation="serve")*.

## live_agent

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | "builtin-local" | 当前自动界面验收固定使用本机 Qwen |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | live_agent 的真实结果，失败保留诊断 |

Use `selection`="builtin-local"。

自动真实模型验收通过工作台执行意图、框架、独立测试、实现与最终人工操作，不恢复旧的 plan_task 或 JSON 工具分派。此用例只支持明确的本机配置，其他模型不能静默替换为本机；共享或个人模型请在真实工作台选择后审阅自己的任务。验收成功只证明所给固定正文流程，研究与引用能力还需 browser_acceptance。

1. `selection` != "builtin-local"
  Return *result.error(code="development.model_scope",message="自动界面验收仅使用明确的本机配置；其他模型请在工作台选择并核对实际结果",operation="live_agent")*.

`argv` =

| argument |
|---|
| "bash" |
| "deploy/test-frontend.sh" |
| "-g" |
| "real local model follows" |

Return *engineering.checked(argv=`argv`,timeout_ms=600000,max_output=20000)*.
